import json
import logging

from openai import AsyncOpenAI

from signal_app.config import get_settings
from signal_app.db import get_pool

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are a news summarizer for an intelligence tool called Signal.

For each item, produce:
1. A concise 2-3 sentence summary focused on why this matters.
2. Assign 1-3 categories from this list (use slugs):
{categories}

If no categories are configured, skip the categories field.

Respond with valid JSON only. Format:
{{
  "results": [
    {{"index": 0, "summary": "...", "categories": ["slug1"], "confidence": [0.95]}}
  ]
}}"""


async def _build_system_prompt() -> str:
    """Build the system prompt with categories from the database."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT name, slug FROM categories ORDER BY sort_order")

    if rows:
        cat_lines = "\n".join(f"   - {row['slug']}: {row['name']}" for row in rows)
    else:
        cat_lines = "   (no categories configured)"

    return SYSTEM_PROMPT_TEMPLATE.format(categories=cat_lines)


async def summarize_items(
    items: list[dict[str, str | int]],
) -> list[dict[str, str | list[str] | list[float]]]:
    """Summarize and categorize a batch of items using OpenAI.

    Args:
        items: List of dicts with "index", "title", and "content" keys.

    Returns:
        List of dicts with "index", "summary", "categories", and "confidence" keys.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("No OpenAI API key configured, skipping summarization")
        return []

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    system_prompt = await _build_system_prompt()

    # Build the user message
    user_parts = []
    for item in items:
        user_parts.append(f"[Item {item['index']}]\nTitle: {item['title']}\nContent: {item['content']}\n")

    user_message = "\n---\n".join(user_parts)

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return data.get("results", [])

    except Exception:
        logger.exception("LLM summarization failed")
        return []
