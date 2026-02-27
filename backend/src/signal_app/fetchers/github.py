import contextlib
import logging

import httpx
from dateutil.parser import parse as parse_date

from signal_app.config import get_settings
from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)


class GitHubReleasesFetcher(BaseFetcher):
    async def fetch(self) -> list[RawItem]:
        owner = self.config.get("owner", "")
        repo = self.config.get("repo", "")

        if not owner or not repo:
            return []

        url = f"https://api.github.com/repos/{owner}/{repo}/releases"
        headers: dict[str, str] = {"Accept": "application/vnd.github+json"}

        settings = get_settings()
        if settings.github_token:
            headers["Authorization"] = f"Bearer {settings.github_token}"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers, params={"per_page": 20})
            response.raise_for_status()

        releases = response.json()
        items: list[RawItem] = []

        for release in releases[:20]:
            published = None
            date_str = release.get("published_at") or release.get("created_at")
            if date_str:
                with contextlib.suppress(ValueError, TypeError):
                    published = parse_date(date_str)

            body = release.get("body", "") or ""

            items.append(
                RawItem(
                    external_id=str(release.get("id", "")),
                    title=f"{owner}/{repo}: {release.get('name') or release.get('tag_name', 'Unknown')}",
                    url=release.get("html_url", ""),
                    author=release.get("author", {}).get("login"),
                    content_raw=body[:2000],
                    published_at=published,
                    extra={
                        "tag_name": release.get("tag_name"),
                        "prerelease": release.get("prerelease", False),
                        "draft": release.get("draft", False),
                    },
                )
            )

        return items
