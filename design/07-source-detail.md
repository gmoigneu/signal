# Source detail page

The source detail page (`/sources/{sourceId}`) shows a detailed view of a single source with its configuration and a feed of items from that source.

## Topbar

- Section title: source name (e.g., "OpenAI Blog")
- Right side: "Edit" and "Delete" buttons

## Source info card

- **Source type**: displayed as a label (e.g., "RSS", "YouTube Channel")
- **Health status**: indicator dot with status text (Healthy, Warning, Error, Stale)
- **Configuration details**: key config values displayed (e.g., feed URL for RSS, subreddit for Reddit, channel for YouTube)
- **Stats**: total items count, items fetched today, last fetched timestamp
- **Last error**: if present, shown with the error message
- **Enabled toggle**: to enable/disable the source
- **Test button**: runs a dry-run fetch and shows sample results

## Items from this source

A filtered item list (same card format as the digest page) showing only items from this source:
- Sorted by published date, newest first
- Pagination at the bottom
- Same card layout as digest: title, summary, categories, star/open actions
