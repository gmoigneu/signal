import json

from fastapi import APIRouter

from signal_app.db import get_pool
from signal_app.models import SettingsOut, SettingsUpdate

router = APIRouter()


@router.get("", response_model=SettingsOut)
async def get_settings() -> SettingsOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        cron_row = await conn.fetchrow("SELECT value FROM app_settings WHERE key = 'pipeline_cron'")
        keywords_row = await conn.fetchrow("SELECT value FROM app_settings WHERE key = 'youtube_keywords'")

    cron = json.loads(cron_row["value"]) if cron_row else "0 6,18 * * *"
    keywords = json.loads(keywords_row["value"]) if keywords_row else []

    return SettingsOut(pipeline_cron=cron, youtube_keywords=keywords)


@router.patch("", response_model=SettingsOut)
async def update_settings(data: SettingsUpdate) -> SettingsOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        if data.pipeline_cron is not None:
            await conn.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES ('pipeline_cron', $1::jsonb, now())
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
                json.dumps(data.pipeline_cron),
            )
        if data.youtube_keywords is not None:
            await conn.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES ('youtube_keywords', $1::jsonb, now())
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
                json.dumps(data.youtube_keywords),
            )

    return await get_settings()
