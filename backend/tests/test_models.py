"""Tests for Pydantic models."""

from signal_app.models import (
    CategoryCreate,
    CategoryOut,
    ChannelSuggestionOut,
    ItemOut,
    ItemStats,
    ItemUpdate,
    ManualItemCreate,
    PaginatedItems,
    PipelineRunOut,
    PipelineStatus,
    ReviewGenerate,
    ReviewUpdate,
    SettingsOut,
    SettingsUpdate,
    SourceCreate,
    SourceOut,
    SourceUpdate,
    WeeklyReviewOut,
)


class TestItemModels:
    def test_item_out_minimal(self):
        item = ItemOut(
            id="abc",
            source_id="src-1",
            source_name="Test",
            source_type="rss",
            title="Test Item",
            url="https://example.com",
            fetched_at="2026-02-26T00:00:00",
            is_read=False,
            is_starred=False,
            categories=[],
            extra={},
        )
        assert item.id == "abc"
        assert item.author is None
        assert item.summary is None
        assert item.categories == []

    def test_item_out_full(self):
        cat = CategoryOut(id="c1", name="Test", slug="test", color="#000", sort_order=1)
        item = ItemOut(
            id="abc",
            source_id="src-1",
            source_name="Test",
            source_type="rss",
            title="Test Item",
            url="https://example.com",
            author="Author",
            summary="Summary",
            thumbnail_url="https://img.example.com/thumb.jpg",
            published_at="2026-02-26T10:00:00",
            fetched_at="2026-02-26T12:00:00",
            is_read=True,
            is_starred=True,
            star_note="Great article",
            categories=[cat],
            extra={"score": 100},
        )
        assert item.is_starred is True
        assert item.star_note == "Great article"
        assert len(item.categories) == 1
        assert item.extra["score"] == 100

    def test_item_update_partial(self):
        update = ItemUpdate(is_read=True)
        assert update.is_read is True
        assert update.is_starred is None
        assert update.star_note is None
        assert update.category_ids is None

    def test_item_update_full(self):
        update = ItemUpdate(
            is_read=True,
            is_starred=True,
            star_note="Note",
            category_ids=["c1", "c2"],
        )
        assert update.category_ids == ["c1", "c2"]

    def test_manual_item_create_defaults(self):
        item = ManualItemCreate(title="Test", url="https://example.com")
        assert item.source_name == "Manual"
        assert item.content_raw is None

    def test_paginated_items(self):
        page = PaginatedItems(items=[], total_items=0, page=1, items_per_page=50, total_pages=1)
        assert page.total_pages == 1
        assert page.items == []

    def test_item_stats(self):
        stats = ItemStats(today_count=10, unread_count=5, starred_count=2, sources_healthy=38, sources_total=40)
        assert stats.today_count == 10


class TestSourceModels:
    def test_source_out(self):
        source = SourceOut(
            id="s1",
            name="Test Source",
            source_type="rss",
            config={"feed_url": "https://example.com/feed"},
            enabled=True,
            fetch_interval="12 hours",
            error_count=0,
        )
        assert source.health == "healthy"
        assert source.items_today == 0

    def test_source_create_defaults(self):
        source = SourceCreate(name="New", source_type="rss", config={"feed_url": "https://example.com/rss"})
        assert source.enabled is True
        assert source.fetch_interval == "12 hours"

    def test_source_update_partial(self):
        update = SourceUpdate(enabled=False)
        assert update.enabled is False
        assert update.name is None


class TestCategoryModels:
    def test_category_out(self):
        cat = CategoryOut(id="c1", name="Test", slug="test", sort_order=1)
        assert cat.color is None

    def test_category_create_defaults(self):
        cat = CategoryCreate(name="Test", slug="test")
        assert cat.sort_order == 0
        assert cat.color is None


class TestPipelineModels:
    def test_pipeline_run_out(self):
        run = PipelineRunOut(
            id="r1",
            started_at="2026-02-26T06:00:00",
            status="completed",
            items_fetched=100,
            items_new=20,
            items_summarized=20,
            errors=0,
            trigger="scheduled",
        )
        assert run.completed_at is None

    def test_pipeline_status(self):
        status = PipelineStatus(is_running=False)
        assert status.last_run_at is None
        assert status.next_run_at is None


class TestReviewModels:
    def test_weekly_review_out(self):
        review = WeeklyReviewOut(
            id="w1",
            week_start="2026-02-17",
            week_end="2026-02-23",
            markdown="# Review",
            item_count=10,
            generated_at="2026-02-24T00:00:00",
        )
        assert review.title is None

    def test_review_generate(self):
        gen = ReviewGenerate(week_start="2026-02-17", week_end="2026-02-23")
        assert gen.title is None

    def test_review_update(self):
        update = ReviewUpdate(markdown="# Updated")
        assert update.title is None


class TestDiscoveryModels:
    def test_channel_suggestion(self):
        suggestion = ChannelSuggestionOut(
            id="ch1",
            channel_id="UC123",
            channel_name="Test Channel",
            channel_url="https://youtube.com/channel/UC123",
            appearance_count=5,
            sample_videos=[],
            status="pending",
        )
        assert suggestion.subscriber_count is None
        assert suggestion.video_count is None


class TestSettingsModels:
    def test_settings_out(self):
        s = SettingsOut(pipeline_cron="0 6,18 * * *", youtube_keywords=["AI", "LLM"])
        assert len(s.youtube_keywords) == 2

    def test_settings_update_partial(self):
        update = SettingsUpdate(youtube_keywords=["new"])
        assert update.pipeline_cron is None
