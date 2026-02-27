import json

from fastapi import APIRouter, HTTPException, Query

from signal_app.db import get_pool
from signal_app.models import CategoryOut, ItemOut, ItemStats, ItemUpdate, ManualItemCreate, PaginatedItems

router = APIRouter()


def _row_to_item(row: dict, categories: list[dict]) -> ItemOut:  # type: ignore[type-arg]
    return ItemOut(
        id=str(row["id"]),
        source_id=str(row["source_id"]),
        source_name=row.get("source_name", ""),
        source_type=row.get("source_type", ""),
        title=row["title"],
        url=row["url"],
        author=row.get("author"),
        summary=row.get("summary"),
        thumbnail_url=row.get("thumbnail_url"),
        published_at=row["published_at"].isoformat() if row.get("published_at") else None,
        fetched_at=row["fetched_at"].isoformat() if row.get("fetched_at") else "",
        is_read=row.get("is_read", False),
        is_starred=row.get("is_starred", False),
        star_note=row.get("star_note"),
        categories=[CategoryOut(**c) for c in categories],
        extra=json.loads(row["extra"]) if isinstance(row.get("extra"), str) else (row.get("extra") or {}),
    )


@router.get("", response_model=PaginatedItems)
async def list_items(
    date: str | None = Query(None, description="YYYY-MM-DD"),
    source_id: str | None = None,
    category: str | None = None,
    is_starred: bool | None = None,
    is_read: bool | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    items_per_page: int = Query(50, ge=1, le=200),
) -> PaginatedItems:
    pool = get_pool()
    conditions: list[str] = []
    params: list[object] = []
    idx = 1

    if date:
        from datetime import date as date_type

        conditions.append(f"i.published_at::date = ${idx}")
        params.append(date_type.fromisoformat(date))
        idx += 1
    if source_id:
        conditions.append(f"i.source_id = ${idx}::uuid")
        params.append(source_id)
        idx += 1
    if is_starred is not None:
        conditions.append(f"i.is_starred = ${idx}")
        params.append(is_starred)
        idx += 1
    if is_read is not None:
        conditions.append(f"i.is_read = ${idx}")
        params.append(is_read)
        idx += 1
    if search:
        conditions.append(f"(i.title ILIKE ${idx} OR i.summary ILIKE ${idx})")
        params.append(f"%{search}%")
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # Category filter via subquery
    if category:
        conditions.append(
            f"i.id IN (SELECT ic.item_id FROM item_categories ic"
            f" JOIN categories c ON ic.category_id = c.id WHERE c.slug = ${idx})"
        )
        params.append(category)
        idx += 1
        where = "WHERE " + " AND ".join(conditions)

    async with pool.acquire() as conn:
        count_row = await conn.fetchval(f"SELECT COUNT(*) FROM items i {where}", *params)
        total_items = count_row or 0
        total_pages = max(1, (total_items + items_per_page - 1) // items_per_page)
        offset = (page - 1) * items_per_page

        rows = await conn.fetch(
            f"""SELECT i.*, s.name as source_name, s.source_type
                FROM items i
                JOIN sources s ON i.source_id = s.id
                {where}
                ORDER BY
                    CASE WHEN s.source_type = 'youtube_search' THEN 1 ELSE 0 END,
                    i.published_at DESC NULLS LAST
                LIMIT ${idx} OFFSET ${idx + 1}""",
            *params,
            items_per_page,
            offset,
        )

        items_out: list[ItemOut] = []
        for row in rows:
            cat_rows = await conn.fetch(
                """SELECT c.id, c.name, c.slug, c.color, c.sort_order
                   FROM categories c
                   JOIN item_categories ic ON ic.category_id = c.id
                   WHERE ic.item_id = $1
                   ORDER BY c.sort_order""",
                row["id"],
            )
            cats = [dict(r) for r in cat_rows]
            for cat in cats:
                cat["id"] = str(cat["id"])
            items_out.append(_row_to_item(dict(row), cats))

    return PaginatedItems(
        items=items_out,
        total_items=total_items,
        page=page,
        items_per_page=items_per_page,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=ItemStats)
async def item_stats(
    date: str | None = Query(None, description="YYYY-MM-DD — defaults to server today"),
) -> ItemStats:
    pool = get_pool()
    from datetime import date as date_type

    today_date = date_type.fromisoformat(date) if date else date_type.today()
    async with pool.acquire() as conn:
        today_count = await conn.fetchval("SELECT COUNT(*) FROM items WHERE published_at::date = $1", today_date) or 0
        unread_count = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM items WHERE is_read = false AND published_at::date = $1", today_date
            )
            or 0
        )
        starred_count = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM items WHERE is_starred = true AND published_at::date = $1", today_date
            )
            or 0
        )
        sources_total = await conn.fetchval("SELECT COUNT(*) FROM sources") or 0
        sources_healthy = (
            await conn.fetchval("SELECT COUNT(*) FROM sources WHERE enabled = true AND error_count < 3") or 0
        )

    return ItemStats(
        today_count=today_count,
        unread_count=unread_count,
        starred_count=starred_count,
        sources_healthy=sources_healthy,
        sources_total=sources_total,
    )


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(item_id: str) -> ItemOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT i.*, s.name as source_name, s.source_type
               FROM items i JOIN sources s ON i.source_id = s.id
               WHERE i.id = $1::uuid""",
            item_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        cat_rows = await conn.fetch(
            """SELECT c.id, c.name, c.slug, c.color, c.sort_order
               FROM categories c JOIN item_categories ic ON ic.category_id = c.id
               WHERE ic.item_id = $1 ORDER BY c.sort_order""",
            row["id"],
        )
        cats = [dict(r) for r in cat_rows]
        for cat in cats:
            cat["id"] = str(cat["id"])
    return _row_to_item(dict(row), cats)


@router.patch("/{item_id}", response_model=ItemOut)
async def update_item(item_id: str, data: ItemUpdate) -> ItemOut:
    pool = get_pool()
    sets: list[str] = []
    params: list[object] = []
    idx = 2  # $1 is item_id

    if data.is_read is not None:
        sets.append(f"is_read = ${idx}")
        params.append(data.is_read)
        idx += 1
    if data.is_starred is not None:
        sets.append(f"is_starred = ${idx}")
        params.append(data.is_starred)
        idx += 1
    if data.star_note is not None:
        sets.append(f"star_note = ${idx}")
        params.append(data.star_note)
        idx += 1

    if sets:
        sets.append("updated_at = now()")
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE items SET {', '.join(sets)} WHERE id = $1::uuid",
                item_id,
                *params,
            )

    if data.category_ids is not None:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM item_categories WHERE item_id = $1::uuid", item_id)
            for cat_id in data.category_ids:
                await conn.execute(
                    "INSERT INTO item_categories (item_id, category_id, is_auto)"
                    " VALUES ($1::uuid, $2::uuid, false) ON CONFLICT DO NOTHING",
                    item_id,
                    cat_id,
                )

    return await get_item(item_id)


@router.post("/manual", response_model=ItemOut)
async def add_manual_item(data: ManualItemCreate) -> ItemOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        # Find or create manual source
        source = await conn.fetchrow(
            "SELECT id FROM sources WHERE source_type = 'manual' AND name = $1",
            data.source_name,
        )
        if not source:
            source = await conn.fetchrow(
                """INSERT INTO sources (name, source_type, config, enabled)
                   VALUES ($1, 'manual', '{}', true)
                   RETURNING id""",
                data.source_name,
            )
        source_id = source["id"]  # type: ignore[index]

        row = await conn.fetchrow(
            """INSERT INTO items (source_id, title, url, content_raw, published_at)
               VALUES ($1, $2, $3, $4, now())
               ON CONFLICT (url) DO NOTHING
               RETURNING id""",
            source_id,
            data.title,
            data.url,
            data.content_raw,
        )
        if not row:
            raise HTTPException(status_code=409, detail="Item with this URL already exists")

    return await get_item(str(row["id"]))
