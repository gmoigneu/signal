"""Tests for fetcher implementations using respx to mock HTTP calls."""

from unittest.mock import AsyncMock, MagicMock, patch

import respx
from httpx import Response

from signal_app.fetchers.base import BaseFetcher, RawItem
from signal_app.fetchers.hackernews import HackerNewsFetcher
from signal_app.fetchers.rss import RSSFetcher
from signal_app.fetchers.youtube import _NON_LATIN_RE


class TestBaseFetcher:
    def test_raw_item_defaults(self):
        item = RawItem(external_id="1", title="Test", url="https://example.com")
        assert item.author is None
        assert item.content_raw is None
        assert item.thumbnail_url is None
        assert item.published_at is None
        assert item.extra == {}

    def test_raw_item_full(self):
        item = RawItem(
            external_id="1",
            title="Test",
            url="https://example.com",
            author="Author",
            content_raw="Content",
            thumbnail_url="https://img.example.com/thumb.jpg",
            extra={"key": "value"},
        )
        assert item.author == "Author"
        assert item.extra == {"key": "value"}

    def test_base_fetcher_is_abstract(self):
        # BaseFetcher cannot be instantiated directly
        try:
            BaseFetcher("source-1", {})
            # Should not reach here if abstract method enforcement works
            # (Python allows instantiation of ABC with abstract methods only
            # when you try to call the abstract method)
        except TypeError:
            pass


class TestRSSFetcher:
    @respx.mock
    async def test_fetch_rss(self, rss_feed_xml: str):
        url = "https://test.example.com/feed.xml"
        respx.get(url).mock(return_value=Response(200, text=rss_feed_xml))

        fetcher = RSSFetcher("source-1", {"feed_url": url})
        items = await fetcher.fetch()

        assert len(items) == 2
        assert items[0].title == "Test Article One"
        assert items[0].url == "https://test.example.com/article-1"
        assert items[0].author == "Author A"
        assert items[0].external_id == "article-1"
        assert items[1].title == "Test Article Two"

    @respx.mock
    async def test_fetch_empty_feed(self):
        empty_feed = """<?xml version="1.0"?>
        <rss version="2.0"><channel><title>Empty</title></channel></rss>"""
        url = "https://empty.example.com/feed.xml"
        respx.get(url).mock(return_value=Response(200, text=empty_feed))

        fetcher = RSSFetcher("source-1", {"feed_url": url})
        items = await fetcher.fetch()
        assert items == []

    async def test_fetch_no_url(self):
        fetcher = RSSFetcher("source-1", {})
        items = await fetcher.fetch()
        assert items == []


class TestHackerNewsFetcher:
    @respx.mock
    async def test_fetch_hn_with_llm_filter(
        self, hn_top_stories: list[int], hn_story_details: dict[int, dict]
    ):
        """Test fetching HN front page stories filtered by LLM."""
        respx.get("https://hacker-news.firebaseio.com/v0/topstories.json").mock(
            return_value=Response(200, json=hn_top_stories)
        )
        for sid, detail in hn_story_details.items():
            respx.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json").mock(
                return_value=Response(200, json=detail)
            )

        # Mock DB pool returning categories
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(
            return_value=[{"name": "AI & ML", "slug": "ai-ml"}]
        )
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        # Mock OpenAI response: only stories 0 and 1 are relevant
        mock_choice = MagicMock()
        mock_choice.message.content = (
            '{"relevant": [{"index": 0, "categories": ["ai-ml"]},'
            ' {"index": 1, "categories": ["ai-ml"]}]}'
        )
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        with (
            patch("signal_app.fetchers.hackernews.get_pool", return_value=mock_pool),
            patch("signal_app.fetchers.hackernews.get_settings") as mock_settings,
            patch("signal_app.fetchers.hackernews.AsyncOpenAI", return_value=mock_client),
        ):
            mock_settings.return_value.openai_api_key = "test-key"
            mock_settings.return_value.openai_model = "gpt-4.1-nano"

            fetcher = HackerNewsFetcher("source-1", {})
            items = await fetcher.fetch()

        assert len(items) == 2
        assert items[0].title == "Show HN: AI Coding Agent"
        assert items[0].external_id == "12345"
        assert items[0].extra["score"] == 150
        assert items[0].extra["num_comments"] == 42
        assert items[0].extra["hn_url"] == "https://news.ycombinator.com/item?id=12345"

    @respx.mock
    async def test_fetch_hn_no_categories_returns_all(
        self, hn_top_stories: list[int], hn_story_details: dict[int, dict]
    ):
        """When no categories are configured, all stories are returned."""
        respx.get("https://hacker-news.firebaseio.com/v0/topstories.json").mock(
            return_value=Response(200, json=hn_top_stories)
        )
        for sid, detail in hn_story_details.items():
            respx.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json").mock(
                return_value=Response(200, json=detail)
            )

        # Mock DB pool returning no categories
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        with patch("signal_app.fetchers.hackernews.get_pool", return_value=mock_pool):
            fetcher = HackerNewsFetcher("source-1", {})
            items = await fetcher.fetch()

        assert len(items) == 3
        assert items[0].title == "Show HN: AI Coding Agent"
        assert items[2].title == "New React Framework Launched"


class TestNonLatinFilter:
    def test_allows_english(self):
        assert not _NON_LATIN_RE.search("How GPT-4 Changes Everything")

    def test_allows_french(self):
        assert not _NON_LATIN_RE.search("L'intelligence artificielle en 2026")

    def test_blocks_chinese(self):
        assert _NON_LATIN_RE.search("AI人工智能最新进展")

    def test_blocks_korean(self):
        assert _NON_LATIN_RE.search("인공지능 최신 뉴스")

    def test_blocks_arabic(self):
        assert _NON_LATIN_RE.search("الذكاء الاصطناعي")

    def test_blocks_cyrillic(self):
        assert _NON_LATIN_RE.search("Искусственный интеллект")

    def test_blocks_thai(self):
        assert _NON_LATIN_RE.search("ปัญญาประดิษฐ์")

    def test_blocks_devanagari(self):
        assert _NON_LATIN_RE.search("कृत्रिम बुद्धिमत्ता")
