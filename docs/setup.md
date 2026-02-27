# Signal — Setup Guide

## Prerequisites

- **Docker** (for PostgreSQL)
- **Python 3.12+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 20+** with [pnpm](https://pnpm.io/)

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

This starts PostgreSQL 17 and runs `docker/postgres/init.sql` which creates the schema and seeds 40+ sources.

### 2. Configure Environment

```bash
cp backend/.env.example .env
```

Edit `.env` and add your API keys:

| Key | Required | Purpose |
|-----|----------|---------|
| `OPENAI_API_KEY` | Recommended | LLM summarization + weekly reviews |
| `GOOGLE_API_KEY` | For YouTube | YouTube channel/search fetching |
| `GITHUB_TOKEN` | Optional | Higher GitHub API rate limits |

Signal works without any API keys — you just won't get summaries or YouTube/GitHub fetching.

### 3. Start the Backend

```bash
cd backend
uv sync              # Install dependencies
uv run uvicorn signal_app.main:app --reload --port 8000
```

The backend starts at `http://localhost:8000`. Check health: `curl http://localhost:8000/api/health`.

### 4. Start the Frontend

```bash
cd frontend
pnpm install         # Install dependencies
pnpm run dev         # Development server
```

The frontend starts at `http://localhost:3000`.

### 5. Run the Pipeline

Either click "RUN NOW" in the Settings page, or:

```bash
curl -X POST http://localhost:8000/api/pipeline/run
```

The pipeline fetches from all enabled sources, deduplicates, and summarizes new items.

## Development

### Running Tests

```bash
cd backend
uv run pytest tests/ -v
```

### Linting

```bash
# Backend
cd backend
uv run ruff check src/
uv run ruff format src/

# Frontend
cd frontend
pnpm run lint
```

### Building Frontend for Production

```bash
cd frontend
pnpm run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://signal:signal@localhost:5432/signal` | PostgreSQL connection |
| `OPENAI_API_KEY` | (empty) | OpenAI API key for summarization |
| `OPENAI_MODEL` | `gpt-4.1-nano` | Model for summarization |
| `GOOGLE_API_KEY` | (empty) | YouTube Data API v3 key |
| `GITHUB_TOKEN` | (empty) | GitHub personal access token |
| `PIPELINE_CRON` | `0 6,18 * * *` | Pipeline schedule (6 AM + 6 PM) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (comma-separated) |
| `HOST` | `0.0.0.0` | Backend bind host |
| `PORT` | `8000` | Backend bind port |
