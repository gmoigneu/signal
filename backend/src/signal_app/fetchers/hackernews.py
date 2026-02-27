import contextlib
import logging

import httpx
from dateutil.parser import parse as parse_date

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)

ALGOLIA_HN_API = "https://hn.algolia.com/api/v1/search"


class HackerNewsFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        keywords = self.config.get("keywords", [])
        min_score = self.config.get("min_score", 50)

        if not keywords:
            return []

        query = " OR ".join(keywords)
        params = {
            "query": query,
            "tags": "story",
            "numericFilters": f"points>{min_score}",
            "hitsPerPage": 50,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(ALGOLIA_HN_API, params=params)
            response.raise_for_status()

        data = response.json()
        items: list[RawItem] = []

        for hit in data.get("hits", [])[:50]:
            published = None
            if hit.get("created_at"):
                with contextlib.suppress(ValueError, TypeError):
                    published = parse_date(hit["created_at"])

            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit['objectID']}"

            items.append(
                RawItem(
                    external_id=hit.get("objectID"),
                    title=hit.get("title", "Untitled"),
                    url=url,
                    author=hit.get("author"),
                    content_raw=hit.get("story_text") or hit.get("comment_text"),
                    published_at=published,
                    extra={
                        "score": hit.get("points"),
                        "num_comments": hit.get("num_comments"),
                        "hn_url": f"https://news.ycombinator.com/item?id={hit['objectID']}",
                    },
                )
            )

        return items
