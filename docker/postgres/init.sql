CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SOURCES
CREATE TABLE IF NOT EXISTS sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    source_type     TEXT NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    fetch_interval  INTERVAL NOT NULL DEFAULT '12 hours',
    last_fetched_at TIMESTAMPTZ,
    last_error      TEXT,
    error_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources (source_type);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources (enabled) WHERE enabled = true;

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
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
CREATE TABLE IF NOT EXISTS items (
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
    extra           JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_url ON items (url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_source_external ON items (source_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_published ON items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_fetched ON items (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_starred ON items (is_starred, published_at DESC) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_items_unsummarized ON items (summarized_at) WHERE summarized_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_source ON items (source_id, published_at DESC);

-- ITEM <-> CATEGORY
CREATE TABLE IF NOT EXISTS item_categories (
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_auto         BOOLEAN NOT NULL DEFAULT true,
    confidence      REAL,
    PRIMARY KEY (item_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_item_categories_category ON item_categories (category_id);

-- PIPELINE RUNS
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running',
    items_fetched   INTEGER NOT NULL DEFAULT 0,
    items_new       INTEGER NOT NULL DEFAULT 0,
    items_summarized INTEGER NOT NULL DEFAULT 0,
    errors          JSONB DEFAULT '[]'::jsonb,
    trigger         TEXT NOT NULL DEFAULT 'scheduled',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WEEKLY REVIEWS
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    title           TEXT,
    markdown        TEXT NOT NULL,
    item_count      INTEGER NOT NULL DEFAULT 0,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews (week_start);

-- YOUTUBE CHANNEL SUGGESTIONS
CREATE TABLE IF NOT EXISTS youtube_channel_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id      TEXT NOT NULL,
    channel_name    TEXT NOT NULL,
    channel_url     TEXT NOT NULL,
    subscriber_count INTEGER,
    video_count     INTEGER,
    appearance_count INTEGER NOT NULL DEFAULT 1,
    sample_videos   JSONB DEFAULT '[]'::jsonb,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_yt_suggestions_channel ON youtube_channel_suggestions (channel_id);
CREATE INDEX IF NOT EXISTS idx_yt_suggestions_status ON youtube_channel_suggestions (status);

-- SETTINGS (key-value store for app settings)
CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
    ('pipeline_cron', '"0 6,18 * * *"'),
    ('youtube_keywords', '["agentic coding", "AI coding agent", "Claude Code", "Cursor AI", "AI developer tools", "LLM coding", "AI pair programming", "coding with AI 2026", "AI software engineering", "vibe coding"]')
ON CONFLICT (key) DO NOTHING;

-- SEED SOURCES from tracked.md

-- AI Research & Models (RSS)
INSERT INTO sources (name, source_type, config) VALUES
    ('OpenAI Blog', 'rss', '{"feed_url": "https://openai.com/blog/rss.xml"}'),
    ('Anthropic Blog', 'rss', '{"feed_url": "https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml"}'),
    ('Google DeepMind Blog', 'rss', '{"feed_url": "https://blog.google/technology/ai/rss/"}'),
    ('Meta Engineering', 'rss', '{"feed_url": "https://engineering.fb.com/feed/"}'),
    ('Hugging Face Blog', 'rss', '{"feed_url": "https://huggingface.co/blog/feed.xml"}')
ON CONFLICT DO NOTHING;

-- Mistral Blog - no RSS feed available (disabled)
INSERT INTO sources (name, source_type, config, enabled, last_error) VALUES
    ('Mistral Blog', 'rss', '{"feed_url": ""}', false, 'No RSS feed available')
ON CONFLICT DO NOTHING;

-- arXiv
INSERT INTO sources (name, source_type, config) VALUES
    ('arXiv CS.AI + CS.CL', 'arxiv', '{"categories": ["cs.AI", "cs.CL"], "max_results": 20}')
ON CONFLICT DO NOTHING;

-- Coding Agents & Dev Tools (RSS)
INSERT INTO sources (name, source_type, config) VALUES
    ('Simon Willison', 'rss', '{"feed_url": "https://simonwillison.net/atom/everything/"}'),
    ('Addy Osmani', 'rss', '{"feed_url": "https://addyosmani.com/feed.xml"}'),
    ('Angie Jones', 'rss', '{"feed_url": "https://angiejones.tech/blog/feed/"}'),
    ('Pragmatic Engineer', 'rss', '{"feed_url": "https://newsletter.pragmaticengineer.com/feed"}'),
    ('Martin Fowler', 'rss', '{"feed_url": "https://martinfowler.com/feed.atom"}'),
    ('Armin Ronacher', 'rss', '{"feed_url": "https://lucumr.pocoo.org/feed.atom"}'),
    ('Eleanor Berger', 'rss', '{"feed_url": "https://intellectronica.substack.com/feed"}'),
    ('Lalit Maganti', 'rss', '{"feed_url": "https://lalitm.com/index.xml"}'),
    ('Cursor Blog', 'rss', '{"feed_url": "https://www.cursor.com/changelog/rss.xml"}'),
    ('GitHub Blog', 'rss', '{"feed_url": "https://github.blog/feed/"}'),
    ('Codeium/Windsurf Blog', 'rss', '{"feed_url": "https://codeium.com/blog/rss.xml"}'),
    ('Sourcegraph Blog', 'rss', '{"feed_url": "https://sourcegraph.com/blog/rss.xml"}'),
    ('Continue.dev Blog', 'rss', '{"feed_url": "https://blog.continue.dev/feed.xml"}'),
    ('Aider Blog', 'rss', '{"feed_url": "https://aider.chat/feed.xml"}')
ON CONFLICT DO NOTHING;

-- GitHub Releases
INSERT INTO sources (name, source_type, config) VALUES
    ('Claude Code Releases', 'github_releases', '{"owner": "anthropics", "repo": "claude-code"}')
ON CONFLICT DO NOTHING;

-- Web Development (RSS)
INSERT INTO sources (name, source_type, config) VALUES
    ('Vercel Blog', 'rss', '{"feed_url": "https://vercel.com/atom"}'),
    ('Cloudflare Blog', 'rss', '{"feed_url": "https://blog.cloudflare.com/rss/"}'),
    ('Deno Blog', 'rss', '{"feed_url": "https://deno.com/blog/rss.xml"}'),
    ('Astro Blog', 'rss', '{"feed_url": "https://astro.build/rss.xml"}'),
    ('Chrome Developers', 'rss', '{"feed_url": "https://developer.chrome.com/blog/feed.xml"}')
ON CONFLICT DO NOTHING;

-- Aggregators & Newsletters (RSS)
INSERT INTO sources (name, source_type, config) VALUES
    ('TLDR AI', 'rss', '{"feed_url": "https://tldr.tech/rss"}'),
    ('Ben''s Bites', 'rss', '{"feed_url": "https://bensbites.com/feed"}'),
    ('The Gradient', 'rss', '{"feed_url": "https://thegradient.pub/rss/"}'),
    ('Latent Space', 'rss', '{"feed_url": "https://www.latent.space/feed"}'),
    ('AI News (Smol AI)', 'rss', '{"feed_url": "https://buttondown.email/ainews/rss"}'),
    ('Heavybit', 'rss', '{"feed_url": "https://www.heavybit.com/library/feed/feed.rss"}')
ON CONFLICT DO NOTHING;

-- Hacker News
INSERT INTO sources (name, source_type, config) VALUES
    ('Hacker News (AI)', 'hackernews', '{"min_score": 50, "keywords": ["AI", "LLM", "Claude", "GPT", "agentic", "Cursor", "Copilot", "coding agent", "Anthropic", "OpenAI"]}')
ON CONFLICT DO NOTHING;

-- Reddit
INSERT INTO sources (name, source_type, config) VALUES
    ('r/aifails', 'reddit', '{"subreddit": "aifails", "sort": "hot", "limit": 25}')
ON CONFLICT DO NOTHING;

-- YouTube Channels
INSERT INTO sources (name, source_type, config) VALUES
    ('Nate B Jones', 'youtube_channel', '{"channel_handle": "@NateBJones"}'),
    ('Fireship', 'youtube_channel', '{"channel_handle": "@fireship"}'),
    ('AI Engineer', 'youtube_channel', '{"channel_handle": "@aiDotEngineer"}')
ON CONFLICT DO NOTHING;

-- YouTube Search (keywords)
INSERT INTO sources (name, source_type, config) VALUES
    ('YouTube AI Search', 'youtube_search', '{"keywords": ["agentic coding", "AI coding agent", "Claude Code", "Cursor AI", "AI developer tools", "LLM coding", "AI pair programming", "AI software engineering", "vibe coding"], "max_results": 10}')
ON CONFLICT DO NOTHING;

-- Twitter/X (Nitter fallback)
INSERT INTO sources (name, source_type, config) VALUES
    ('@kaboroevich', 'twitter', '{"username": "kaboroevich", "method": "nitter"}'),
    ('@svpino', 'twitter', '{"username": "svpino", "method": "nitter"}'),
    ('@swaborhm', 'twitter', '{"username": "swaborhm", "method": "nitter"}'),
    ('@alexalbert__', 'twitter', '{"username": "alexalbert__", "method": "nitter"}'),
    ('@OfficialLoganK', 'twitter', '{"username": "OfficialLoganK", "method": "nitter"}'),
    ('@laboroai', 'twitter', '{"username": "laboroai", "method": "nitter"}')
ON CONFLICT DO NOTHING;
