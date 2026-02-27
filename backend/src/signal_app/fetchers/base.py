from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class RawItem:
    external_id: str | None
    title: str
    url: str
    author: str | None = None
    content_raw: str | None = None
    thumbnail_url: str | None = None
    published_at: datetime | None = None
    extra: dict | None = field(default_factory=dict)  # type: ignore[type-arg]


class BaseFetcher(ABC):
    def __init__(self, source_id: str, config: dict) -> None:  # type: ignore[type-arg]
        self.source_id = source_id
        self.config = config

    @abstractmethod
    async def fetch(self) -> list[RawItem]: ...
