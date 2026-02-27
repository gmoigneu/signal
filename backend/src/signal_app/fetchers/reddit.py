import logging
from datetime import UTC, datetime

import httpx

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)


class RedditFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        subreddit = self.config.get("subreddit", "")
        sort = self.config.get("sort", "hot")
        limit = self.config.get("limit", 25)

        if not subreddit:
            return []

        url = f"https://old.reddit.com/r/{subreddit}/{sort}.json"
        params = {"limit": min(limit, 100)}
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Signal/1.0; +https://github.com/glaforge/signal)",
        }

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()

        data = response.json()
        items: list[RawItem] = []

        for child in data.get("data", {}).get("children", []):
            post = child.get("data", {})
            if not post:
                continue

            published = None
            if post.get("created_utc"):
                published = datetime.fromtimestamp(post["created_utc"], tz=UTC)

            post_url = post.get("url") or f"https://reddit.com{post.get('permalink', '')}"
            content = post.get("selftext", "") or post.get("title", "")

            items.append(
                RawItem(
                    external_id=post.get("id"),
                    title=post.get("title", "Untitled"),
                    url=post_url,
                    author=post.get("author"),
                    content_raw=content[:2000],
                    thumbnail_url=post.get("thumbnail") if post.get("thumbnail", "").startswith("http") else None,
                    published_at=published,
                    extra={
                        "score": post.get("score"),
                        "num_comments": post.get("num_comments"),
                        "subreddit": subreddit,
                        "reddit_url": f"https://reddit.com{post.get('permalink', '')}",
                    },
                )
            )

        return items
