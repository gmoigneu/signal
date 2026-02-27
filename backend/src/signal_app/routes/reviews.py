from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from signal_app.db import get_pool
from signal_app.models import ReviewGenerate, ReviewUpdate, WeeklyReviewOut

router = APIRouter()


@router.get("", response_model=list[WeeklyReviewOut])
async def list_reviews() -> list[WeeklyReviewOut]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM weekly_reviews ORDER BY week_start DESC LIMIT 20")
    return [
        WeeklyReviewOut(
            id=str(r["id"]),
            week_start=r["week_start"].isoformat(),
            week_end=r["week_end"].isoformat(),
            title=r["title"],
            markdown=r["markdown"],
            item_count=r["item_count"],
            generated_at=r["generated_at"].isoformat(),
        )
        for r in rows
    ]


@router.post("/generate", response_model=WeeklyReviewOut)
async def generate_review(data: ReviewGenerate) -> WeeklyReviewOut:
    from signal_app.weekly.generator import generate_weekly_review

    pool = get_pool()
    async with pool.acquire() as conn:
        starred = await conn.fetch(
            """SELECT i.*, s.name as source_name, s.source_type
               FROM items i
               JOIN sources s ON i.source_id = s.id
               WHERE i.is_starred = true
                 AND i.published_at::date >= $1::date
                 AND i.published_at::date <= $2::date
               ORDER BY i.published_at DESC""",
            data.week_start,
            data.week_end,
        )

        if not starred:
            raise HTTPException(status_code=400, detail="No starred items in this date range")

        items_for_review: list[dict[str, object]] = []
        for row in starred:
            cat_rows = await conn.fetch(
                """SELECT c.name FROM categories c
                   JOIN item_categories ic ON ic.category_id = c.id
                   WHERE ic.item_id = $1""",
                row["id"],
            )
            items_for_review.append(
                {
                    "title": row["title"],
                    "url": row["url"],
                    "summary": row["summary"] or "",
                    "source_name": row["source_name"],
                    "star_note": row["star_note"] or "",
                    "categories": [r["name"] for r in cat_rows] or ["Uncategorized"],
                }
            )

    title = data.title or f"AI Intelligence Review: {data.week_start} to {data.week_end}"
    markdown = await generate_weekly_review(items_for_review, data.week_start, data.week_end, title)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO weekly_reviews (week_start, week_end, title, markdown, item_count)
               VALUES ($1::date, $2::date, $3, $4, $5)
               ON CONFLICT (week_start) DO UPDATE SET
                 markdown = EXCLUDED.markdown,
                 title = EXCLUDED.title,
                 item_count = EXCLUDED.item_count,
                 generated_at = now()
               RETURNING *""",
            data.week_start,
            data.week_end,
            title,
            markdown,
            len(items_for_review),
        )

    return WeeklyReviewOut(
        id=str(row["id"]),  # type: ignore[index]
        week_start=row["week_start"].isoformat(),  # type: ignore[index]
        week_end=row["week_end"].isoformat(),  # type: ignore[index]
        title=row["title"],  # type: ignore[index]
        markdown=row["markdown"],  # type: ignore[index]
        item_count=row["item_count"],  # type: ignore[index]
        generated_at=row["generated_at"].isoformat(),  # type: ignore[index]
    )


@router.get("/{review_id}", response_model=WeeklyReviewOut)
async def get_review(review_id: str) -> WeeklyReviewOut:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM weekly_reviews WHERE id = $1::uuid", review_id)
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    return WeeklyReviewOut(
        id=str(row["id"]),
        week_start=row["week_start"].isoformat(),
        week_end=row["week_end"].isoformat(),
        title=row["title"],
        markdown=row["markdown"],
        item_count=row["item_count"],
        generated_at=row["generated_at"].isoformat(),
    )


@router.patch("/{review_id}", response_model=WeeklyReviewOut)
async def update_review(review_id: str, data: ReviewUpdate) -> WeeklyReviewOut:
    pool = get_pool()
    sets: list[str] = []
    params: list[object] = []
    idx = 2

    if data.markdown is not None:
        sets.append(f"markdown = ${idx}")
        params.append(data.markdown)
        idx += 1
    if data.title is not None:
        sets.append(f"title = ${idx}")
        params.append(data.title)
        idx += 1

    if sets:
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE weekly_reviews SET {', '.join(sets)} WHERE id = $1::uuid",
                review_id,
                *params,
            )

    return await get_review(review_id)


@router.get("/{review_id}/download")
async def download_review(review_id: str) -> PlainTextResponse:
    review = await get_review(review_id)
    return PlainTextResponse(
        content=review.markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="review-{review.week_start}.md"'},
    )
