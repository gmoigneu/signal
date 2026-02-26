# Signal — Product Requirements Document

> **AI News Intelligence & Daily Digest Tool**
> Version 1.0 — February 2026
> Author: Kaida (for G/)

---

## 1. Executive Summary

Signal is a personal AI news intelligence tool that automatically collects, summarizes, and presents daily digests from 40+ sources across blogs, YouTube, Bluesky, Hacker News, Reddit, arXiv, and GitHub. It provides a calendar-navigable digest UI with curation tools (star, tag, annotate) that feed into a weekly markdown review generator for G/'s Upsun team briefings.

**Problem**: G/ needs to stay on top of AI/agentic coding news for his Field CTO role and thought leadership, but is drowning in sources. Manual consumption doesn't scale.

**Solution**: An automated pipeline that fetches, deduplicates, summarizes (via LLM), and categorizes news items daily, served through a desktop-first web interface with curation and review generation workflows.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | Python FastAPI | G/'s choice, fast to build, async-native, great LLM ecosystem |
| **Database** | PostgreSQL 17 | Persistent storage, good JSON support, proven |
| **Frontend** | React 19 + TanStack Start + Vite | G/'s preferred stack (from septic-project) |
| **UI Components** | ShadCN / Radix UI + CVA + Tailwind CSS 4 | G/'s established pattern |
| **LLM** | OpenAI GPT-4.1-nano | Cheapest option (~$0.30/month for 100 items/day) |
| **Package Managers** | uv (backend), pnpm (frontend) | Fast, modern |
| **Linting** | Biome `biome check --write` (frontend), Ruff + mypy strict (backend) | Non-negotiable, from day 1 |
| **Testing** | pytest + pytest-asyncio + coverage (backend), Playwright (frontend) | Non-negotiable, from day 1 |
| **Infra** | Docker Compose | Single `docker compose up` for everything |

---

## 3. Project Structure

```
signal/
├── CLAUDE.md
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── pyproject.toml
│   ├── .env.example
│   ├── src/
│   │   └── signal/
│   │       ├── __init__.py
│   │       ├── main.py              # FastAPI app, lifespan, CORS, routes
│   │       ├── config.py            # pydantic-settings
│   │       ├── db.py                # asyncpg pool + schema + CRUD
│   │       ├── models.py            # Pydantic request/response models
│   │       ├── pipeline/
│   │       │   ├── __init__.py
│   │       │   ├── scheduler.py     # APScheduler cron
│   │       │   ├── orchestrator.py  # Pipeline run coordinator
│   │       │   ├── dedup.py         # Deduplication logic
│   │       │   └── summarizer.py    # OpenAI GPT-4.1-nano
│   │       ├── fetchers/
│   │       │   ├── __init__.py
│   │       │   ├── base.py          # Abstract BaseFetcher + RawItem
│   │       │   ├── rss.py           # RSS/Atom feeds
│   │       │   ├── hackernews.py    # HN API
│   │       │   ├── reddit.py        # Reddit JSON API
│   │       │   ├── arxiv.py         # arXiv Atom API
│   │       │   ├── github.py        # GitHub Releases API
│   │       │   ├── youtube.py       # YouTube Data API v3 (channel + search)
│   │       │   ├── bluesky.py       # AT Protocol
│   │       │   └── twitter.py       # Nitter RSS fallback
│   │       ├── weekly/
│   │       │   └── generator.py     # Weekly review markdown generator
│   │       └── discovery/
│   │           └── youtube.py       # Channel suggestion engine
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── biome.json
│   ├── src/
│   │   ├── styles.css
│   │   ├── router.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed ApiClient
│   │   │   ├── types.ts            # TypeScript interfaces
│   │   │   └── utils.ts            # cn() helper
│   │   ├── components/
│   │   │   ├── ui/                  # ShadCN/Radix primitives
│   │   │   ├── digest/              # Digest view components
│   │   │   ├── sources/             # Source management
│   │   │   ├── review/              # Weekly review
│   │   │   └── layout/              # Shell, sidebar, topbar
│   │   └── routes/
│   │       ├── __root.tsx
│   │       ├── index.tsx
│   │       ├── digest.$date.tsx
│   │       ├── sources.index.tsx
│   │       ├── sources.$sourceId.tsx
│   │       ├── review.index.tsx
│   │       ├── review.$weekId.tsx
│   │       ├── discovery.index.tsx
│   │       └── settings.index.tsx
│   └── tests/e2e/
└── docker/
    └── postgres/
        └── init.sql
```

---

