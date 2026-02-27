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
def hn_top_stories() -> list[int]:
    """Sample HN top story IDs."""
    return [12345, 12346, 12347]


@pytest.fixture
def hn_story_details() -> dict[int, dict]:
    """Sample HN story details keyed by ID."""
    return {
        12345: {
            "id": 12345,
            "title": "Show HN: AI Coding Agent",
            "url": "https://example.com/ai-agent",
            "by": "testuser",
            "score": 150,
            "descendants": 42,
            "time": 1740564000,
            "type": "story",
        },
        12346: {
            "id": 12346,
            "title": "Claude Code v2 Released",
            "url": "https://example.com/claude-code",
            "by": "another_user",
            "score": 200,
            "descendants": 87,
            "time": 1740556800,
            "type": "story",
        },
        12347: {
            "id": 12347,
            "title": "New React Framework Launched",
            "url": "https://example.com/react-fw",
            "by": "dev_user",
            "score": 80,
            "descendants": 15,
            "time": 1740550000,
            "type": "story",
        },
    }
