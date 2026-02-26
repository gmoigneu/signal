# Quick add modal

A modal dialog for manually adding news items (primarily for LinkedIn posts and other sources that can't be automated). Accessible from a floating action button on the digest page or via the `a` keyboard shortcut.

## Modal contents

- **Title**: "Quick Add Item" with a close button

### Form fields

- **Title** (required): single-line text input
- **URL** (required): single-line text input
- **Content** (optional): multi-line textarea, with helper text "Will be summarized by AI"
- **Source name**: single-line text input, pre-filled with "LinkedIn - " (editable)

### Actions

- **Cancel button**: closes the modal without saving
- **Add button**: submits the item, closes the modal

## Behavior notes

- After submission, the item goes through the LLM summarizer and categorizer
- The new item should appear in the digest view for today's date
- Validation: title and URL are required, show inline errors if empty on submit
