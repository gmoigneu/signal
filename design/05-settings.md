# Settings page

The settings page (`/settings`) provides configuration for the pipeline schedule, YouTube search keywords, categories, and a pipeline run history log.

## Topbar

- Section title: "Settings"

## Pipeline section

A card containing:
- **Schedule selector**: dropdown or input for selecting run times (default: 6:00 AM and 6:00 PM)
- **Status line**: current status (Idle/Running), last run timestamp, next scheduled run time
- **"Run Now" button**: triggers a manual pipeline run

## YouTube search keywords section

A card containing:
- **Keyword tags**: displayed as removable tag pills (each with an "x" to remove)
- **Add keyword input**: text input with an add button to append new keywords
- Default keywords: "agentic coding", "AI coding agent", "Claude Code", "Cursor AI", "AI developer tools", "LLM coding", "AI pair programming", "coding with AI 2026", "AI software engineering", "vibe coding"

## Categories section

A card containing:
- **Category list**: each category shown as a colored tag/pill with its name
- **Each category**: clickable to edit (name, color, sort order)
- **"Add category" button**: opens an inline form or small dialog to create a new category
- Default categories: Models & Research, Coding Agents, Web Dev, Industry, Tools, Open Source, Tutorials, Opinion

## Pipeline history section

A card containing a list of recent pipeline runs:
- Each row shows: run timestamp, status icon (success, warning, failed), and summary stats (items fetched, new items count)
- Warning/failed runs show error count
- Scrollable or paginated if many runs exist
