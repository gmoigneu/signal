"""Tests for the weekly review generator (fallback mode without LLM)."""

from signal_app.weekly.generator import _fallback_review


class TestFallbackReview:
    def test_generates_markdown_with_title(self):
        items = [
            {
                "title": "GPT-5 Released",
                "url": "https://openai.com/gpt5",
                "source_name": "OpenAI Blog",
                "categories": ["Models & Research"],
                "summary": "OpenAI released GPT-5.",
                "star_note": None,
            },
        ]
        md = _fallback_review(items, "AI Review: Feb 17-23")
        assert md.startswith("# AI Review: Feb 17-23")
        assert "GPT-5 Released" in md
        assert "https://openai.com/gpt5" in md
        assert "OpenAI Blog" in md

    def test_groups_by_category(self):
        items = [
            {
                "title": "Item A",
                "url": "https://a.com",
                "source_name": "Source A",
                "categories": ["Models & Research"],
                "summary": "Summary A",
                "star_note": None,
            },
            {
                "title": "Item B",
                "url": "https://b.com",
                "source_name": "Source B",
                "categories": ["Coding Agents"],
                "summary": "Summary B",
                "star_note": None,
            },
        ]
        md = _fallback_review(items, "Test Review")
        assert "### Models & Research" in md
        assert "### Coding Agents" in md

    def test_includes_star_notes(self):
        items = [
            {
                "title": "Important Item",
                "url": "https://example.com",
                "source_name": "Blog",
                "categories": ["Tools"],
                "summary": "A summary",
                "star_note": "This is very relevant to our project",
            },
        ]
        md = _fallback_review(items, "Review")
        assert "This is very relevant to our project" in md

    def test_empty_items(self):
        md = _fallback_review([], "Empty Review")
        assert "# Empty Review" in md
        assert "0 starred items" in md

    def test_uncategorized_items(self):
        items = [
            {
                "title": "No Category",
                "url": "https://example.com",
                "source_name": "Source",
                "categories": [],
                "summary": None,
                "star_note": None,
            },
        ]
        md = _fallback_review(items, "Review")
        assert "Uncategorized" in md
