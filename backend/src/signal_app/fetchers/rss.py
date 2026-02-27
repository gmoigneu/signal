import contextlib
import logging

import feedparser
import httpx
from dateutil.parser import parse as parse_date

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)


class RSSFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        feed_url = self.config.get("feed_url", "")
        if not feed_url:
            return []

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(feed_url)
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        items: list[RawItem] = []

        for entry in feed.entries[:50]:  # cap at 50 per feed
            published = None
            date_str = entry.get("published") or entry.get("updated")
            if date_str:
                with contextlib.suppress(ValueError, TypeError):
                    published = parse_date(date_str)

            items.append(
                RawItem(
                    external_id=entry.get("id") or entry.get("link"),
                    title=entry.get("title", "Untitled"),
                    url=entry.get("link", ""),
                    author=entry.get("author"),
                    content_raw=(entry.get("summary") or entry.get("description", ""))[:2000],
                    published_at=published,
                )
            )

        return items
