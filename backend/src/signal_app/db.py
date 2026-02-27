import asyncio
import logging

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool(database_url: str, retries: int = 10, delay: float = 2.0) -> asyncpg.Pool:
    global _pool
    for attempt in range(1, retries + 1):
        try:
            _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
            logger.info("Database pool ready")
            return _pool
        except (OSError, asyncpg.PostgresError) as exc:
            if attempt == retries:
                raise
            logger.warning("DB connection attempt %d/%d failed: %s — retrying in %.0fs", attempt, retries, exc, delay)
            await asyncio.sleep(delay)
    raise RuntimeError("Unreachable")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")
    return _pool
