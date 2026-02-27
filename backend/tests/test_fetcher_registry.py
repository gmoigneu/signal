"""Tests for the fetcher registry."""

from signal_app.fetchers import FETCHER_REGISTRY, get_fetcher
from signal_app.fetchers.arxiv import ArxivFetcher
from signal_app.fetchers.bluesky import BlueskyFetcher
from signal_app.fetchers.github import GitHubReleasesFetcher
from signal_app.fetchers.hackernews import HackerNewsFetcher
from signal_app.fetchers.reddit import RedditFetcher
from signal_app.fetchers.rss import RSSFetcher
from signal_app.fetchers.twitter import TwitterFetcher
from signal_app.fetchers.youtube import YouTubeChannelFetcher, YouTubeSearchFetcher


class TestFetcherRegistry:
    def test_all_source_types_registered(self):
        expected_types = {
            "rss",
            "atom",
            "hackernews",
            "reddit",
            "arxiv",
            "github_releases",
            "youtube_channel",
            "youtube_search",
            "bluesky",
            "twitter",
        }
        assert set(FETCHER_REGISTRY.keys()) == expected_types

    def test_registry_maps_correctly(self):
        assert FETCHER_REGISTRY["rss"] is RSSFetcher
        assert FETCHER_REGISTRY["atom"] is RSSFetcher
        assert FETCHER_REGISTRY["hackernews"] is HackerNewsFetcher
        assert FETCHER_REGISTRY["reddit"] is RedditFetcher
        assert FETCHER_REGISTRY["arxiv"] is ArxivFetcher
        assert FETCHER_REGISTRY["github_releases"] is GitHubReleasesFetcher
        assert FETCHER_REGISTRY["youtube_channel"] is YouTubeChannelFetcher
        assert FETCHER_REGISTRY["youtube_search"] is YouTubeSearchFetcher
        assert FETCHER_REGISTRY["bluesky"] is BlueskyFetcher
        assert FETCHER_REGISTRY["twitter"] is TwitterFetcher

    def test_get_fetcher_valid(self):
        fetcher = get_fetcher("rss", "source-1", {"feed_url": "https://example.com/rss"})
        assert isinstance(fetcher, RSSFetcher)
        assert fetcher.source_id == "source-1"
        assert fetcher.config["feed_url"] == "https://example.com/rss"

    def test_get_fetcher_invalid_type(self):
        fetcher = get_fetcher("unknown_type", "source-1", {})
        assert fetcher is None

    def test_get_fetcher_manual_type(self):
        # 'manual' is not in the registry — items added via API
        fetcher = get_fetcher("manual", "source-1", {})
        assert fetcher is None
