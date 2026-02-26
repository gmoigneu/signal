# Sources page

The sources management page (`/sources`) lets the user view, add, edit, and monitor all configured news sources.

## Topbar

- Section title: "Sources"
- Right side: "+ Add Source" button

## Filter row

- Source type dropdown filter (All types, RSS, YouTube, Hacker News, Reddit, arXiv, GitHub, Bluesky, Twitter)
- Health status dropdown filter (All, Healthy, Warning, Error, Stale)
- Search input to filter sources by name

## Source list

Each source card shows:
- **Health indicator dot**: green (healthy), yellow (warning), red (error), gray (stale)
  - Healthy: error_count is 0 and fetched within expected interval
  - Warning: error_count 1-2
  - Error: error_count 3+
  - Stale: no fetch in over 48 hours
- **Source name** (bold)
- **Source type label** (e.g., "RSS", "Twitter", "Hacker News")
- **Status line**: last fetched timestamp, items fetched today count, total items count
- **Error state**: if the source has errors, show the last error message instead of the normal status line
- **Enabled toggle**: shows whether the source is active
- **Action buttons**: Test, Edit, Delete

## Add source flow

Opens as a slide-over panel from the right or a modal. Multi-step form:

1. **Select source type**: grid of type cards with icons (RSS, YouTube Channel, YouTube Search, Hacker News, Reddit, arXiv, GitHub Releases, Bluesky, Twitter)
2. **Configuration form**: fields vary by type:
   - RSS: feed URL
   - YouTube Channel: channel ID or handle, playlist ID
   - YouTube Search: keywords list, max results
   - Hacker News: minimum score, keywords list
   - Reddit: subreddit name, sort method, limit
   - arXiv: categories list, max results
   - GitHub Releases: owner, repo
   - Bluesky: handle
   - Twitter: username
   - Common fields for all types: name, fetch interval, enabled toggle
3. **Test button**: fetches sample items and displays them as a preview
4. **Confirm and save**

## Edit source

Same form as add, pre-filled with current values. Opens in the same slide-over/modal.

## Delete source

Confirmation dialog warning that deleting will also remove all items from this source.
