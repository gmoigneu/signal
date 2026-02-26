# YouTube discovery page

The discovery page (`/discovery`) shows YouTube channel suggestions that have been identified through keyword searches. The user can promote channels to tracked sources or dismiss them.

## Topbar

- Section title: "YouTube Discovery"
- Right side: "Refresh Scan" button to trigger a new keyword search scan

## Intro text

A brief line of context: "Suggested channels based on your keyword searches"

## Channel suggestion cards

Each card contains:
- **Channel icon/avatar placeholder** and channel name (bold)
- **Stats line**: subscriber count, number of times this channel appeared in keyword searches
- **Sample videos list**: 3-5 video titles with view counts, displayed as a simple bulleted list
- **Action buttons**:
  - "Add to Sources": promotes this channel to a tracked YouTube source
  - "Dismiss": hides this suggestion

## States

- **Empty state**: message shown when there are no pending suggestions (e.g., "No new channel suggestions. Run a keyword scan to discover channels.")
- **Loading state**: shown while a refresh scan is in progress
- Cards should only show channels with status "pending" (not already accepted or dismissed)
