import json

from fastapi import APIRouter, HTTPException

from signal_app.db import get_pool
from signal_app.models import ChannelSuggestionOut

router = APIRouter()


@router.get("/channels", response_model=list[ChannelSuggestionOut])
async def list_suggestions() -> list[ChannelSuggestionOut]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM youtube_channel_suggestions
               WHERE status = 'pending'
               ORDER BY appearance_count DESC"""
        )
    return [
        ChannelSuggestionOut(
            id=str(r["id"]),
            channel_id=r["channel_id"],
            channel_name=r["channel_name"],
            channel_url=r["channel_url"],
            subscriber_count=r["subscriber_count"],
            video_count=r["video_count"],
            appearance_count=r["appearance_count"],
            sample_videos=(
                json.loads(r["sample_videos"]) if isinstance(r["sample_videos"], str) else (r["sample_videos"] or [])
            ),
            status=r["status"],
        )
        for r in rows
    ]


@router.post("/channels/{suggestion_id}/accept")
async def accept_channel(suggestion_id: str) -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM youtube_channel_suggestions WHERE id = $1::uuid",
            suggestion_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Suggestion not found")

        # Create a new youtube_channel source
        await conn.execute(
            """INSERT INTO sources (name, source_type, config, enabled)
               VALUES ($1, 'youtube_channel', $2::jsonb, true)""",
            row["channel_name"],
            json.dumps({"channel_id": row["channel_id"]}),
        )

        await conn.execute(
            "UPDATE youtube_channel_suggestions SET status = 'accepted', updated_at = now() WHERE id = $1::uuid",
            suggestion_id,
        )
    return {"status": "accepted"}


@router.post("/channels/{suggestion_id}/dismiss")
async def dismiss_channel(suggestion_id: str) -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE youtube_channel_suggestions SET status = 'dismissed', updated_at = now() WHERE id = $1::uuid",
            suggestion_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Suggestion not found")
    return {"status": "dismissed"}


@router.post("/refresh")
async def refresh_discovery() -> dict[str, int]:
    from signal_app.discovery.youtube import process_youtube_discoveries

    count = await process_youtube_discoveries()
    return {"suggestions_updated": count}
