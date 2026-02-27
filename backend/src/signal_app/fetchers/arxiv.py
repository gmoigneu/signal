import logging
from datetime import UTC
from urllib.parse import urlencode

import feedparser
import httpx

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)

ARXIV_API = "https://export.arxiv.org/api/query"


class ArxivFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        categories = self.config.get("categories", ["cs.AI"])
        max_results = self.config.get("max_results", 20)

        cat_query = " OR ".join(f"cat:{cat}" for cat in categories)
        params = {
            "search_query": cat_query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }

        url = f"{ARXIV_API}?{urlencode(params)}"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        items: list[RawItem] = []

        for entry in feed.entries[:max_results]:
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                from datetime import datetime

                published = datetime(*entry.published_parsed[:6], tzinfo=UTC)

            # Extract authors
            authors = []
            if hasattr(entry, "authors"):
                authors = [a.get("name", "") for a in entry.authors]
            author_str = ", ".join(authors[:5])
            if len(authors) > 5:
                author_str += f" et al. ({len(authors)} authors)"

            # Extract arxiv ID from the entry id URL
            arxiv_id = entry.get("id", "").split("/abs/")[-1]

            # Get PDF link
            pdf_url = ""
            for link in entry.get("links", []):
                if link.get("type") == "application/pdf":
                    pdf_url = link.get("href", "")
                    break

            summary = entry.get("summary", "")
            # Clean up arxiv summaries (they have lots of whitespace)
            summary = " ".join(summary.split())

            items.append(
                RawItem(
                    external_id=arxiv_id,
                    title=entry.get("title", "Untitled").replace("\n", " "),
                    url=entry.get("id", ""),
                    author=author_str or None,
                    content_raw=summary[:2000],
                    published_at=published,
                    extra={
                        "arxiv_id": arxiv_id,
                        "pdf_url": pdf_url,
                        "categories": [tag.get("term", "") for tag in entry.get("tags", [])],
                    },
                )
            )

        return items
