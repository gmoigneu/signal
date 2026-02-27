from pydantic import BaseModel


# --- Categories ---
class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    color: str | None = None
    sort_order: int


class CategoryCreate(BaseModel):
    name: str
    slug: str
    color: str | None = None
    sort_order: int = 0


# --- Sources ---
class SourceOut(BaseModel):
    id: str
    name: str
    source_type: str
    config: dict  # type: ignore[type-arg]
    enabled: bool
    fetch_interval: str
    last_fetched_at: str | None = None
    last_error: str | None = None
    error_count: int
    items_today: int = 0
    total_items: int = 0
    health: str = "healthy"


class SourceCreate(BaseModel):
    name: str
    source_type: str
    config: dict  # type: ignore[type-arg]
    enabled: bool = True
    fetch_interval: str = "12 hours"


class SourceUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None  # type: ignore[type-arg]
    enabled: bool | None = None
    fetch_interval: str | None = None


# --- Items ---
class ItemOut(BaseModel):
    id: str
    source_id: str
    source_name: str
    source_type: str
    title: str
    url: str
    author: str | None = None
    summary: str | None = None
    thumbnail_url: str | None = None
    published_at: str | None = None
    fetched_at: str
    is_read: bool
    is_starred: bool
    star_note: str | None = None
    categories: list[CategoryOut]
    extra: dict  # type: ignore[type-arg]


class ItemUpdate(BaseModel):
    is_read: bool | None = None
    is_starred: bool | None = None
    star_note: str | None = None
    category_ids: list[str] | None = None


class ManualItemCreate(BaseModel):
    title: str
    url: str
    content_raw: str | None = None
    source_name: str = "Manual"


class PaginatedItems(BaseModel):
    items: list[ItemOut]
    total_items: int
    page: int
    items_per_page: int
    total_pages: int


class ItemStats(BaseModel):
    today_count: int
    unread_count: int
    starred_count: int
    sources_healthy: int
    sources_total: int


# --- Pipeline ---
class PipelineRunOut(BaseModel):
    id: str
    started_at: str
    completed_at: str | None = None
    status: str
    items_fetched: int
    items_new: int
    items_summarized: int
    errors: int
    trigger: str


class PipelineStatus(BaseModel):
    is_running: bool
    last_run_at: str | None = None
    last_run_status: str | None = None
    last_run_items_new: int | None = None
    next_run_at: str | None = None


# --- Weekly Reviews ---
class WeeklyReviewOut(BaseModel):
    id: str
    week_start: str
    week_end: str
    title: str | None = None
    markdown: str
    item_count: int
    generated_at: str


class ReviewGenerate(BaseModel):
    week_start: str
    week_end: str
    title: str | None = None


class ReviewUpdate(BaseModel):
    markdown: str | None = None
    title: str | None = None


# --- YouTube Discovery ---
class ChannelSuggestionOut(BaseModel):
    id: str
    channel_id: str
    channel_name: str
    channel_url: str
    subscriber_count: int | None = None
    video_count: int | None = None
    appearance_count: int
    sample_videos: list[dict]  # type: ignore[type-arg]
    status: str


# --- Settings ---
class SettingsOut(BaseModel):
    pipeline_cron: str
    youtube_keywords: list[str]


class SettingsUpdate(BaseModel):
    pipeline_cron: str | None = None
    youtube_keywords: list[str] | None = None