## 4. Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SOURCES
CREATE TABLE sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    source_type     TEXT NOT NULL,  -- 'rss','hackernews','reddit','arxiv','github_releases',
                                   -- 'youtube_channel','youtube_search','bluesky','twitter','manual'
    config          JSONB NOT NULL DEFAULT '{}',
        -- rss: { "feed_url": "..." }
        -- youtube_channel: { "channel_id": "...", "playlist_id": "..." }
        -- youtube_search: { "keywords": [...], "max_results": 10 }
        -- reddit: { "subreddit": "aifails", "sort": "hot", "limit": 25 }
        -- hackernews: { "min_score": 50, "keywords": [...] }
        -- github_releases: { "owner": "anthropics", "repo": "claude-code" }
        -- arxiv: { "categories": ["cs.AI","cs.CL"], "max_results": 20 }
        -- bluesky: { "handle": "user.bsky.social" }
        -- twitter: { "username": "svpino", "method": "nitter" }
    enabled         BOOLEAN NOT NULL DEFAULT true,
    fetch_interval  INTERVAL NOT NULL DEFAULT '12 hours',
    last_fetched_at TIMESTAMPTZ,
    last_error      TEXT,
    error_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_type ON sources (source_type);
CREATE INDEX idx_sources_enabled ON sources (enabled) WHERE enabled = true;

-- CATEGORIES
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    color           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categories (name, slug, color, sort_order) VALUES
    ('Models & Research',  'models-research',  '#8B5CF6', 1),
    ('Coding Agents',      'coding-agents',    '#3B82F6', 2),
    ('Web Dev',            'web-dev',          '#10B981', 3),
    ('Industry',           'industry',         '#F59E0B', 4),
    ('Tools',              'tools',            '#EF4444', 5),
    ('Open Source',        'open-source',      '#6366F1', 6),
    ('Tutorials',          'tutorials',        '#EC4899', 7),
    ('Opinion',            'opinion',          '#14B8A6', 8)
ON CONFLICT (slug) DO NOTHING;

-- ITEMS
CREATE TABLE items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    external_id     TEXT,
    title           TEXT NOT NULL,
    url             TEXT NOT NULL,
    author          TEXT,
    content_raw     TEXT,
    summary         TEXT,
    thumbnail_url   TEXT,
    published_at    TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    summarized_at   TIMESTAMPTZ,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    is_starred      BOOLEAN NOT NULL DEFAULT false,
    star_note       TEXT,
    extra           JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_items_url ON items (url);
CREATE UNIQUE INDEX idx_items_source_external ON items (source_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_items_published ON items (published_at DESC);
CREATE INDEX idx_items_fetched ON items (fetched_at DESC);
CREATE INDEX idx_items_starred ON items (is_starred, published_at DESC) WHERE is_starred = true;
CREATE INDEX idx_items_unsummarized ON items (summarized_at) WHERE summarized_at IS NULL;
CREATE INDEX idx_items_source ON items (source_id, published_at DESC);

-- ITEM ↔ CATEGORY (many-to-many)
CREATE TABLE item_categories (
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_auto         BOOLEAN NOT NULL DEFAULT true,
    confidence      REAL,
    PRIMARY KEY (item_id, category_id)
);

CREATE INDEX idx_item_categories_category ON item_categories (category_id);

-- PIPELINE RUNS (audit trail)
CREATE TABLE pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running',  -- 'running','completed','failed'
    items_fetched   INTEGER NOT NULL DEFAULT 0,
    items_new       INTEGER NOT NULL DEFAULT 0,
    items_summarized INTEGER NOT NULL DEFAULT 0,
    errors          JSONB DEFAULT '[]',
    trigger         TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled','manual'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WEEKLY REVIEWS
CREATE TABLE weekly_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    title           TEXT,
    markdown        TEXT NOT NULL,
    item_count      INTEGER NOT NULL DEFAULT 0,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_weekly_reviews_week ON weekly_reviews (week_start);

-- YOUTUBE CHANNEL SUGGESTIONS
CREATE TABLE youtube_channel_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id      TEXT NOT NULL,
    channel_name    TEXT NOT NULL,
    channel_url     TEXT NOT NULL,
    subscriber_count INTEGER,
    video_count     INTEGER,
    appearance_count INTEGER NOT NULL DEFAULT 1,
    sample_videos   JSONB DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending','accepted','dismissed'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_yt_suggestions_channel ON youtube_channel_suggestions (channel_id);
CREATE INDEX idx_yt_suggestions_status ON youtube_channel_suggestions (status);
```

---

## 5. API Specification

Base URL: `/api`

### 5.1 Items (Daily Digest)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/items` | List items with filtering/pagination |
| `GET` | `/api/items/{id}` | Get single item |
| `PATCH` | `/api/items/{id}` | Update item (read, starred, note, categories) |
| `GET` | `/api/items/stats` | Aggregate stats for today |
| `POST` | `/api/items/manual` | Add item manually (for LinkedIn, etc.) |

**GET `/api/items` query parameters:**
- `date` (YYYY-MM-DD) — filter by published_at date. Default: today
- `source_id` (UUID) — filter by source
- `category` (slug) — filter by category
- `is_starred` (boolean) — starred only
- `is_read` (boolean) — read/unread
- `search` (string) — full-text search in title + summary
- `page` (int, default 1)
- `items_per_page` (int, default 50)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "source_id": "uuid",
      "source_name": "OpenAI Blog",
      "source_type": "rss",
      "title": "Introducing GPT-5",
      "url": "https://openai.com/blog/gpt-5",
      "author": "OpenAI",
      "summary": "LLM-generated 2-3 sentence summary...",
      "thumbnail_url": null,
      "published_at": "2026-02-26T10:00:00Z",
      "fetched_at": "2026-02-26T12:00:00Z",
      "is_read": false,
      "is_starred": false,
      "star_note": null,
      "categories": [{"id": "uuid", "name": "Models & Research", "slug": "models-research", "color": "#8B5CF6"}],
      "extra": {}
    }
  ],
  "total_items": 142,
  "page": 1,
  "items_per_page": 50,
  "total_pages": 3
}
```

**PATCH `/api/items/{id}`:**
```json
{
  "is_read": true,
  "is_starred": true,
  "star_note": "Great overview of Claude Code updates",
  "category_ids": ["uuid-1", "uuid-2"]
}
```

**POST `/api/items/manual`:**
```json
{
  "title": "LinkedIn post by Sarah Drasner",
  "url": "https://linkedin.com/posts/...",
  "content_raw": "Pasted text content...",
  "source_name": "LinkedIn - Sarah Drasner"
}
```

### 5.2 Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sources` | List all sources with health |
| `POST` | `/api/sources` | Create source |
| `GET` | `/api/sources/{id}` | Source detail |
| `PATCH` | `/api/sources/{id}` | Update source |
| `DELETE` | `/api/sources/{id}` | Delete source (cascades) |
| `POST` | `/api/sources/{id}/test` | Test-fetch (dry run, no persist) |

