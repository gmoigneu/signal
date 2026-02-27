"""Tests for configuration."""

from signal_app.config import Settings


class TestSettings:
    def test_default_values(self):
        s = Settings()
        assert s.database_url == "postgresql://signal:signal@localhost:5432/signal"
        assert s.openai_model == "gpt-4.1-nano"
        assert s.pipeline_cron == "0 6,18 * * *"
        assert s.port == 8000
        assert s.host == "0.0.0.0"

    def test_origins_list_single(self):
        s = Settings(allowed_origins="http://localhost:3000")
        assert s.origins_list == ["http://localhost:3000"]

    def test_origins_list_multiple(self):
        s = Settings(allowed_origins="http://localhost:3000,http://localhost:5173")
        assert s.origins_list == ["http://localhost:3000", "http://localhost:5173"]

    def test_origins_list_with_spaces(self):
        s = Settings(allowed_origins=" http://a.com , http://b.com ")
        assert s.origins_list == ["http://a.com", "http://b.com"]

    def test_api_key_fields_exist(self):
        s = Settings()
        # These fields exist and are strings (may be populated from env)
        assert isinstance(s.openai_api_key, str)
        assert isinstance(s.google_api_key, str)
        assert isinstance(s.github_token, str)
