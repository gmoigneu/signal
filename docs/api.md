# Signal — API Reference

Base URL: `http://localhost:8000/api`

## Health

### `GET /api/health`

Returns `{"status": "ok"}`.

---

## Items

### `GET /api/items`

List items with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | string | — | Filter by date (YYYY-MM-DD) |
| `source_id` | UUID | — | Filter by source |
| `category` | string | — | Filter by category slug |
| `is_starred` | bool | — | Starred items only |
| `is_read` | bool | — | Read/unread filter |
| `search` | string | — | Search in title + summary |
| `page` | int | 1 | Page number |
| `items_per_page` | int | 50 | Items per page (max 200) |

**Response:**
```json
{
  "items": [{
    "id": "uuid",
    "source_id": "uuid",
    "source_name": "OpenAI Blog",
    "source_type": "rss",
    "title": "Article Title",
    "url": "https://...",
    "author": "Author Name",
    "summary": "AI-generated summary...",
    "thumbnail_url": null,
    "published_at": "2026-02-26T10:00:00",
    "fetched_at": "2026-02-26T12:00:00",
    "is_read": false,
    "is_starred": false,
    "star_note": null,
    "categories": [{"id": "uuid", "name": "Models & Research", "slug": "models-research", "color": "#8B5CF6", "sort_order": 1}],
    "extra": {}
  }],
  "total_items": 142,
  "page": 1,
  "items_per_page": 50,
  "total_pages": 3
}
```

### `GET /api/items/stats`

Aggregate stats for today.

**Response:**
```json
{
  "today_count": 142,
  "unread_count": 87,
  "starred_count": 12,
  "sources_healthy": 38,
  "sources_total": 40
}
```

### `GET /api/items/{id}`

Get a single item by ID.

### `PATCH /api/items/{id}`

Update item state.

**Body:**
```json
{
  "is_read": true,
  "is_starred": true,
  "star_note": "Share in weekly review",
  "category_ids": ["uuid-1", "uuid-2"]
}
```

All fields are optional.

### `POST /api/items/manual`

Add an item manually (for LinkedIn, etc.).

**Body:**
```json
{
  "title": "LinkedIn post by Sarah Drasner",
  "url": "https://linkedin.com/posts/...",
  "content_raw": "Pasted text content...",
  "source_name": "LinkedIn - Sarah Drasner"
}
```

---

## Sources

### `GET /api/sources`

List all sources with health status and item counts.

### `POST /api/sources`

Create a new source.

**Body:**
```json
{
  "name": "My Blog",
  "source_type": "rss",
  "config": {"feed_url": "https://myblog.com/feed.xml"},
  "enabled": true,
  "fetch_interval": "12 hours"
}
```

**Source types and config:**

| Type | Config |
|------|--------|
| `rss` | `{"feed_url": "..."}` |
| `hackernews` | `{"keywords": [...], "min_score": 50}` |
| `reddit` | `{"subreddit": "...", "sort": "hot", "limit": 25}` |
| `arxiv` | `{"categories": ["cs.AI"], "max_results": 20}` |
| `github_releases` | `{"owner": "...", "repo": "..."}` |
| `youtube_channel` | `{"channel_id": "...", "playlist_id": "..."}` |
| `youtube_search` | `{"keywords": [...], "max_results": 10}` |
| `bluesky` | `{"handle": "user.bsky.social"}` |
| `twitter` | `{"username": "...", "method": "nitter"}` |

### `GET /api/sources/{id}`

Get source detail.

### `PATCH /api/sources/{id}`

Update source. Body fields: `name`, `config`, `enabled`, `fetch_interval` (all optional).

### `DELETE /api/sources/{id}`

Delete source and all its items.

### `POST /api/sources/{id}/test`

Test-fetch the source (dry run, returns items without persisting).

---

## Categories

### `GET /api/categories`

List all categories.

### `POST /api/categories`

Create category. Body: `{"name": "...", "slug": "...", "color": "#hex", "sort_order": 0}`.

### `DELETE /api/categories/{id}`

Delete category (removes from items but doesn't delete items).

---

## Pipeline

### `POST /api/pipeline/run`

Trigger a manual pipeline run. Returns `{"status": "started"}` or `{"status": "already_running"}`.

### `GET /api/pipeline/status`

Current pipeline status.

**Response:**
```json
{
  "is_running": false,
  "last_run_at": "2026-02-26T06:00:00",
  "last_run_status": "completed",
  "next_run_at": null
}
```

### `GET /api/pipeline/runs`

List recent pipeline runs (last 20).

---

## Weekly Reviews

### `POST /api/reviews/generate`

Generate a review from starred items in a date range.

**Body:**
```json
{
  "week_start": "2026-02-17",
  "week_end": "2026-02-23",
  "title": "AI Intelligence Review: Feb 17-23, 2026"
}
```

### `GET /api/reviews`

List past reviews.

### `GET /api/reviews/{id}`

Get a specific review.

### `PATCH /api/reviews/{id}`

Update review. Body: `{"markdown": "...", "title": "..."}`.

---

## YouTube Discovery

### `GET /api/discovery/channels`

List suggested channels (status: pending).

### `POST /api/discovery/channels/{id}/accept`

Promote suggestion to a tracked YouTube source.

### `POST /api/discovery/channels/{id}/dismiss`

Dismiss suggestion.

### `POST /api/discovery/refresh`

Trigger a discovery scan.

---

## Settings

### `GET /api/settings`

Get app settings.

**Response:**
```json
{
  "pipeline_cron": "0 6,18 * * *",
  "youtube_keywords": ["agentic coding", "AI coding agent", ...]
}
```

### `PATCH /api/settings`

Update settings. Body: `{"pipeline_cron": "...", "youtube_keywords": [...]}` (all optional).