**Source health logic:**
- `healthy`: `error_count == 0` and fetched within `2 × fetch_interval`
- `warning`: `error_count` 1-2
- `error`: `error_count` 3+
- `stale`: no fetch in > 48 hours

### 5.3 Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/categories` | List all |
| `POST` | `/api/categories` | Create custom category |
| `PATCH` | `/api/categories/{id}` | Update |
| `DELETE` | `/api/categories/{id}` | Delete (removes from items, not items themselves) |

### 5.4 Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pipeline/run` | Trigger manual run |
| `GET` | `/api/pipeline/status` | Current status (running/idle, last/next run) |
| `GET` | `/api/pipeline/runs` | List recent runs |
| `GET` | `/api/pipeline/runs/{id}` | Run detail with per-source errors |

### 5.5 Weekly Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reviews/generate` | Generate from starred items in date range |
| `GET` | `/api/reviews` | List past reviews |
| `GET` | `/api/reviews/{id}` | Get specific review |
| `PATCH` | `/api/reviews/{id}` | Edit review markdown |
| `GET` | `/api/reviews/{id}/download` | Download as .md |

**POST `/api/reviews/generate`:**
```json
{
  "week_start": "2026-02-17",
  "week_end": "2026-02-23",
  "title": "AI Intelligence Review: Feb 17-23, 2026"
}
```

### 5.6 YouTube Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/discovery/channels` | List suggested channels |
| `POST` | `/api/discovery/channels/{id}/accept` | Promote to tracked source |
| `POST` | `/api/discovery/channels/{id}/dismiss` | Dismiss suggestion |
| `POST` | `/api/discovery/refresh` | Trigger keyword search scan |

### 5.7 Settings & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/settings` | Pipeline settings |
| `PATCH` | `/api/settings` | Update settings |

---

## 6. Pipeline Architecture

### 6.1 Flow

