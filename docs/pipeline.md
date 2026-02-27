# Signal — Pipeline

## Overview

The pipeline is the core data processing engine. It runs on a cron schedule (default: 6 AM and 6 PM) and can also be triggered manually via the API or UI.

## Execution Flow

1. **Create run record** — inserts into `pipeline_runs` with status `running`
2. **Fetch sources** — fetches all enabled sources in parallel using `asyncio.gather`. Each source has a 60-second timeout.
3. **Deduplicate** — 3-layer dedup filters out items already in the database
4. **Persist** — inserts new items with `ON CONFLICT (url) DO NOTHING`
5. **Summarize** — sends unsummarized items to GPT-4.1-nano in batches of 10
6. **Categorize** — LLM assigns 1-3 categories per item
7. **YouTube discovery** — post-processes YouTube search results to identify new channels
8. **Complete** — updates run record with stats

## Deduplication

Three layers prevent duplicate content:

### Layer 1: URL Exact Match
Database unique index on `items.url`. The `ON CONFLICT DO NOTHING` clause handles this at insert time.

### Layer 2: Source + External ID
Database unique index on `(source_id, external_id)`. Prevents re-inserting the same item from the same source even if the URL changes slightly.

### Layer 3: Fuzzy Title Match
Uses `difflib.SequenceMatcher` with a 0.85 threshold against items from the past 48 hours. Catches the same story reported by different sources with slightly different titles.

## LLM Summarization

- **Model**: GPT-4.1-nano (cheapest option, ~$0.30/month)
- **Batch size**: 10 items per API call
- **Output**: JSON with summary (2-3 sentences) and category assignments (1-3 slugs)
- **Temperature**: 0.3 (focused, deterministic)
- **Graceful degradation**: Works without an API key (items just won't have summaries)

## Scheduling

Uses a simple `croniter`-based asyncio loop:

```python
while running:
    next_run = croniter(cron_expression, now).get_next(datetime)
    await asyncio.sleep((next_run - now).total_seconds())
    await run_pipeline(trigger="scheduled")
```

No external dependencies (no Redis, no Celery). Appropriate for a single-user tool.

## Triggering

- **Scheduled**: Runs automatically based on `PIPELINE_CRON` setting
- **Manual**: `POST /api/pipeline/run` or "RUN NOW" button in Settings
- **Concurrency**: Only one pipeline can run at a time

## Monitoring

- **Status**: `GET /api/pipeline/status` returns running state and last run info
- **History**: `GET /api/pipeline/runs` returns last 20 runs with stats
- **UI**: Settings page shows pipeline history with status, item counts, and error counts
- **Sidebar**: Shows last run time and running indicator

## Error Handling

- Individual source failures don't stop the pipeline
- Failed sources increment `error_count` and record `last_error`
- The pipeline run records total errors as a JSON array
- Sources with 3+ errors show as "error" health in the UI
