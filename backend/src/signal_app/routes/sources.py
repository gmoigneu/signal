import json

from fastapi import APIRouter, HTTPException

from signal_app.db import get_pool
from signal_app.models import SourceCreate, SourceOut, SourceUpdate

router = APIRouter()


def _source_health(error_count: int, last_fetched_at: object) -> str:
    if error_count >= 3:
        return "error"
    if error_count >= 1:
        return "warning"
    if last_fetched_at is None:
        return "stale"
    return "healthy"


def _row_to_source(row: dict, items_today: int = 0, total_items: int = 0) -> SourceOut:  # type: ignore[type-arg]
    return SourceOut(
        id=str(row["id"]),
        name=row["name"],
        source_type=row["source_type"],
        config=json.loads(row["config"]) if isinstance(row["config"], str) else (row["config"] or {}),
        enabled=row["enabled"],
        fetch_interval=str(row["fetch_interval"]),
        last_fetched_at=row["last_fetched_at"].isoformat() if row.get("last_fetched_at") else None,
        last_error=row.get("last_error"),
        error_count=row.get("error_count", 0),
        items_today=items_today,
        total_items=total_items,
        health=_source_health(row.get("error_count", 0), row.get("last_fetched_at")),
    )


@router.get("", response_model=list[SourceOut])
async def list_sources() -> list[SourceOut]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM sources ORDER BY name")
        result: list[SourceOut] = []
        for row in rows:
            total = await conn.fetchval("SELECT COUNT(*) FROM items WHERE source_id = $1", row["id"]) or 0
            today = (
                await conn.fetchval(
                    "SELECT COUNT(*) FROM items WHERE source_id = $1 AND published_at::date = CURRENT_DATE",
                    row["id"],
                )
                or 0
            )
            result.append(_row_to_source(dict(row), items_today=today, total_items=total))
    return result


@router.post("", response_model=SourceOut)
async def create_source(data: SourceCreate) -> SourceOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO sources (name, source_type, config, enabled, fetch_interval)
               VALUES ($1, $2, $3::jsonb, $4, $5::interval)
               RETURNING *""",
            data.name,
            data.source_type,
            json.dumps(data.config),
            data.enabled,
            data.fetch_interval,
        )
    return _row_to_source(dict(row))  # type: ignore[arg-type]


@router.get("/{source_id}", response_model=SourceOut)
async def get_source(source_id: str) -> SourceOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM sources WHERE id = $1::uuid", source_id)
        if not row:
            raise HTTPException(status_code=404, detail="Source not found")
        total = await conn.fetchval("SELECT COUNT(*) FROM items WHERE source_id = $1", row["id"]) or 0
        today = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM items WHERE source_id = $1 AND published_at::date = CURRENT_DATE",
                row["id"],
            )
            or 0
        )
    return _row_to_source(dict(row), items_today=today, total_items=total)


@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(source_id: str, data: SourceUpdate) -> SourceOut:
    pool = get_pool()
    sets: list[str] = []
    params: list[object] = []
    idx = 2

    if data.name is not None:
        sets.append(f"name = ${idx}")
        params.append(data.name)
        idx += 1
    if data.config is not None:
        sets.append(f"config = ${idx}::jsonb")
        params.append(json.dumps(data.config))
        idx += 1
    if data.enabled is not None:
        sets.append(f"enabled = ${idx}")
        params.append(data.enabled)
        idx += 1
    if data.fetch_interval is not None:
        sets.append(f"fetch_interval = ${idx}::interval")
        params.append(data.fetch_interval)
        idx += 1

    if not sets:
        return await get_source(source_id)

    sets.append("updated_at = now()")
    async with pool.acquire() as conn:
        await conn.execute(
            f"UPDATE sources SET {', '.join(sets)} WHERE id = $1::uuid",
            source_id,
            *params,
        )
    return await get_source(source_id)


@router.delete("/{source_id}")
async def delete_source(source_id: str) -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM sources WHERE id = $1::uuid", source_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Source not found")
    return {"status": "deleted"}