```
┌──────────────────────────────────────────────────────────┐
│                     PIPELINE RUN                          │
│                                                          │
│  1. Create pipeline_run record (status: running)         │
│                                                          │
│  2. For each enabled source (parallel asyncio.gather):   │
│     ┌────────────────────────────────────────┐           │
│     │  Fetcher (source-type specific)        │           │
│     │  ├─ Fetch raw items from external API  │           │
│     │  ├─ Normalize to RawItem dataclass     │           │
│     │  └─ Return list[RawItem]               │           │
│     └────────────────────────────────────────┘           │
│                                                          │
│  3. Deduplicate (3-layer):                               │
│     ├─ URL exact match (unique index)                    │
│     ├─ Source + external_id (unique index)               │
│     └─ Fuzzy title match (SequenceMatcher, 0.85)         │
│                                                          │
│  4. Persist new items (INSERT ON CONFLICT DO NOTHING)    │
│                                                          │
│  5. Summarize unsummarized items (batch of 10):          │
│     ├─ Send title + content to GPT-4.1-nano              │
│     ├─ Get 2-3 sentence summary                          │
│     ├─ Get 1-3 category assignments                      │
│     └─ Update items + item_categories                    │
│                                                          │
│  6. Update source health (last_fetched_at, errors)       │
│                                                          │
│  7. YouTube channel discovery (post-process search)      │
│                                                          │
│  8. Update pipeline_run (status: completed)              │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Scheduling

- Default: `0 6,18 * * *` (6 AM and 6 PM daily, configurable)
- Uses APScheduler 4 with asyncio, in-process (no Redis/Celery needed)
- Manual trigger available via API

### 6.3 Deduplication Strategy

1. **URL unique index**: `ON CONFLICT (url) DO NOTHING` — catches identical URLs across sources
2. **Source + external_id**: prevents re-inserting same item from same source
3. **Fuzzy title**: `difflib.SequenceMatcher` with 0.85 threshold within 48-hour window — catches same story from different blogs

### 6.4 LLM Summarization

- **Model**: GPT-4.1-nano
- **Batching**: 10 items per API call
- **System prompt**: Summarize in 2-3 sentences focused on why it matters for AI practitioners. Assign 1-3 categories from predefined list.
- **Response format**: JSON (`{"summaries": [{"index": 0, "summary": "...", "categories": ["slug1"], "confidence": [0.95]}]}`)
- **Temperature**: 0.3
- **Cost**: ~$0.01/day for 100 items, ~$0.30/month

### 6.5 Weekly Review Generation

- Collects all starred items for specified week
- Groups by category
- Sends to GPT-4.1-nano with a review system prompt
- Generates structured markdown: Executive Summary → Key Developments (by category) → Trends to Watch → Action Items
- Stored in `weekly_reviews` table
- User can preview, edit, copy, or download

---

## 7. Source Integration Details

### 7.1 RSS/Blog Feeds (~30 sources) — FULLY SUPPORTED
- **Library**: `feedparser` + `httpx`
- **How**: Fetch feed URL, parse entries, normalize to RawItem
- **Rate limits**: None (polite interval built into scheduler)

### 7.2 GitHub Releases — FULLY SUPPORTED
- **Library**: `httpx` (GitHub REST API v3)
- **How**: `GET /repos/{owner}/{repo}/releases` → normalize releases
- **Rate limits**: 5000/hour with token, 60/hour without

### 7.3 Hacker News — FULLY SUPPORTED
- **Library**: `httpx` (Algolia HN Search API preferred over Firebase for efficiency)
- **How**: `GET hn.algolia.com/api/v1/search?query=AI&tags=story&numericFilters=points>50`
- **Filtering**: By keywords (AI, LLM, Claude, GPT, agentic, etc.) and minimum score
- **Rate limits**: Generous, no auth needed

### 7.4 Reddit — FULLY SUPPORTED
- **Library**: `httpx` (Reddit JSON API, no OAuth)
- **How**: `GET reddit.com/r/{subreddit}/hot.json?limit=25`
- **Rate limits**: Generous for unauthenticated, needs User-Agent header

### 7.5 arXiv — FULLY SUPPORTED
- **Library**: `httpx` + `feedparser` (arXiv Atom API)
- **How**: Query by categories (cs.AI, cs.CL), sorted by submission date
- **Rate limits**: Polite use expected, no hard limit

### 7.6 YouTube — FULLY SUPPORTED
- **Library**: `httpx` (YouTube Data API v3)
- **Two fetcher types**:
  - `YouTubeChannelFetcher`: Gets latest videos from specific channels via uploads playlist
  - `YouTubeSearchFetcher`: Searches keywords, feeds discovery engine
- **API quota**: 10,000 units/day free. Search = 100 units/call. Budget: ~2,000 units/day for 10 keywords × 2 runs. Well within limits.
- **Discovery**: Post-processes search results to identify recurring channels not yet tracked

### 7.7 Bluesky — FULLY SUPPORTED
- **Library**: `atproto` (official AT Protocol SDK)
- **How**: Public API, no auth needed for reading public feeds
- **Rate limits**: Generous for public reads

### 7.8 Twitter/X — DEGRADED (Nitter fallback)
- **Problem**: Twitter API v2 costs $100/month minimum for read access
- **Approach**: Try Nitter RSS instances first (`{nitter-instance}/{username}/rss`). Fragile — instances keep shutting down.
- **Fallback**: Source shows as "error" health. User can upgrade to paid API or dismiss.
- **Alternative**: Many AI accounts cross-post to Bluesky. Prioritize Bluesky for same accounts.

### 7.9 LinkedIn — MANUAL ONLY
- **Problem**: No public API for reading posts. No viable automated approach.
- **Approach**: "Quick Add" manual form in the UI. User pastes title + URL + content.
- **Future**: Browser extension that sends selected LinkedIn posts to Signal API.

---

## 8. Initial Source List (Seed Data)

### AI Research & Models (RSS)
| Name | Feed URL |
|------|----------|
| OpenAI Blog | `https://openai.com/blog/rss.xml` |
| Anthropic Blog | `https://www.anthropic.com/rss.xml` |
| Google DeepMind | `https://blog.google/technology/ai/rss/` |
| Meta AI Blog | `https://ai.meta.com/blog/rss/` |
| Mistral Blog | `https://mistral.ai/feed.xml` |
| Hugging Face Blog | `https://huggingface.co/blog/feed.xml` |

### arXiv
| Name | Config |
|------|--------|
| arXiv CS.AI + CS.CL | `{"categories": ["cs.AI", "cs.CL"], "max_results": 20}` |

