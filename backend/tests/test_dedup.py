"""Tests for deduplication logic."""

from signal_app.pipeline.dedup import _fuzzy_title_match


class TestFuzzyTitleMatch:
    def test_exact_match(self):
        assert _fuzzy_title_match("Hello World", ["Hello World"]) is True

    def test_case_insensitive(self):
        assert _fuzzy_title_match("hello world", ["Hello World"]) is True

    def test_very_similar_titles(self):
        assert _fuzzy_title_match(
            "Introducing GPT-5: A New Frontier",
            ["Introducing GPT-5: A New Frontier in AI"],
        ) is True

    def test_different_titles(self):
        assert _fuzzy_title_match(
            "Introducing GPT-5",
            ["Claude Code v2 Released", "React 19 Is Here"],
        ) is False

    def test_empty_title(self):
        assert _fuzzy_title_match("", ["Some Title"]) is False

    def test_empty_existing_titles(self):
        assert _fuzzy_title_match("Some Title", []) is False

    def test_custom_threshold(self):
        # Very strict threshold
        assert _fuzzy_title_match("Hello World!", ["Hello World"], threshold=0.99) is False
        # Very loose threshold
        assert _fuzzy_title_match("Hello World!", ["Hello World", "Goodbye"], threshold=0.5) is True

    def test_multiple_existing_titles(self):
        existing = [
            "Unrelated Article About Cats",
            "Another Random Title",
            "Introducing GPT-5: The Next Step",  # similar
        ]
        assert _fuzzy_title_match("Introducing GPT-5: The Next Step Forward", existing) is True

    def test_short_titles(self):
        # Short titles that differ by one word shouldn't match
        assert _fuzzy_title_match("AI News", ["AI Bias"]) is False

    def test_whitespace_handling(self):
        assert _fuzzy_title_match("  Hello World  ", ["Hello World"]) is True
