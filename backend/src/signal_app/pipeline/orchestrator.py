import asyncio
import json
import logging

from signal_app.db import get_pool
from signal_app.fetchers import get_fetcher
from signal_app.fetchers.base import RawItem
from signal_app.pipeline.dedup import deduplicate
from signal_app.pipeline.summarizer import summarize_items

logger = logging.getLogger(__name__)

SUMMARIZE_BATCH_SIZE = 10


async def run_pipeline(trigger: str = "manual") -> str:
    """Execute the full pipeline: fetch → dedup → persist → summarize → categorize.

    Returns the pipeline_run ID.
    """
    pool = get_pool()

    # 1. Create pipeline_run record
    async with pool.acquire() as conn:
        run_id = await conn.fetchval(
            "INSERT INTO pipeline_runs (status, trigger) VALUES ('running', $1) RETURNING id",
            trigger,
        )

    total_fetched = 0
    total_new = 0
    total_summarized = 0
    errors: list[dict[str, str]] = []

    try:
        # 2. Get all enabled sources
        async with pool.acquire() as conn:
            sources = await conn.fetch("SELECT * FROM sources WHERE enabled = true")

        # 3. Fetch from all sources in parallel
        fetch_tasks = []
        for source in sources:
            source_id = str(source["id"])
            source_type = source["source_type"]
            config = source["config"] if isinstance(source["config"], dict) else json.loads(source["config"])

            fetcher = get_fetcher(source_type, source_id, config)
            if fetcher is None:
                logger.warning("No fetcher for source type: %s", source_type)
                continue

            fetch_tasks.append(_fetch_source(fetcher, source))

        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        # 4. Process results
        all_new_items: list[tuple[str, RawItem]] = []

        for source, result in zip(sources, results, strict=False):
            source_id = str(source["id"])
            source_name = source["name"]

            if isinstance(result, Exception):
                error_msg = f"{type(result).__name__}: {result}"
                logger.error("Fetch failed for %s: %s", source_name, error_msg)
                errors.append({"source": source_name, "error": error_msg})
                async with pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE sources
                           SET last_error = $1, error_count = error_count + 1, updated_at = now()
                           WHERE id = $2::uuid""",
                        error_msg,
                        source_id,
                    )
                continue

            raw_items: list[RawItem] = result
            total_fetched += len(raw_items)

            # Deduplicate
            async with pool.acquire() as conn:
                new_items = await deduplicate(raw_items, conn)

            for item in new_items:
                all_new_items.append((source_id, item))

            # Update source health
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE sources
                       SET last_fetched_at = now(), last_error = NULL, error_count = 0, updated_at = now()
                       WHERE id = $1::uuid""",
                    source_id,
                )

        # 5. Persist new items
        async with pool.acquire() as conn:
            for source_id, item in all_new_items:
                try:
                    await conn.execute(
                        """INSERT INTO items (source_id, external_id, title, url, author,
                                              content_raw, thumbnail_url, published_at, extra)
                           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                           ON CONFLICT (url) DO NOTHING""",
                        source_id,
                        item.external_id,
                        item.title,
                        item.url,
                        item.author,
                        item.content_raw,
                        item.thumbnail_url,
                        item.published_at,
                        json.dumps(item.extra or {}),
                    )
                    total_new += 1
                except Exception as e:
                    logger.warning("Failed to insert item '%s': %s", item.title[:50], e)

        # 6. Summarize unsummarized items
        async with pool.acquire() as conn:
            unsummarized = await conn.fetch(
                """SELECT id, title, content_raw
                   FROM items
                   WHERE summarized_at IS NULL
                   ORDER BY created_at DESC
                   LIMIT 100"""
            )

        # Process in batches
        for i in range(0, len(unsummarized), SUMMARIZE_BATCH_SIZE):
            batch = unsummarized[i : i + SUMMARIZE_BATCH_SIZE]
            batch_input = [
                {
                    "index": idx,
                    "title": row["title"],
                    "content": (row["content_raw"] or "")[:1000],
                }
                for idx, row in enumerate(batch)
            ]

            results = await summarize_items(batch_input)

            async with pool.acquire() as conn:
                for result in results:
                    idx = result.get("index", 0)
                    if idx >= len(batch):
                        continue

                    item_id = str(batch[idx]["id"])
                    summary = result.get("summary", "")
                    categories = result.get("categories", [])
                    raw_conf = result.get("confidence", [])
                    # LLM may return a single float instead of a list
                    if isinstance(raw_conf, (int, float)):
                        confidences = [raw_conf]
                    elif isinstance(raw_conf, list):
                        confidences = raw_conf
                    else:
                        confidences = []

                    if summary:
                        await conn.execute(
                            "UPDATE items SET summary = $1, summarized_at = now(),"
                            " updated_at = now() WHERE id = $2::uuid",
                            summary,
                            item_id,
                        )
                        total_summarized += 1

                    # Assign categories
                    for cat_idx, cat_slug in enumerate(categories):
                        cat_row = await conn.fetchrow("SELECT id FROM categories WHERE slug = $1", cat_slug)
                        if cat_row:
                            confidence = confidences[cat_idx] if cat_idx < len(confidences) else None
                            await conn.execute(
                                """INSERT INTO item_categories (item_id, category_id, is_auto, confidence)
                                   VALUES ($1::uuid, $2::uuid, true, $3)
                                   ON CONFLICT (item_id, category_id) DO NOTHING""",
                                item_id,
                                str(cat_row["id"]),
                                confidence,
                            )

        # 7. YouTube channel discovery
        try:
            from signal_app.discovery.youtube import process_youtube_discoveries

            await process_youtube_discoveries()
        except Exception:
            logger.exception("YouTube discovery post-processing failed")

        # 8. Update pipeline run as completed
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE pipeline_runs
                   SET status = 'completed', completed_at = now(),
                       items_fetched = $1, items_new = $2, items_summarized = $3,
                       errors = $4::jsonb
                   WHERE id = $5::uuid""",
                total_fetched,
                total_new,
                total_summarized,
                json.dumps(errors),
                str(run_id),
            )

        logger.info(
            "Pipeline completed: %d fetched, %d new, %d summarized, %d errors",
            total_fetched,
            total_new,
            total_summarized,
            len(errors),
        )

    except Exception as e:
        logger.exception("Pipeline run failed")
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE pipeline_runs
                   SET status = 'failed', completed_at = now(),
                       errors = $1::jsonb
                   WHERE id = $2::uuid""",
                json.dumps([*errors, {"source": "pipeline", "error": str(e)}]),
                str(run_id),
            )
        raise

    return str(run_id)


async def _fetch_source(fetcher, source) -> list[RawItem]:  # type: ignore[no-untyped-def]
    """Fetch items from a single source with timeout."""
    try:
        return await asyncio.wait_for(fetcher.fetch(), timeout=60)
    except TimeoutError as err:
        raise TimeoutError(f"Fetch timed out for source: {source['name']}") from err