### Coding Agents & Dev Tools (RSS)
| Name | Feed URL |
|------|----------|
| Simon Willison | `https://simonwillison.net/atom/everything/` |
| Addy Osmani | `https://addyosmani.com/feed.xml` |
| Angie Jones | `https://angiejones.tech/blog/feed/` |
| Pragmatic Engineer (Gergely Orosz) | `https://newsletter.pragmaticengineer.com/feed` |
| Martin Fowler | `https://martinfowler.com/feed.atom` |
| Armin Ronacher | `https://lucumr.pocoo.org/feed.atom` |
| Eleanor Berger | `https://intellectronica.substack.com/feed` |
| Lalit Maganti | `https://lalitm.com/index.xml` |
| Cursor Blog | `https://www.cursor.com/blog/rss.xml` |
| GitHub Blog | `https://github.blog/feed/` |
| Codeium/Windsurf Blog | `https://codeium.com/blog/rss.xml` |
| Sourcegraph Blog | `https://sourcegraph.com/blog/rss.xml` |
| Continue.dev Blog | `https://blog.continue.dev/rss/` |
| Aider Blog | `https://aider.chat/blog/rss.xml` |

### GitHub Releases
| Name | Config |
|------|--------|
| Claude Code | `{"owner": "anthropics", "repo": "claude-code"}` |

### Web Development (RSS)
| Name | Feed URL |
|------|----------|
| Vercel Blog | `https://vercel.com/blog/rss.xml` |
| Cloudflare Blog | `https://blog.cloudflare.com/rss/` |
| Deno Blog | `https://deno.com/blog/rss.xml` |
| Astro Blog | `https://astro.build/rss.xml` |
| Chrome Developers | `https://developer.chrome.com/blog/feed.xml` |

### Aggregators & Newsletters (RSS)
| Name | Feed URL |
|------|----------|
| The Rundown AI | `https://www.therundown.ai/feed` |
| TLDR AI | `https://tldr.tech/ai/rss` |
| Ben's Bites | `https://bensbites.com/feed` |
| The Gradient | `https://thegradient.pub/rss/` |
| Latent Space | `https://www.latent.space/feed` |
| AI News (Smol AI) | `https://buttondown.email/ainews/rss` |

### Hacker News
| Name | Config |
|------|--------|
| Hacker News (AI filtered) | `{"min_score": 50, "keywords": ["AI", "LLM", "Claude", "GPT", "agentic", "Cursor", "Copilot", "coding agent", "Anthropic", "OpenAI"]}` |

### Reddit
| Name | Config |
|------|--------|
| r/aifails | `{"subreddit": "aifails", "sort": "hot", "limit": 25}` |

### YouTube Channels
| Name | Channel |
|------|---------|
| Nate B Jones | `@NateBJones` |
| Fireship | `@fireship` |
| AI Engineer | `@aiDotEngineer` |

### YouTube Search Keywords
```json
["agentic coding", "AI coding agent", "Claude Code", "Cursor AI", "AI developer tools",
 "LLM coding", "AI pair programming", "coding with AI 2026", "AI software engineering",
 "vibe coding"]
```

### Bluesky
(Accounts TBD — to be configured via UI)

### Twitter/X (Nitter fallback)
| Handle | Username |
|--------|----------|
| @kaboroevich | `kaboroevich` |
| @svpino | `svpino` |
| @swaborhm | `swaborhm` |
| @alexalbert__ | `alexalbert__` |
| @OfficialLoganK | `OfficialLoganK` |
| @laboroai | `laboroai` |

### LinkedIn (Manual)
| Name | URL |
|------|-----|
| Alexandre Soyer | linkedin.com/in/alexandre-soyer/ |
| Nnenna | linkedin.com/in/nnennandukwe-aiandemergingtechnologyexpert/ |
| Ado (Anthropic) | linkedin.com/in/adocomplete/ |
| Martin Woodward | linkedin.com/in/martinwoodward/ |
| Romin | linkedin.com/in/iromin/ |
| Sarah Drasner | linkedin.com/in/sarahdrasner/ |

---

## 9. UX Design Brief (for pencil.dev)

### 9.1 Design Direction

**Mood**: Intelligence dashboard. Think Bloomberg Terminal meets Notion. Information-dense but scannable. Dark theme — this is a tool for daily consumption, easy on the eyes.

**Color Palette**:
- **Background**: Dark slate `#0F172A`
- **Surface/Cards**: `#1E293B`
- **Surface hover**: `#334155`
- **Text primary**: `#F8FAFC`
- **Text secondary**: `#94A3B8`
- **Accent (Signal amber)**: `#F59E0B` — used sparingly for stars, active states, branding
- **Success**: `#22C55E`
- **Warning**: `#EAB308`
- **Error**: `#EF4444`
- **Category colors**: Each category has its own color (see section 4 schema)

**Typography**:
- **Headings**: Inter or system sans-serif, semibold
- **Body**: Inter or system sans-serif, regular, 14px base
- **Monospace** (for code/metadata): JetBrains Mono or system mono

