import asyncio
import json
import logging
from datetime import UTC, datetime

import httpx
from openai import AsyncOpenAI

from signal_app.config import get_settings
from signal_app.db import get_pool
from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)

HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{id}.json"
HN_DISCUSSION_URL = "https://news.ycombinator.com/item?id={id}"

FILTER_SYSTEM_PROMPT = (
    "You are a content relevance filter for a news intelligence tool. "
    "Given news story titles and a set of user categories, identify which "
    "stories are relevant to at least one category. "
    "Respond with valid JSON only."
)

FILTER_USER_TEMPLATE = """Here are the stories:
{stories}

Here are the categories:
{categories}

For each story that is relevant to at least one category, include it in the response.
Respond with JSON in this exact format:
{{"relevant": [{{"index": 0, "categories": ["slug1"]}}]}}

If no stories are relevant, respond with: {{"relevant": []}}"""


class HackerNewsFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        min_score = self.config.get("min_score", 0)

        # 1. Fetch top 30 story IDs
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(HN_TOP_STORIES)
            resp.raise_for_status()
            story_ids = resp.json()[:30]

        # 2. Fetch each story's details in parallel
        stories = await self._fetch_stories(story_ids)

        # Pre-filter by min_score if configured
        if min_score > 0:
            stories = [s for s in stories if (s.get("score") or 0) >= min_score]

        if not stories:
            return []

        # 3. Load categories and filter via LLM
        relevant_indices = await self._filter_with_llm(stories)

        # 4. Build RawItems from relevant stories
        items: list[RawItem] = []
        for idx in relevant_indices:
            if idx < 0 or idx >= len(stories):
                continue
            story = stories[idx]
            hn_url = HN_DISCUSSION_URL.format(id=story["id"])
            external_url = story.get("url") or hn_url
            published = None
            if story.get("time"):
                published = datetime.fromtimestamp(story["time"], tz=UTC)

            items.append(
                RawItem(
                    external_id=str(story["id"]),
                    title=story.get("title", "Untitled"),
                    url=external_url,
                    author=story.get("by"),
                    content_raw=None,
                    published_at=published,
                    extra={
                        "score": story.get("score"),
                        "num_comments": story.get("descendants"),
                        "hn_url": hn_url,
                    },
                )
            )

        return items

    async def _fetch_stories(self, story_ids: list[int]) -> list[dict]:
        """Fetch story details in parallel."""
        async with httpx.AsyncClient(timeout=30) as client:

            async def _get(sid: int) -> dict | None:
                try:
                    r = await client.get(HN_ITEM_URL.format(id=sid))
                    r.raise_for_status()
                    return r.json()
                except Exception:
                    logger.warning("Failed to fetch HN item %s", sid)
                    return None

            results = await asyncio.gather(*[_get(sid) for sid in story_ids])
        return [r for r in results if r is not None]

    async def _filter_with_llm(self, stories: list[dict]) -> list[int]:
        """Use LLM to filter stories by user categories. Returns list of indices."""
        # Load categories from DB
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT name, slug FROM categories ORDER BY sort_order"
            )

        # If no categories configured, return all stories
        if not rows:
            return list(range(len(stories)))

        settings = get_settings()
        if not settings.openai_api_key:
            logger.warning("No OpenAI API key configured, returning all stories")
            return list(range(len(stories)))

        # Build the prompt
        story_lines = "\n".join(
            f"{i}. {s.get('title', 'Untitled')}" for i, s in enumerate(stories)
        )
        cat_lines = "\n".join(f"  - {row['slug']}: {row['name']}" for row in rows)

        user_message = FILTER_USER_TEMPLATE.format(
            stories=story_lines, categories=cat_lines
        )

        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": FILTER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            return [entry["index"] for entry in data.get("relevant", [])]

        except Exception:
            logger.exception("LLM filtering failed, returning all stories")
            return list(range(len(stories)))
