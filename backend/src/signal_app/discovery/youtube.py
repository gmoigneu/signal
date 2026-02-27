import json
import logging

from signal_app.db import get_pool

logger = logging.getLogger(__name__)


async def process_youtube_discoveries() -> int:
    """Post-process YouTube search results to discover new channels.

    Scans items from youtube_search sources, extracts channel info,
    and upserts into youtube_channel_suggestions for channels not yet tracked.

    Returns number of new/updated suggestions.
    """
    pool = get_pool()
    updated = 0

    async with pool.acquire() as conn:
        # Get all tracked channel IDs (already sources)
        tracked_rows = await conn.fetch("SELECT config FROM sources WHERE source_type = 'youtube_channel'")
        tracked_channel_ids: set[str] = set()
        for row in tracked_rows:
            config = row["config"] if isinstance(row["config"], dict) else json.loads(row["config"])
            cid = config.get("channel_id", "")
            if cid:
                tracked_channel_ids.add(cid)

        # Get recent YouTube search items with channel info
        items = await conn.fetch(
            """SELECT extra FROM items
               WHERE extra->>'channel_id' IS NOT NULL
                 AND extra->>'search_keyword' IS NOT NULL
                 AND created_at > now() - interval '30 days'"""
        )

        # Count appearances per channel
        channel_data: dict[str, dict[str, object]] = {}
        for item in items:
            extra = item["extra"] if isinstance(item["extra"], dict) else json.loads(item["extra"])
            channel_id = extra.get("channel_id", "")
            channel_title = extra.get("channel_title", "")
            video_id = extra.get("video_id", "")

            if not channel_id or channel_id in tracked_channel_ids:
                continue

            if channel_id not in channel_data:
                channel_data[channel_id] = {
                    "channel_id": channel_id,
                    "channel_name": channel_title,
                    "channel_url": f"https://www.youtube.com/channel/{channel_id}",
                    "appearance_count": 0,
                    "sample_videos": [],
                }

            channel_data[channel_id]["appearance_count"] += 1  # type: ignore[operator]
            videos = channel_data[channel_id]["sample_videos"]
            if isinstance(videos, list) and len(videos) < 5 and video_id:
                videos.append(video_id)

        # Upsert suggestions
        for _channel_id, data in channel_data.items():
            await conn.execute(
                """INSERT INTO youtube_channel_suggestions
                       (channel_id, channel_name, channel_url, appearance_count, sample_videos)
                   VALUES ($1, $2, $3, $4, $5::jsonb)
                   ON CONFLICT (channel_id) DO UPDATE SET
                       appearance_count = youtube_channel_suggestions.appearance_count + EXCLUDED.appearance_count,
                       sample_videos = EXCLUDED.sample_videos,
                       updated_at = now()
                   WHERE youtube_channel_suggestions.status = 'pending'""",
                data["channel_id"],
                data["channel_name"],
                data["channel_url"],
                data["appearance_count"],
                json.dumps(data["sample_videos"]),
            )
            updated += 1

    logger.info("YouTube discovery: processed %d channel suggestions", updated)
    return updated