**Design Principles**:
- Information density over whitespace — this is a power tool, not a marketing site
- Scannable summaries — the user decides in 2 seconds if an item is worth reading
- Keyboard-friendly — arrow keys to navigate, `s` to star, `Enter` to open
- Minimal clicks — actions are visible, not buried in menus

### 9.2 Global Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────┐  ┌──────────────────────────────────────────────┐ │
│  │      │  │ TOPBAR                                       │ │
│  │  S   │  │ [Section Title]     [Search...]    [⚡ Run]  │ │
│  │  I   │  ├──────────────────────────────────────────────┤ │
│  │  D   │  │                                              │ │
│  │  E   │  │                                              │ │
│  │  B   │  │           MAIN CONTENT AREA                  │ │
│  │  A   │  │                                              │ │
│  │  R   │  │                                              │ │
│  │      │  │                                              │ │
│  │      │  │                                              │ │
│  │      │  │                                              │ │
│  └──────┘  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Sidebar** (56px collapsed, 220px expanded):
- Logo: "Signal" wordmark + lightning bolt icon (amber)
- Nav items (icon + label when expanded):
  - 📰 Digest (default active)
  - 📡 Sources
  - 📋 Review
  - 🔍 Discover
  - ⚙️ Settings
- Pipeline status indicator at bottom: green dot + "Last run: 2h ago" or spinning indicator when running
- Collapse/expand toggle

**Topbar** (48px height):
- Left: Section title (e.g., "Daily Digest — Feb 26, 2026")
- Center: Search bar (global search across items)
- Right: "Run Pipeline" button (amber, with spinner when running) + stats badge

### 9.3 Daily Digest View (`/digest/{date}`)

