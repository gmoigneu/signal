import json
import logging

from openai import AsyncOpenAI

from signal_app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a news summarizer for an AI/tech intelligence tool called Signal.

For each item, produce:
1. A concise 2-3 sentence summary focused on why this matters for AI practitioners and developers.
2. Assign 1-3 categories from this list (use slugs):
   - models-research: Papers, model releases, benchmarks, training techniques
   - coding-agents: AI coding tools, code generation, IDE agents, developer workflows
   - web-dev: Web development frameworks, frontend/backend tools, deployment
   - industry: Company news, funding, acquisitions, policy, regulations
   - tools: Developer tools, libraries, CLIs, productivity software
   - open-source: Open source releases, community projects, contributions
   - tutorials: How-tos, guides, educational content, learning resources
   - opinion: Think pieces, analysis, commentary, predictions

Respond with valid JSON only. Format:
{
  "results": [
    {"index": 0, "summary": "...", "categories": ["slug1"], "confidence": [0.95]}
  ]
}"""


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

    # Build the user message
    user_parts = []
    for item in items:
        user_parts.append(f"[Item {item['index']}]\nTitle: {item['title']}\nContent: {item['content']}\n")

    user_message = "\n---\n".join(user_parts)

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
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
