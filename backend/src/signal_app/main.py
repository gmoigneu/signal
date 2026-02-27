import contextlib
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from signal_app import db
from signal_app.config import get_settings
from signal_app.routes import categories, discovery, health, items, pipeline, reviews, settings, sources


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    s = get_settings()
    await db.init_pool(s.database_url)

    # Start pipeline scheduler
    from signal_app.pipeline.scheduler import start_scheduler, stop_scheduler

    await start_scheduler(s.pipeline_cron)
    yield
    await stop_scheduler()
    await db.close_pool()


app = FastAPI(title="Signal", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["discovery"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