This is the primary view — the user spends 80% of their time here.

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: Daily Digest — Wed, Feb 26, 2026                        │
│         [◀ prev] [📅 calendar picker] [next ▶]   [🔍 Search...] │
├──────────────────────────────────────────────────────────────────┤
│ STATS BAR:                                                       │
│ 142 items  ·  87 unread  ·  12 starred  ·  38 sources healthy   │
├──────────────────────────────────────────────────────────────────┤
│ FILTER BAR:                                                      │
│ [All] [Models & Research] [Coding Agents] [Web Dev] [...more]   │
│ [Source ▾]  [☆ Starred only]  [● Unread only]                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ● rss   OpenAI Blog                          2:30 PM        │ │
│ │ Introducing GPT-5: A New Frontier                            │ │
│ │ OpenAI announced GPT-5, their most capable model to date.    │ │
│ │ Key improvements include 2M token context, native tool use,  │ │
│ │ and 40% cost reduction over GPT-4...                         │ │
│ │ [Models & Research] [Industry]              [☆ Star] [Open↗] │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▶ youtube  Fireship                           1:15 PM        │ │
│ │ ┌────────┐ Claude Code just mass...                          │ │
│ │ │ thumb  │ Fireship covers the latest Claude Code release    │ │
│ │ │  nail  │ which adds multi-agent workflows and background   │ │
│ │ │        │ tasks. Major step for agentic coding tools...     │ │
│ │ └────────┘ [Coding Agents]                  [☆ Star] [Open↗] │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ● rss   Simon Willison                       11:00 AM       │ │
│ │ Building agents with tool-use patterns                       │ │
│ │ Simon walks through practical patterns for building AI       │ │
│ │ agents that use tools reliably. Covers retry logic, error    │ │
│ │ handling, and composability...                               │ │
│ │ [Coding Agents] [Tutorials]                 [★ Starred] [↗]  │ │
│ │ 📝 "Share in weekly review - good patterns reference"        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ... (scrollable list)                                            │
│                                                                  │
│ [Load more — page 1 of 3]                                       │
└──────────────────────────────────────────────────────────────────┘
```

**Item card details**:
- **Left column**: Source type icon (colored by type: RSS=blue, YouTube=red, HN=orange, Reddit=purple, arXiv=green, GitHub=dark, Bluesky=sky blue)
- **Header row**: Source name (left), timestamp (right)
- **Title**: Bold, clickable (opens URL in new tab). Unread items have brighter text.
- **Summary**: 2-3 lines, secondary text color. Truncated with "..." if too long.
- **YouTube items**: Show thumbnail on the left side of the card.
- **Footer row**: Category badges (colored pills, clickable to filter) on left. Star button + Open link button on right.
- **Starred items**: Star icon filled (amber), optional note shown below in muted italic with 📝 prefix.
- **Read state**: Unread cards have a subtle left border (amber 2px). Read cards are slightly dimmer.

**Star interaction**:
- Click star → toggles star state immediately
- Long-press star or click small "note" icon next to star → opens popover with textarea for annotation
- Star note appears below the summary in italic

**Calendar picker**:
- Small calendar dropdown (like ShadCN Calendar component)
- Days with items are indicated with a dot
- Days with starred items are indicated with an amber dot
- Clicking a date navigates to that day's digest

**Keyboard shortcuts** (shown in settings or `?` help modal):
- `j` / `k` — next / previous item
- `s` — toggle star on focused item
- `n` — add note to focused item
- `o` or `Enter` — open item URL
- `r` — mark as read
- `f` — toggle filter panel
- `/` — focus search

### 9.4 Sources View (`/sources`)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: Sources                              [+ Add Source]      │
├──────────────────────────────────────────────────────────────────┤
│ FILTER: [All types ▾]  [All health ▾]  [🔍 Search sources...]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🟢 OpenAI Blog                                    RSS       │ │
│ │    Last fetched: 2h ago  ·  3 items today  ·  245 total     │ │
│ │    [Enabled ✓]                        [Test] [Edit] [Delete] │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔴 @svpino                                      Twitter     │ │
│ │    Last error: "All Nitter instances failed"  ·  0 today    │ │
│ │    [Enabled ✓]                        [Test] [Edit] [Delete] │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🟡 Hacker News (AI)                          Hacker News    │ │
│ │    Last fetched: 6h ago  ·  8 items today  ·  1,203 total   │ │
│ │    [Enabled ✓]                        [Test] [Edit] [Delete] │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ... more sources ...                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Add Source form** (slide-over panel from right or modal):
- Step 1: Select source type (grid of type cards with icons)
- Step 2: Type-specific configuration form (feed URL for RSS, subreddit for Reddit, etc.)
- Step 3: Test button → shows sample fetched items
- Step 4: Confirm & save

### 9.5 Weekly Review View (`/review`)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: Weekly Review                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ GENERATE NEW REVIEW                                              │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Week: [Feb 17] to [Feb 23]  ·  15 starred items             │ │
│ │                                                              │ │
│ │ Title: [AI Intelligence Review: Feb 17-23, 2026          ]  │ │
│ │                                                              │ │
│ │                              [Generate Review ⚡]             │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ PREVIEW / EDIT                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Preview] [Edit]                         [📋 Copy] [⬇ .md] │ │
│ │                                                              │ │
│ │ # AI Intelligence Review: Feb 17-23, 2026                   │ │
│ │                                                              │ │
│ │ ## Executive Summary                                         │ │
│ │ This week saw major developments in agentic coding with...  │ │
│ │                                                              │ │
│ │ ## Key Developments                                          │ │
│ │                                                              │ │
│ │ ### Models & Research                                        │ │
│ │ - **GPT-5 announcement**: OpenAI released...                │ │
│ │ ...                                                          │ │
│ │                                                              │ │
│ │ ## Trends to Watch                                           │ │
│ │ 1. Agentic coding tools converging on...                    │ │
│ │                                                              │ │
│ │ ## Action Items                                              │ │
│ │ - [ ] Evaluate Claude Code v2 for team workflows            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ PAST REVIEWS                                                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Feb 10-16  ·  12 items  ·  Generated Feb 17     [View]      │ │
│ │ Feb 3-9    ·  9 items   ·  Generated Feb 10     [View]      │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Review interactions**:
- Preview tab: Rendered markdown (read-only)
- Edit tab: Raw markdown editor (monospace, syntax highlighted)
- Copy: Copies rendered markdown to clipboard
- Download: Saves as `.md` file
- Generate: Shows loading spinner, streams result when ready

### 9.6 Discovery View (`/discovery`)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: YouTube Discovery                    [🔄 Refresh Scan]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Suggested channels based on your keyword searches                │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📺 AI Jason                                                  │ │
│ │ 125K subscribers  ·  Appeared 8 times in searches            │ │
│ │                                                              │ │
│ │ Sample videos:                                               │ │
│ │ · "Building AI Agents with Claude 4" (12K views)            │ │
│ │ · "Cursor vs Claude Code: Honest Review" (45K views)        │ │
│ │ · "The Future of Agentic Coding" (8K views)                 │ │
│ │                                                              │ │
│ │                              [✓ Add to Sources] [✗ Dismiss]  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📺 Code With AI                                              │ │
│ │ 45K subscribers  ·  Appeared 3 times in searches             │ │
│ │ ...                                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.7 Settings View (`/settings`)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: Settings                                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PIPELINE                                                         │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Schedule: [6:00 AM, 6:00 PM ▾]  (runs twice daily)         │ │
│ │ Status: Idle  ·  Last run: Feb 26, 6:00 AM  ·  Next: 6 PM  │ │
│ │                                          [Run Now ⚡]         │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ YOUTUBE SEARCH KEYWORDS                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [agentic coding ✕] [AI coding agent ✕] [Claude Code ✕]     │ │
│ │ [Cursor AI ✕] [LLM coding ✕] [AI developer tools ✕]       │ │
│ │ [+ Add keyword...]                                           │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ CATEGORIES                                                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [🟣 Models & Research] [🔵 Coding Agents] [🟢 Web Dev]     │ │
│ │ [🟡 Industry] [🔴 Tools] [🟣 Open Source] [🩷 Tutorials]  │ │
│ │ [🩵 Opinion]                                                │ │
│ │ [+ Add category...]                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ PIPELINE HISTORY                                                 │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Feb 26, 6:00 AM  ·  ✅ completed  ·  142 fetched, 38 new   │ │
│ │ Feb 25, 6:00 PM  ·  ✅ completed  ·  98 fetched, 22 new    │ │
│ │ Feb 25, 6:00 AM  ·  ⚠️ completed  ·  2 source errors       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 9.8 Quick Add Modal (for LinkedIn / manual items)

Accessible from a `+` floating action button or keyboard shortcut (`a`):

```
┌──────────────────────────────────────────────────┐
│ Quick Add Item                              [✕]  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Title *                                          │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ URL *                                            │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Content (optional — will be summarized by AI)    │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Source name: [LinkedIn - ________]               │
│                                                  │
│                               [Cancel] [Add ✓]  │
└──────────────────────────────────────────────────┘
```

### 9.9 Responsive Behavior

- **Desktop (>1280px)**: Full layout with expanded sidebar
- **Desktop (1024-1280px)**: Collapsed sidebar (icons only), full content
- **Tablet (768-1024px)**: Hidden sidebar (hamburger toggle), single column
- **Mobile (<768px)**: Not a priority, but basic responsive — single column, stacked cards

---

## 10. Docker Compose

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: signal-postgres
    environment:
      POSTGRES_USER: signal
      POSTGRES_PASSWORD: signal
      POSTGRES_DB: signal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U signal -d signal"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: signal-backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: signal-frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

No auth needed — single-user personal tool. No Redis — APScheduler runs in-process.

---

## 11. Implementation Milestones

### Phase 1: Foundation (Days 1-2)
- Project scaffolding: monorepo, Docker Compose, configs
- **Linting & testing setup from the start**:
  - Backend: Ruff (`ruff check`, `ruff format`) + mypy (strict) + pytest + pytest-asyncio
  - Frontend: Biome (`biome check --write`) + Playwright
  - CI-ready scripts in package.json / pyproject.toml: `lint`, `format`, `test`, `typecheck`
- Database schema (init.sql)
- Backend skeleton: FastAPI app, config, db, health endpoint
- Frontend skeleton: TanStack Start, routing, layout shell

### Phase 2: Core Pipeline (Days 3-5)
- BaseFetcher + RSSFetcher
- Deduplication logic
- LLM summarizer + categorizer
- Pipeline orchestrator
- Items/Sources/Categories CRUD endpoints
- Seed ~30 RSS sources

### Phase 3: Additional Fetchers (Days 6-8)
- HackerNewsFetcher
- RedditFetcher
- ArxivFetcher
- GitHubReleasesFetcher
- YouTubeChannelFetcher + YouTubeSearchFetcher
- BlueskyFetcher
- TwitterFetcher (Nitter fallback)
- Manual item endpoint

### Phase 4: Frontend — Daily Digest (Days 9-11)
- Layout shell (sidebar, topbar)
- Daily digest page with item cards
- Calendar date navigation
- Category/source/search filtering
- Star/read actions
- Keyboard shortcuts

### Phase 5: Curation & Review (Days 12-14)
- Star + annotation workflow
- Weekly review generation endpoint + LLM prompt
- Review UI (generate, preview, edit, copy, download)
- Source management page
- Pipeline monitoring UI

### Phase 6: Discovery & Polish (Days 15-16)
- YouTube discovery engine
- Discovery page UI
- Settings page (keywords, categories, schedule)
- Quick Add modal
- Source health indicators
- Pipeline scheduling (APScheduler)

---

## 12. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DB driver | asyncpg (raw SQL) | No ORM overhead, matches existing patterns |
| HTTP client | httpx (async) | Native async, used across all fetchers |
| RSS parser | feedparser | Industry standard |
| Scheduler | APScheduler 4 in-process | No Redis needed for single-user |
| LLM client | openai SDK | Direct, typed, async |
| Dedup | URL unique index + title similarity | 3-layer approach, DB enforces primary dedup |
| Auth | None | Single-user tool |
| Frontend state | TanStack Router loaders | No global state needed |
| Twitter | Nitter RSS fallback | Avoids $100/month API cost |
| LinkedIn | Manual paste | No viable automated approach |

---

## 13. Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| OpenAI GPT-4.1-nano (summarization) | ~$0.30 |
| YouTube Data API | Free (within 10K units/day) |
| GitHub API | Free (with token) |
| All other APIs | Free |
| **Total** | **~$0.30/month** |

---

## 14. Open Questions / Future Considerations

1. **Twitter**: If Nitter dies completely, evaluate $100/month Twitter API or drop Twitter in favor of Bluesky
2. **LinkedIn browser extension**: Build a simple Chrome extension that POSTs to Signal's manual endpoint
3. **Email digest**: Optional daily email summary in addition to web UI
4. **Mobile app**: Not planned, but responsive web should be sufficient
5. **Multi-user**: Not needed now, but adding auth later is straightforward
6. **RSS feed discovery**: Auto-detect RSS feeds from blog URLs that don't have explicit feed links

---

*End of PRD*
