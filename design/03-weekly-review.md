# Weekly review page

The review page (`/review`) lets the user generate, preview, edit, and export weekly summary reports from starred items.

## Topbar

- Section title: "Weekly Review"

## Generate new review section

A card/form at the top with:
- **Week range selector**: start date and end date pickers (defaults to the previous Monday-Sunday)
- **Starred items count**: shows how many starred items exist in the selected date range
- **Title input**: pre-filled with "AI Intelligence Review: [date range]", editable
- **Generate button**: triggers LLM generation, shows a loading spinner during generation

## Preview and edit section

Appears after a review is generated or when viewing an existing review.

- **Tab toggle**: "Preview" and "Edit" tabs
  - Preview tab: rendered markdown, read-only
  - Edit tab: raw markdown in a monospace text editor
- **Action buttons** in the top-right of this section:
  - Copy to clipboard (copies the rendered markdown)
  - Download as .md file

### Review markdown structure (for reference, this is what the generated content looks like)

- Executive summary
- Key developments grouped by category (Models & Research, Coding Agents, Web Dev, etc.)
- Trends to watch
- Action items (checklist format)

## Past reviews section

Below the generator, a list of previously generated reviews:
- Each row shows: week date range, item count, generation date, and a "View" button
- Clicking "View" loads that review into the preview/edit section above
