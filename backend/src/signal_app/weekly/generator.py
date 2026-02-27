import logging

from openai import AsyncOpenAI

from signal_app.config import get_settings

logger = logging.getLogger(__name__)

REVIEW_SYSTEM_PROMPT = (
    "You are a technical writer generating a weekly AI intelligence review"
    " for a Field CTO at a cloud platform company.\n\n"
    "Given a list of starred/curated items grouped by category,"
    " generate a structured markdown review with:\n\n"
    "1. **Executive Summary** (3-5 sentences): High-level overview of the week's key themes.\n"
    "2. **Key Developments** (grouped by category): For each category with items,"
    " write a subsection with bullet points summarizing each item."
    " Include the original URL as a markdown link."
    " If the curator left a note, incorporate its insight.\n"
    "3. **Trends to Watch**: 2-4 emerging patterns or themes you notice across the items.\n"
    "4. **Action Items**: 2-3 concrete next steps based on the developments (as a checklist).\n\n"
    "Tone: Professional but not stuffy. Informed, opinionated, concise."
    " This is for an internal team briefing, not a blog post.\n\n"
    "Output clean markdown only, no code fences wrapping the output."
)


async def generate_weekly_review(
    items: list[dict[str, object]],
    week_start: str,
    week_end: str,
    title: str,
) -> str:
    """Generate a weekly review markdown from starred items using LLM."""
    settings = get_settings()

    if not settings.openai_api_key:
        # Fallback: generate a simple markdown without LLM
        return _fallback_review(items, title)

    # Group items by category for the prompt
    user_content = f"# Items for review: {week_start} to {week_end}\n\n"
    user_content += f"Title: {title}\n"
    user_content += f"Total items: {len(items)}\n\n"

    # Sort and group by first category
    for item in items:
        cats = item.get("categories", ["Uncategorized"])
        cat_name = cats[0] if isinstance(cats, list) and cats else "Uncategorized"
        user_content += f"### [{cat_name}] {item['title']}\n"
        user_content += f"- URL: {item['url']}\n"
        user_content += f"- Source: {item['source_name']}\n"
        if item.get("summary"):
            user_content += f"- Summary: {item['summary']}\n"
        if item.get("star_note"):
            user_content += f"- Curator note: {item['star_note']}\n"
        user_content += "\n"

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": REVIEW_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.4,
            max_tokens=4000,
        )

        markdown = response.choices[0].message.content or ""
        # Prepend title if not already present
        if not markdown.startswith(f"# {title}"):
            markdown = f"# {title}\n\n{markdown}"
        return markdown

    except Exception:
        logger.exception("Weekly review generation failed, using fallback")
        return _fallback_review(items, title)


def _fallback_review(items: list[dict[str, object]], title: str) -> str:
    """Generate a basic markdown review without LLM."""
    lines = [f"# {title}", "", "## Key Developments", ""]

    # Group by first category
    categorized: dict[str, list[dict[str, object]]] = {}
    for item in items:
        cats = item.get("categories", ["Uncategorized"])
        cat = cats[0] if isinstance(cats, list) and cats else "Uncategorized"
        categorized.setdefault(cat, []).append(item)

    for category, cat_items in categorized.items():
        lines.append(f"### {category}")
        lines.append("")
        for item in cat_items:
            lines.append(f"- **[{item['title']}]({item['url']})** ({item['source_name']})")
            if item.get("summary"):
                lines.append(f"  {item['summary']}")
            if item.get("star_note"):
                lines.append(f"  > *{item['star_note']}*")
        lines.append("")

    lines.append("---")
    lines.append(f"*Generated from {len(items)} starred items*")

    return "\n".join(lines)
