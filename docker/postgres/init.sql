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

-- Add your own categories via the Settings page or SQL:
-- INSERT INTO categories (name, slug, color, sort_order) VALUES
--     ('Example Category', 'example', '#8B5CF6', 1)
-- ON CONFLICT (slug) DO NOTHING;

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
    ('youtube_keywords', '[]')
ON CONFLICT (key) DO NOTHING;

-- Add sources via the UI or SQL. Examples:
--
-- RSS:             INSERT INTO sources (name, source_type, config) VALUES ('Example Blog', 'rss', '{"feed_url": "https://example.com/feed.xml"}');
-- Atom:            INSERT INTO sources (name, source_type, config) VALUES ('Example Atom', 'atom', '{"feed_url": "https://example.com/feed.atom"}');
-- Hacker News:     INSERT INTO sources (name, source_type, config) VALUES ('HN', 'hackernews', '{"min_score": 50, "keywords": ["topic1", "topic2"]}');
-- Reddit:          INSERT INTO sources (name, source_type, config) VALUES ('r/example', 'reddit', '{"subreddit": "example", "sort": "hot", "limit": 25}');
-- arXiv:           INSERT INTO sources (name, source_type, config) VALUES ('arXiv CS.AI', 'arxiv', '{"categories": ["cs.AI"], "max_results": 20}');
-- GitHub Releases: INSERT INTO sources (name, source_type, config) VALUES ('Releases', 'github_releases', '{"owner": "org", "repo": "repo"}');
-- YouTube Channel: INSERT INTO sources (name, source_type, config) VALUES ('Channel', 'youtube_channel', '{"channel_handle": "@handle"}');
-- YouTube Search:  INSERT INTO sources (name, source_type, config) VALUES ('YT Search', 'youtube_search', '{"keywords": ["topic"], "max_results": 10}');
-- Bluesky:         INSERT INTO sources (name, source_type, config) VALUES ('User', 'bluesky', '{"handle": "user.bsky.social"}');
-- Twitter/X:       INSERT INTO sources (name, source_type, config) VALUES ('@user', 'twitter', '{"username": "user", "method": "nitter"}');
