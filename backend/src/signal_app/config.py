from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://signal:signal@localhost:5432/signal"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-nano"

    # YouTube Data API v3
    google_api_key: str = ""

    # GitHub (optional, for higher rate limits)
    github_token: str = ""

    # Pipeline schedule (cron expression: 6 AM and 6 PM daily)
    pipeline_cron: str = "0 6,18 * * *"

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
