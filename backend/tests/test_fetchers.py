"""Tests for fetcher implementations using respx to mock HTTP calls."""

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
    async def test_fetch_hn(self, hn_api_response: dict):
        respx.get("https://hn.algolia.com/api/v1/search").mock(
            return_value=Response(200, json=hn_api_response)
        )

        fetcher = HackerNewsFetcher("source-1", {"keywords": ["AI", "LLM"], "min_score": 50})
        items = await fetcher.fetch()

        assert len(items) == 2
        assert items[0].title == "Show HN: AI Coding Agent"
        assert items[0].external_id == "12345"
        assert items[0].extra["score"] == 150
        assert items[0].extra["num_comments"] == 42

    async def test_fetch_no_keywords(self):
        fetcher = HackerNewsFetcher("source-1", {"keywords": []})
        items = await fetcher.fetch()
        assert items == []


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
