# Signal

A personal news intelligence tool that turns any topic into a curated daily digest. Point it at RSS feeds, YouTube channels, Hacker News, Reddit, arXiv, GitHub, Bluesky — and it fetches, deduplicates, summarizes, and categorizes everything into one feed.

Track AI research, web development, game design, finance, or anything else. You bring the sources, Signal does the rest.

![Daily Digest — calendar-navigable feed with items from RSS, arXiv, YouTube, and more](docs/screenshots/digest.webp)

## What It Does

- **Fetches** from RSS/Atom, Hacker News, Reddit, arXiv, GitHub Releases, YouTube, Bluesky, and Twitter (Nitter)
- **Deduplicates** across sources using URL matching, source+ID matching, and fuzzy title similarity
- **Summarizes** each item with an LLM (2-3 sentences + auto-categorization into your custom categories)
- **Presents** a calendar-navigable daily digest with filtering by category, source, and read/starred state
- **Curates** with star + annotate workflow for items worth highlighting
- **Generates** weekly markdown reviews from starred items
- **Discovers** new YouTube channels based on your keyword searches

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

Open `http://localhost:3000`. Add your sources via the **Sources** page, then click **RUN NOW** in Settings to fetch your first batch.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, asyncpg |
| Database | PostgreSQL 17 |
| Frontend | React 19, TanStack Start, Vite 7, Tailwind CSS 4 |
| LLM | OpenAI GPT-4.1-nano |
| Infra | Docker, GitHub Actions (GHCR), Portainer |

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
│   ├── backend/Dockerfile        # Multi-stage Python build
│   ├── frontend/Dockerfile       # Multi-stage Node build
│   └── postgres/init.sql         # Schema (no seeded sources — add your own)
├── .github/workflows/docker.yml  # CI/CD: build + push to GHCR
├── docker-compose.yml            # Local dev (Postgres only)
├── docker-stack.yml              # Production (Portainer)
└── docs/                         # Architecture, API, setup, pipeline, sources docs
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

Cost: ~$0.30/month for LLM summarization at 100 items/day with GPT-4.1-nano.

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

## Production Deployment (Portainer)

Signal ships with a `docker-stack.yml` ready for Portainer. Images are built automatically via GitHub Actions and pushed to GHCR on every push to `main`.

### 1. Prerequisites

- A server with Docker and Portainer installed
- A reverse proxy (Caddy, Nginx, Traefik) pointing your domain to the frontend and backend ports
- A GitHub account with access to the GHCR packages (repo must be public, or configure Portainer with a GHCR registry credential)

### 2. Initialize the database

On first deploy, the database is empty. Run the init script against the postgres container:

```bash
docker exec -i <postgres-container> psql -U signal -d signal < docker/postgres/init.sql
```

Or pipe it remotely:

```bash
cat docker/postgres/init.sql | ssh your-server "docker exec -i <postgres-container> psql -U signal -d signal"
```

### 3. Deploy the stack

In Portainer, go to **Stacks > Add stack** and either:

- **Upload** the `docker-stack.yml` file, or
- **Paste** its contents into the web editor

Then add the following **environment variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Database password |
| `OPENAI_API_KEY` | Yes | For LLM summarization |
| `GOOGLE_API_KEY` | No | YouTube Data API v3 key (no quotes!) |
| `GITHUB_TOKEN` | No | Higher GitHub API rate limits |
| `VITE_API_URL` | No | Frontend SSR API URL (defaults to `https://signal.nls.io`) |
| `ALLOWED_ORIGINS` | No | CORS origins (defaults to `https://signal.nls.io`) |
| `PIPELINE_CRON` | No | Cron schedule (defaults to `0 6,18 * * *`) |
| `OPENAI_MODEL` | No | LLM model (defaults to `gpt-4.1-nano`) |

> **Important**: Do not wrap env values in quotes. Docker passes them as literal characters, so `"your-key"` becomes `%22your-key%22` in API calls.

### 4. Reverse proxy

The stack exposes two ports on the host:

| Port | Service |
|------|---------|
| `26001` | Frontend (SSR) |
| `26002` | Backend API |

Point your reverse proxy to these. Example Caddyfile:

```
signal.example.com {
    handle /api/* {
        reverse_proxy localhost:26002
    }
    handle {
        reverse_proxy localhost:26001
    }
}
```

### 5. Update

Push to `main` to trigger a new image build. In Portainer, click **Recreate** on the stack with **Pull latest images** enabled.

## Development

```bash
# Backend tests
cd backend && uv run pytest tests/ -v

# Backend lint
cd backend && uv run ruff check src/

# Frontend build
cd frontend && pnpm run build
```

## Screenshots

**Sources** — manage tracked sources across RSS, YouTube, Twitter, arXiv, Reddit, GitHub, and more. Each shows health status, last fetch time, and item count.

![Sources page](docs/screenshots/sources.webp)

**Settings** — configure pipeline schedule, YouTube search keywords, categories, and view pipeline run history.

![Settings page](docs/screenshots/settings.webp)

**Weekly Review** — generate markdown reviews from starred items for team briefings.

![Review page](docs/screenshots/review.webp)

## License

[Apache License 2.0](LICENSE)
