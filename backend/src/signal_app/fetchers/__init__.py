from signal_app.fetchers.arxiv import ArxivFetcher
from signal_app.fetchers.base import BaseFetcher, RawItem
from signal_app.fetchers.bluesky import BlueskyFetcher
from signal_app.fetchers.github import GitHubReleasesFetcher
from signal_app.fetchers.hackernews import HackerNewsFetcher
from signal_app.fetchers.reddit import RedditFetcher
from signal_app.fetchers.rss import RSSFetcher
from signal_app.fetchers.twitter import TwitterFetcher
from signal_app.fetchers.youtube import YouTubeChannelFetcher, YouTubeSearchFetcher

FETCHER_REGISTRY: dict[str, type[BaseFetcher]] = {
    "rss": RSSFetcher,
    "atom": RSSFetcher,
    "hackernews": HackerNewsFetcher,
    "reddit": RedditFetcher,
    "arxiv": ArxivFetcher,
    "github_releases": GitHubReleasesFetcher,
    "youtube_channel": YouTubeChannelFetcher,
    "youtube_search": YouTubeSearchFetcher,
    "bluesky": BlueskyFetcher,
    "twitter": TwitterFetcher,
}


def get_fetcher(source_type: str, source_id: str, config: dict) -> BaseFetcher | None:  # type: ignore[type-arg]
    """Instantiate the right fetcher for a source type."""
    cls = FETCHER_REGISTRY.get(source_type)
    if cls is None:
        return None
    return cls(source_id=source_id, config=config)


__all__ = [
    "FETCHER_REGISTRY",
    "ArxivFetcher",
    "BaseFetcher",
    "BlueskyFetcher",
    "GitHubReleasesFetcher",
    "HackerNewsFetcher",
    "RSSFetcher",
    "RawItem",
    "RedditFetcher",
    "TwitterFetcher",
    "YouTubeChannelFetcher",
    "YouTubeSearchFetcher",
    "get_fetcher",
]
