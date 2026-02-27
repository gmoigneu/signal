from fastapi import APIRouter, HTTPException

from signal_app.db import get_pool
from signal_app.models import CategoryCreate, CategoryOut

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
async def list_categories() -> list[CategoryOut]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM categories ORDER BY sort_order")
    return [
        CategoryOut(id=str(r["id"]), name=r["name"], slug=r["slug"], color=r["color"], sort_order=r["sort_order"])
        for r in rows
    ]


@router.post("", response_model=CategoryOut)
async def create_category(data: CategoryCreate) -> CategoryOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO categories (name, slug, color, sort_order)
               VALUES ($1, $2, $3, $4)
               RETURNING *""",
            data.name,
            data.slug,
            data.color,
            data.sort_order,
        )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create category")
    return CategoryOut(
        id=str(row["id"]),
        name=row["name"],
        slug=row["slug"],
        color=row["color"],
        sort_order=row["sort_order"],
    )


@router.delete("/{category_id}")
async def delete_category(category_id: str) -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM item_categories WHERE category_id = $1::uuid", category_id)
        result = await conn.execute("DELETE FROM categories WHERE id = $1::uuid", category_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "deleted"}
