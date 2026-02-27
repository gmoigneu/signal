from fastapi import APIRouter

from signal_app.db import get_pool

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "ok"}
