import logging
from datetime import UTC

import feedparser
import httpx

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)

# Nitter instances to try (these rotate/die frequently)
NITTER_INSTANCES = [
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
    "https://nitter.woodland.cafe",
    "https://nitter.1d4.us",
]


class TwitterFetcher(BaseFetcher):
    """Fetches tweets via Nitter RSS fallback. Fragile — instances shut down regularly."""

    async def fetch(self) -> list[RawItem]:
        username = self.config.get("username", "")
        if not username:
            return []

        rss_content = None
        last_error = None

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            for instance in NITTER_INSTANCES:
                try:
                    url = f"{instance}/{username}/rss"
                    response = await client.get(url)
                    if response.status_code == 200 and len(response.text) > 100:
                        rss_content = response.text
                        break
                except httpx.HTTPError as e:
                    last_error = str(e)
                    continue

        if not rss_content:
            logger.warning("All Nitter instances failed for @%s: %s", username, last_error)
            return []

        feed = feedparser.parse(rss_content)
        items: list[RawItem] = []

        for entry in feed.entries[:30]:
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                from datetime import datetime

                published = datetime(*entry.published_parsed[:6], tzinfo=UTC)

            # Nitter entries use the tweet URL as the link
            tweet_url = entry.get("link", "")
            # Convert nitter URL to twitter URL
            for instance in NITTER_INSTANCES:
                if tweet_url.startswith(instance):
                    tweet_url = tweet_url.replace(instance, "https://twitter.com")
                    break

            title = entry.get("title", "")
            if not title:
                title = (entry.get("summary", "") or "")[:120]

            items.append(
                RawItem(
                    external_id=tweet_url,
                    title=title[:200] if title else f"Tweet by @{username}",
                    url=tweet_url,
                    author=f"@{username}",
                    content_raw=(entry.get("summary") or entry.get("description", ""))[:2000],
                    published_at=published,
                    extra={"username": username, "method": "nitter"},
                )
            )

        return items
