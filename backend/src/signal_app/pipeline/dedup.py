import logging
from difflib import SequenceMatcher

import asyncpg

from signal_app.fetchers.base import RawItem

logger = logging.getLogger(__name__)


async def deduplicate(items: list[RawItem], conn: asyncpg.Connection) -> list[RawItem]:
    """3-layer deduplication: URL, source+external_id, and fuzzy title match.

    Returns only items that are genuinely new.
    """
    if not items:
        return []

    # Layer 1 & 2: Check existing URLs and external IDs in the database
    urls = [i.url for i in items if i.url]
    [(i.external_id or "") for i in items]

    existing_urls: set[str] = set()
    existing_titles: list[str] = []

    if urls:
        rows = await conn.fetch("SELECT url FROM items WHERE url = ANY($1::text[])", urls)
        existing_urls = {r["url"] for r in rows}

    # Get recent titles for fuzzy matching (48-hour window)
    title_rows = await conn.fetch("SELECT title FROM items WHERE created_at > now() - interval '48 hours'")
    existing_titles = [r["title"] for r in title_rows]

    new_items: list[RawItem] = []

    for item in items:
        # Layer 1: Exact URL match
        if item.url and item.url in existing_urls:
            logger.debug("Dedup: URL match — %s", item.url)
            continue

        # Layer 3: Fuzzy title match against recent items
        if _fuzzy_title_match(item.title, existing_titles):
            logger.debug("Dedup: fuzzy title match — %s", item.title)
            continue

        new_items.append(item)
        # Add to existing lists so we don't duplicate within this batch
        existing_urls.add(item.url)
        existing_titles.append(item.title)

    logger.info("Dedup: %d items in → %d new items out", len(items), len(new_items))
    return new_items


def _fuzzy_title_match(title: str, existing_titles: list[str], threshold: float = 0.85) -> bool:
    """Check if title is too similar to any existing title."""
    if not title or not existing_titles:
        return False
    title_lower = title.lower().strip()
    for existing in existing_titles:
        ratio = SequenceMatcher(None, title_lower, existing.lower().strip()).ratio()
        if ratio >= threshold:
            return True
    return False
