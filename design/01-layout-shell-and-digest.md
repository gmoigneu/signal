# Layout shell and daily digest

This is the primary screen of Signal, an AI news intelligence and daily digest tool. It is a desktop-first, single-user personal tool. The interface should feel like an information-dense intelligence dashboard. Design for 1440px+ as the primary viewport.

## Global layout structure

The app uses a sidebar + topbar + main content area layout.

### Sidebar

- Fixed left sidebar, 56px when collapsed, 220px when expanded
- Top: "Signal" wordmark with a lightning bolt icon
- Navigation items (icon + label when expanded):
  - Digest (default active)
  - Sources
  - Review
  - Discover
  - Settings
- Bottom of sidebar: pipeline status indicator showing a status dot + "Last run: 2h ago" text, or a spinning indicator when the pipeline is running
- Collapse/expand toggle button

### Topbar

- 48px height, spans the full width of the main content area
- Left: section title (e.g., "Daily Digest, Wed, Feb 26, 2026")
- Center: search bar for global search across items
- Right: "Run Pipeline" button (with spinner state when running) + a stats badge

## Daily digest page (`/digest/{date}`)

This is where the user spends 80% of their time. It displays a scrollable list of news items for a given date.

### Date navigation row

- Previous day / next day arrow buttons
- Calendar picker dropdown between the arrows
  - Days with items get a dot indicator
  - Days with starred items get a distinct dot
  - Clicking a date navigates to that day's digest

### Stats bar

Single horizontal row showing:
- Total items count
- Unread count
- Starred count
- Healthy sources count

### Filter bar

- Category filter pills: "All", then one per category (Models & Research, Coding Agents, Web Dev, Industry, Tools, Open Source, Tutorials, Opinion)
- Source dropdown filter
- "Starred only" toggle
- "Unread only" toggle

### Item cards (scrollable list)

Each card contains:
- **Left indicator**: source type icon (RSS, YouTube, Hacker News, Reddit, arXiv, GitHub, Bluesky, Twitter)
- **Header row**: source name on the left, relative timestamp on the right (e.g., "2:30 PM")
- **Title**: bold, clickable (opens original URL in new tab). Unread items should appear visually distinct from read items.
- **Summary**: 2-3 lines of secondary text, truncated with ellipsis if too long
- **YouTube items only**: thumbnail image on the left side of the card
- **Footer row**: category badges (small colored pills, clickable to filter) on the left. Star button + "Open" link button on the right.
- **Starred items**: filled star icon, and if a note exists, it shows below the summary in italic with a note icon prefix
- **Read state**: unread cards have a subtle left border accent. Read cards appear slightly dimmer.

### Star interaction

- Click star: toggles star state immediately
- Long-press or click a small "note" icon next to star: opens a popover with a textarea for adding an annotation
- The note appears below the summary when present

### Pagination

- "Load more" button at the bottom, showing current page and total pages

### Keyboard shortcuts

These need to work on this page:
- `j` / `k`: next / previous item
- `s`: toggle star
- `n`: add note to focused item
- `o` or `Enter`: open item URL
- `r`: mark as read
- `f`: toggle filter panel
- `/`: focus search

### Quick add button

- A floating action button (or fixed position button) to open the Quick Add modal
- Also accessible via keyboard shortcut `a`

## Responsive behavior

- Above 1280px: full layout with expanded sidebar
- 1024-1280px: collapsed sidebar (icons only), full content area
- 768-1024px: hidden sidebar with hamburger toggle, single column
- Below 768px: not a priority, basic single column with stacked cards
