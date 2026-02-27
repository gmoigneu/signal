# Signal — Architecture

## Overview

Signal is a full-stack application with three main components:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│  PostgreSQL  │
│  React/Vite  │◀────│   FastAPI   │◀────│    17-alpine │
│  :3000       │     │  :8000      │     │  :5432       │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  External   │
                    │  APIs       │
                    │ (RSS, HN,   │
                    │  YouTube,   │
                    │  Reddit...) │
                    └─────────────┘
```

## Backend Architecture

### Package Structure

```
signal_app/
├── main.py              # FastAPI app, lifespan, CORS, router mounting
├── config.py            # Pydantic Settings (env-based config)
├── db.py                # asyncpg connection pool management
├── models.py            # Pydantic request/response models
├── fetchers/            # Source-specific data fetchers
│   ├── base.py          # BaseFetcher ABC + RawItem dataclass
│   ├── rss.py           # RSS/Atom feeds (feedparser)
│   ├── hackernews.py    # HN via Algolia API
│   ├── reddit.py        # Reddit JSON API (no OAuth)
│   ├── arxiv.py         # arXiv Atom API
│   ├── github.py        # GitHub Releases API
│   ├── youtube.py       # YouTube Data API v3 (channel + search)
│   ├── bluesky.py       # AT Protocol public API
│   └── twitter.py       # Nitter RSS fallback
├── pipeline/
│   ├── orchestrator.py  # Full pipeline: fetch→dedup→persist→summarize
│   ├── dedup.py         # 3-layer deduplication
│   ├── summarizer.py    # OpenAI GPT-4.1-nano batch summarization
│   └── scheduler.py     # Cron-based asyncio scheduler
├── weekly/
│   └── generator.py     # Weekly review markdown generator (LLM)
├── discovery/
│   └── youtube.py       # Channel suggestion engine
└── routes/
    ├── health.py        # GET /api/health
    ├── items.py         # CRUD for digest items
    ├── sources.py       # CRUD for data sources
    ├── categories.py    # CRUD for categories
    ├── pipeline.py      # Pipeline trigger and status
    ├── reviews.py       # Weekly review generation
    ├── discovery.py     # YouTube channel suggestions
    └── settings.py      # App settings (cron, keywords)
```

### Pipeline Flow

```
1. Create pipeline_run record (status: running)
   │
2. Fetch all enabled sources in parallel (asyncio.gather)
   │  Each source uses its type-specific fetcher
   │  60-second timeout per source
   │
3. Deduplicate (3-layer):
   │  ├─ URL exact match (DB unique index)
   │  ├─ Source + external_id (DB unique index)
   │  └─ Fuzzy title match (SequenceMatcher ≥ 0.85, 48hr window)
   │
4. Persist new items (INSERT ON CONFLICT DO NOTHING)
   │
5. Summarize unsummarized items (batches of 10):
   │  ├─ Send title + content to GPT-4.1-nano
   │  ├─ Get 2-3 sentence summary
   │  ├─ Get 1-3 category assignments
   │  └─ Update items + item_categories
   │
6. YouTube channel discovery (post-process search results)
   │
7. Update pipeline_run record (status: completed)
```

### Database

- **Driver**: asyncpg (raw SQL, no ORM)
- **Pool**: 2-10 connections
- **Schema**: See `docker/postgres/init.sql`
- **Tables**: sources, items, categories, item_categories, pipeline_runs, weekly_reviews, youtube_channel_suggestions, app_settings

### Scheduling

Uses a simple asyncio cron loop (via `croniter`) — no Redis or Celery needed for this single-user tool. Default: `0 6,18 * * *` (6 AM and 6 PM daily).

### LLM Integration

- **Summarization**: GPT-4.1-nano via OpenAI SDK (async)
- **Weekly reviews**: GPT-4.1-nano with structured review prompt
- **Fallback**: Both features degrade gracefully without an API key (no summaries, basic markdown review)
- **Cost**: ~$0.30/month for 100 items/day

## Frontend Architecture

- **Framework**: React 19 + TanStack Start (file-based routing)
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4
- **State**: Local component state (no global store needed)
- **API**: Plain `fetch()` wrapper in `lib/api.ts`

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `index.tsx` | Daily digest (main view) |
| `/sources` | `sources.index.tsx` | Source management |
| `/sources/:id` | `sources.$sourceId.tsx` | Source detail |
| `/review` | `review.index.tsx` | Weekly review generator |
| `/discovery` | `discovery.index.tsx` | YouTube channel discovery |
| `/settings` | `settings.index.tsx` | Pipeline settings |
