import asyncio
import logging
from datetime import UTC, datetime

from croniter import croniter

from signal_app.pipeline.orchestrator import run_pipeline

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None  # type: ignore[type-arg]
_running = False


async def start_scheduler(cron_expression: str = "0 6,18 * * *") -> None:
    """Start a simple cron-based scheduler using asyncio."""
    global _task, _running
    _running = True
    _task = asyncio.create_task(_cron_loop(cron_expression))
    logger.info("Scheduler started with cron: %s", cron_expression)


async def stop_scheduler() -> None:
    global _task, _running
    _running = False
    if _task:
        _task.cancel()
        _task = None
    logger.info("Scheduler stopped")


async def _cron_loop(cron_expression: str) -> None:
    """Simple cron loop — sleep until next run, then execute pipeline."""
    while _running:
        try:
            now = datetime.now(tz=UTC)
            cron = croniter(cron_expression, now)
            next_run = cron.get_next(datetime)
            delay = (next_run - now).total_seconds()

            logger.info("Next pipeline run scheduled at %s (in %.0fs)", next_run.isoformat(), delay)
            await asyncio.sleep(delay)

            if _running:
                try:
                    await run_pipeline(trigger="scheduled")
                except Exception:
                    logger.exception("Scheduled pipeline run failed")
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Scheduler loop error")
            await asyncio.sleep(60)
