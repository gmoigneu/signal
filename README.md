# Signal

AI news intelligence and daily digest tool. Automatically collects, summarizes, and presents content from 40+ sources across blogs, YouTube, Bluesky, Hacker News, Reddit, arXiv, and GitHub.

Built for staying on top of AI and agentic coding news without drowning in tabs.

## What It Does

- **Fetches** from RSS, Hacker News, Reddit, arXiv, GitHub Releases, YouTube, Bluesky, and Twitter (Nitter)
- **Deduplicates** across sources using URL matching, source+ID matching, and fuzzy title similarity
- **Summarizes** each item with GPT-4.1-nano (2-3 sentences + auto-categorization)
- **Presents** a calendar-navigable daily digest with filtering by category, source, and read/starred state
- **Curates** with star + annotate workflow for items worth highlighting
- **Generates** weekly markdown reviews from starred items for team briefings
- **Discovers** new YouTube channels based on keyword search patterns

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Configure
cp backend/.env.example .env
# Edit .env — add your OPENAI_API_KEY (recommended), GOOGLE_API_KEY (for YouTube)

# 3. Start backend
cd backend
uv sync
uv run uvicorn signal_app.main:app --reload --port 8000

# 4. Start frontend (in another terminal)
cd frontend
pnpm install
pnpm run dev
```

Open `http://localhost:3000`. Click **RUN NOW** in Settings to fetch your first batch.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, asyncpg |
| Database | PostgreSQL 17 |
| Frontend | React 19, TanStack Start, Vite 7, Tailwind CSS 4 |
| LLM | OpenAI GPT-4.1-nano |
| Infra | Docker Compose |

## Project Structure

```
signal/
├── backend/
│   └── src/signal_app/
│       ├── main.py               # FastAPI app
│       ├── fetchers/             # 9 source-type fetchers
│       ├── pipeline/             # Orchestrator, dedup, summarizer, scheduler
│       ├── weekly/               # Review markdown generator
│       ├── discovery/            # YouTube channel suggestions
│       └── routes/               # API endpoints
├── frontend/
│   └── src/
│       ├── routes/               # Page components (digest, sources, review, discovery, settings)
│       ├── components/           # Shared UI components
│       └── lib/                  # API client, types, utils
├── docker/
│   └── postgres/init.sql         # Schema + 40+ seeded sources
├── docs/                         # Architecture, API, setup, pipeline, sources docs
└── docker-compose.yml
```

## Source Types

| Type | Method | Auth Required |
|------|--------|---------------|
| RSS/Atom | feedparser + httpx | No |
| Hacker News | Algolia API | No |
| Reddit | JSON API | No |
| arXiv | Atom API | No |
| GitHub Releases | REST API v3 | Optional (token for rate limits) |
| YouTube | Data API v3 | Yes (`GOOGLE_API_KEY`) |
| Bluesky | AT Protocol | No |
| Twitter/X | Nitter RSS fallback | No (fragile) |
| Manual | API / Quick Add UI | N/A |

## Pipeline

Runs on a configurable cron schedule (default: 6 AM and 6 PM daily). Can be triggered manually.

```
Fetch (parallel) → Deduplicate (3-layer) → Persist → Summarize (LLM) → Categorize → Discover
```

Cost: ~$0.30/month for LLM summarization at 100 items/day.

## API

Full REST API at `http://localhost:8000/api`. Key endpoints:

- `GET /api/items` — list with filtering and pagination
- `PATCH /api/items/{id}` — star, read, annotate, categorize
- `POST /api/items/manual` — quick-add for LinkedIn, etc.
- `POST /api/pipeline/run` — trigger pipeline
- `POST /api/reviews/generate` — generate weekly review
- `GET /api/discovery/channels` — YouTube channel suggestions

See [docs/api.md](docs/api.md) for the full reference.

## Documentation

- [Setup Guide](docs/setup.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Pipeline](docs/pipeline.md)
- [Source Types](docs/sources.md)

## Development

```bash
# Backend tests
cd backend && uv run pytest tests/ -v

# Backend lint
cd backend && uv run ruff check src/

# Frontend build
cd frontend && pnpm run build
```

## License

[Apache License 2.0](LICENSE)
