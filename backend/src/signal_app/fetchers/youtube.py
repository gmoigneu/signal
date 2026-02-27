import contextlib
import logging
import re
from datetime import UTC, datetime

import httpx
from dateutil.parser import parse as parse_date

from signal_app.config import get_settings
from signal_app.fetchers.base import BaseFetcher, RawItem

# Matches titles containing CJK, Arabic, Cyrillic, Thai, or Devanagari characters
_NON_LATIN_RE = re.compile(
    r"[\u0400-\u04FF"  # Cyrillic
    r"\u0600-\u06FF"  # Arabic
    r"\u0900-\u097F"  # Devanagari
    r"\u0E00-\u0E7F"  # Thai
    r"\u3000-\u9FFF"  # CJK (unified + symbols)
    r"\uAC00-\uD7AF"  # Korean Hangul
    r"]"
)

logger = logging.getLogger(__name__)

YOUTUBE_API = "https://www.googleapis.com/youtube/v3"


class YouTubeChannelFetcher(BaseFetcher):
    """Fetches latest videos from a specific YouTube channel."""

    async def fetch(self) -> list[RawItem]:
        settings = get_settings()
        api_key = settings.google_api_key
        if not api_key:
            logger.warning("No Google API key configured, skipping YouTube channel fetch")
            return []

        channel_id = self.config.get("channel_id")
        channel_handle = self.config.get("channel_handle")

        if not channel_id and not channel_handle:
            return []

        async with httpx.AsyncClient(timeout=30) as client:
            # Resolve handle to channel ID if needed
            if not channel_id and channel_handle:
                handle = channel_handle.lstrip("@")
                resp = await client.get(
                    f"{YOUTUBE_API}/channels",
                    params={"part": "id,contentDetails", "forHandle": handle, "key": api_key},
                )
                resp.raise_for_status()
                data = resp.json()
                channels = data.get("items", [])
                if not channels:
                    logger.warning("Could not resolve YouTube handle: %s", channel_handle)
                    return []
                channel_id = channels[0]["id"]

            # Get uploads playlist
            if not self.config.get("playlist_id"):
                resp = await client.get(
                    f"{YOUTUBE_API}/channels",
                    params={"part": "contentDetails", "id": channel_id, "key": api_key},
                )
                resp.raise_for_status()
                data = resp.json()
                channels = data.get("items", [])
                if not channels:
                    return []
                playlist_id = channels[0]["contentDetails"]["relatedPlaylists"]["uploads"]
            else:
                playlist_id = self.config["playlist_id"]

            # Get playlist items
            resp = await client.get(
                f"{YOUTUBE_API}/playlistItems",
                params={
                    "part": "snippet",
                    "playlistId": playlist_id,
                    "maxResults": 10,
                    "key": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        items: list[RawItem] = []
        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            video_id = snippet.get("resourceId", {}).get("videoId", "")

            published = None
            if snippet.get("publishedAt"):
                with contextlib.suppress(ValueError, TypeError):
                    published = parse_date(snippet["publishedAt"])

            thumbnails = snippet.get("thumbnails", {})
            thumbnail = (
                thumbnails.get("high", {}).get("url")
                or thumbnails.get("medium", {}).get("url")
                or thumbnails.get("default", {}).get("url")
            )

            items.append(
                RawItem(
                    external_id=video_id,
                    title=snippet.get("title", "Untitled"),
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    author=snippet.get("channelTitle"),
                    content_raw=(snippet.get("description") or "")[:2000],
                    thumbnail_url=thumbnail,
                    published_at=published,
                    extra={
                        "channel_id": snippet.get("channelId"),
                        "channel_title": snippet.get("channelTitle"),
                        "video_id": video_id,
                    },
                )
            )

        return items


class YouTubeSearchFetcher(BaseFetcher):
    """Searches YouTube for videos matching keywords."""

    async def fetch(self) -> list[RawItem]:
        settings = get_settings()
        api_key = settings.google_api_key
        if not api_key:
            logger.warning("No Google API key configured, skipping YouTube search")
            return []

        keywords = self.config.get("keywords", [])
        max_results = self.config.get("max_results", 10)
        min_views = self.config.get("min_views", 3000)

        if not keywords:
            return []

        all_items: list[RawItem] = []
        seen_ids: set[str] = set()

        async with httpx.AsyncClient(timeout=30) as client:
            for keyword in keywords:
                resp = await client.get(
                    f"{YOUTUBE_API}/search",
                    params={
                        "part": "snippet",
                        "q": keyword,
                        "type": "video",
                        "order": "date",
                        "maxResults": max_results,
                        "publishedAfter": _recent_date(),
                        "videoDuration": "medium",
                        "relevanceLanguage": "en",
                        "key": api_key,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                for item in data.get("items", []):
                    video_id = item.get("id", {}).get("videoId", "")
                    if not video_id or video_id in seen_ids:
                        continue
                    seen_ids.add(video_id)

                    snippet = item.get("snippet", {})
                    published = None
                    if snippet.get("publishedAt"):
                        with contextlib.suppress(ValueError, TypeError):
                            published = parse_date(snippet["publishedAt"])

                    thumbnails = snippet.get("thumbnails", {})
                    thumbnail = (
                        thumbnails.get("high", {}).get("url")
                        or thumbnails.get("medium", {}).get("url")
                        or thumbnails.get("default", {}).get("url")
                    )

                    all_items.append(
                        RawItem(
                            external_id=video_id,
                            title=snippet.get("title", "Untitled"),
                            url=f"https://www.youtube.com/watch?v={video_id}",
                            author=snippet.get("channelTitle"),
                            content_raw=(snippet.get("description") or "")[:2000],
                            thumbnail_url=thumbnail,
                            published_at=published,
                            extra={
                                "channel_id": snippet.get("channelId"),
                                "channel_title": snippet.get("channelTitle"),
                                "video_id": video_id,
                                "search_keyword": keyword,
                            },
                        )
                    )

        # Filter non-Latin titles
        all_items = [item for item in all_items if not _NON_LATIN_RE.search(item.title)]

        # Filter by minimum view count
        if min_views and all_items:
            view_counts = await _fetch_view_counts(
                [item.external_id for item in all_items], api_key
            )
            all_items = [
                item
                for item in all_items
                if view_counts.get(item.external_id, 0) >= min_views
            ]

        return all_items


async def _fetch_view_counts(video_ids: list[str], api_key: str) -> dict[str, int]:
    """Batch-fetch view counts from the YouTube videos endpoint (max 50 per call)."""
    counts: dict[str, int] = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            resp = await client.get(
                f"{YOUTUBE_API}/videos",
                params={
                    "part": "statistics",
                    "id": ",".join(batch),
                    "key": api_key,
                },
            )
            resp.raise_for_status()
            for item in resp.json().get("items", []):
                vid = item["id"]
                views = int(item.get("statistics", {}).get("viewCount", 0))
                counts[vid] = views
    return counts


def _recent_date() -> str:
    """Return ISO date for 7 days ago (YouTube search filter)."""
    from datetime import timedelta

    dt = datetime.now(tz=UTC) - timedelta(days=7)
    return dt.strftime("%Y-%m-%dT00:00:00Z")
