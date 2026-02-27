import contextlib
import logging

import httpx
from dateutil.parser import parse as parse_date

from signal_app.fetchers.base import BaseFetcher, RawItem

logger = logging.getLogger(__name__)

BSKY_PUBLIC_API = "https://public.api.bsky.app/xrpc"


class BlueskyFetcher(BaseFetcher):
    """Fetches recent posts from a Bluesky account using the public API."""

    async def fetch(self) -> list[RawItem]:
        handle = self.config.get("handle", "")
        if not handle:
            return []

        async with httpx.AsyncClient(timeout=30) as client:
            # Resolve handle to DID
            resp = await client.get(
                f"{BSKY_PUBLIC_API}/com.atproto.identity.resolveHandle",
                params={"handle": handle},
            )
            resp.raise_for_status()
            did = resp.json().get("did", "")

            if not did:
                logger.warning("Could not resolve Bluesky handle: %s", handle)
                return []

            # Get author feed
            resp = await client.get(
                f"{BSKY_PUBLIC_API}/app.bsky.feed.getAuthorFeed",
                params={"actor": did, "limit": 30, "filter": "posts_no_replies"},
            )
            resp.raise_for_status()
            data = resp.json()

        items: list[RawItem] = []

        for feed_item in data.get("feed", []):
            post = feed_item.get("post", {})
            record = post.get("record", {})
            author_info = post.get("author", {})

            text = record.get("text", "")
            if not text:
                continue

            published = None
            if record.get("createdAt"):
                with contextlib.suppress(ValueError, TypeError):
                    published = parse_date(record["createdAt"])

            # Build the post URL
            uri = post.get("uri", "")
            rkey = uri.split("/")[-1] if uri else ""
            post_url = f"https://bsky.app/profile/{handle}/post/{rkey}" if rkey else ""

            # Extract any embedded links
            embed = post.get("embed", {})
            external_url = ""
            if embed.get("$type") == "app.bsky.embed.external#view":
                external = embed.get("external", {})
                external_url = external.get("uri", "")

            # Extract images
            thumbnail = None
            if embed.get("$type") == "app.bsky.embed.images#view":
                images = embed.get("images", [])
                if images:
                    thumbnail = images[0].get("thumb")

            items.append(
                RawItem(
                    external_id=uri,
                    title=text[:120] + ("..." if len(text) > 120 else ""),
                    url=external_url or post_url,
                    author=author_info.get("displayName") or author_info.get("handle"),
                    content_raw=text[:2000],
                    thumbnail_url=thumbnail,
                    published_at=published,
                    extra={
                        "bsky_url": post_url,
                        "like_count": post.get("likeCount", 0),
                        "repost_count": post.get("repostCount", 0),
                        "reply_count": post.get("replyCount", 0),
                        "handle": handle,
                    },
                )
            )

        return items
