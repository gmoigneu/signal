"""Shared test fixtures for Signal backend tests."""

import pytest


@pytest.fixture
def rss_feed_xml() -> str:
    """Sample RSS feed XML for testing."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <link>https://test.example.com</link>
    <item>
      <title>Test Article One</title>
      <link>https://test.example.com/article-1</link>
      <description>First test article content</description>
      <author>Author A</author>
      <pubDate>Wed, 26 Feb 2026 10:00:00 GMT</pubDate>
      <guid>article-1</guid>
    </item>
    <item>
      <title>Test Article Two</title>
      <link>https://test.example.com/article-2</link>
      <description>Second test article content</description>
      <author>Author B</author>
      <pubDate>Wed, 26 Feb 2026 09:00:00 GMT</pubDate>
      <guid>article-2</guid>
    </item>
  </channel>
</rss>"""


@pytest.fixture
def hn_api_response() -> dict:
    """Sample Hacker News Algolia API response."""
    return {
        "hits": [
            {
                "objectID": "12345",
                "title": "Show HN: AI Coding Agent",
                "url": "https://example.com/ai-agent",
                "author": "testuser",
                "points": 150,
                "num_comments": 42,
                "created_at": "2026-02-26T10:00:00.000Z",
                "story_text": None,
            },
            {
                "objectID": "12346",
                "title": "Claude Code v2 Released",
                "url": "https://example.com/claude-code",
                "author": "another_user",
                "points": 200,
                "num_comments": 87,
                "created_at": "2026-02-26T08:00:00.000Z",
                "story_text": "Major update to Claude Code.",
            },
        ],
        "nbHits": 2,
    }
