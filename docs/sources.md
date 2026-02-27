# Signal — Source Types

Signal supports 10 source types for fetching content. Each source has a `source_type` and a `config` JSON object with type-specific settings.

## RSS / Atom Feeds

**Type:** `rss`

**Config:**
```json
{"feed_url": "https://example.com/feed.xml"}
```

Uses `feedparser` + `httpx`. Works with any standard RSS 2.0 or Atom feed. Caps at 50 entries per fetch.

**Seeded sources:** OpenAI Blog, Anthropic Blog, Google AI, Meta AI, Mistral, Hugging Face, Simon Willison, Vercel, Cloudflare, and 20+ more.

## Hacker News

**Type:** `hackernews`

**Config:**
```json
{"keywords": ["AI", "LLM", "Claude"], "min_score": 50}
```

Uses Algolia HN Search API. Filters stories by keywords (OR'd) and minimum score. No auth needed.

## Reddit

**Type:** `reddit`

**Config:**
```json
{"subreddit": "aifails", "sort": "hot", "limit": 25}
```

Uses Reddit JSON API (appending `.json` to URLs). No OAuth needed. Requires a reasonable User-Agent header.

## arXiv

**Type:** `arxiv`

**Config:**
```json
{"categories": ["cs.AI", "cs.CL"], "max_results": 20}
```

Uses arXiv Atom API. Queries by subject categories, sorted by submission date.

## GitHub Releases

**Type:** `github_releases`

**Config:**
```json
{"owner": "anthropics", "repo": "claude-code"}
```

Uses GitHub REST API v3. Fetches the 10 most recent releases. Optional `GITHUB_TOKEN` for higher rate limits.

## YouTube Channel

**Type:** `youtube_channel`

**Config:**
```json
{"channel_id": "UC...", "playlist_id": "UU..."}
```

Uses YouTube Data API v3. Fetches latest videos from a channel's uploads playlist. Can resolve `@handle` to channel ID. Requires `GOOGLE_API_KEY`.

## YouTube Search

**Type:** `youtube_search`

**Config:**
```json
{"keywords": ["agentic coding", "AI tools"], "max_results": 10}
```

Searches YouTube for each keyword. Results feed the channel discovery engine. Requires `GOOGLE_API_KEY`.

## Bluesky

**Type:** `bluesky`

**Config:**
```json
{"handle": "user.bsky.social"}
```

Uses the AT Protocol public API. Resolves handle to DID, then fetches author feed. No auth needed for public posts.

## Twitter/X (Nitter Fallback)

**Type:** `twitter`

**Config:**
```json
{"username": "svpino", "method": "nitter"}
```

Tries multiple Nitter RSS instances. Fragile — instances shut down regularly. Shows as "error" health when all instances fail.

## Manual

**Type:** `manual`

Not a fetcher — items are added via the `POST /api/items/manual` endpoint or the Quick Add modal in the UI. Used for LinkedIn posts and other sources without APIs.

## Source Health

Health is computed based on error state:

| Health | Condition |
|--------|-----------|
| `healthy` | `error_count == 0` |
| `warning` | `error_count` 1-2 |
| `error` | `error_count` 3+ |
| `stale` | No fetch in > 48 hours |
