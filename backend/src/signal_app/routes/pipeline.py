import asyncio
import json

from fastapi import APIRouter

from signal_app.db import get_pool
from signal_app.models import PipelineRunOut, PipelineStatus

router = APIRouter()

_running = False
_background_task: asyncio.Task[None] | None = None


@router.post("/run")
async def trigger_pipeline() -> dict[str, str]:
    global _running, _background_task
    if _running:
        return {"status": "already_running"}

    from signal_app.pipeline.orchestrator import run_pipeline

    _running = True
    try:
        _background_task = asyncio.create_task(_run_and_reset(run_pipeline))
    except Exception:
        _running = False
        raise
    return {"status": "started"}


async def _run_and_reset(fn):  # type: ignore[no-untyped-def]
    global _running
    try:
        await fn()
    finally:
        _running = False


@router.get("/status", response_model=PipelineStatus)
async def pipeline_status() -> PipelineStatus:
    pool = get_pool()
    async with pool.acquire() as conn:
        last = await conn.fetchrow("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1")
    return PipelineStatus(
        is_running=_running,
        last_run_at=last["started_at"].isoformat() if last else None,
        last_run_status=last["status"] if last else None,
        last_run_items_new=last["items_new"] if last else None,
        next_run_at=None,
    )


@router.get("/runs", response_model=list[PipelineRunOut])
async def list_runs() -> list[PipelineRunOut]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 20")
    result: list[PipelineRunOut] = []
    for r in rows:
        errors_data = r.get("errors")
        if isinstance(errors_data, str):
            errors_data = json.loads(errors_data)
        error_count = len(errors_data) if isinstance(errors_data, list) else 0
        result.append(
            PipelineRunOut(
                id=str(r["id"]),
                started_at=r["started_at"].isoformat(),
                completed_at=r["completed_at"].isoformat() if r["completed_at"] else None,
                status=r["status"],
                items_fetched=r["items_fetched"],
                items_new=r["items_new"],
                items_summarized=r["items_summarized"],
                errors=error_count,
                trigger=r["trigger"],
            )
        )
    return result
