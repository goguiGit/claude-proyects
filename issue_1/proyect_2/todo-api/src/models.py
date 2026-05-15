from typing import Literal
from pydantic import BaseModel, field_validator


class TodoCreate(BaseModel):
    title: str
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    tags: list[str] = []

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be empty")
        return v.strip()


class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["pending", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    tags: list[str] | None = None


class TodoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    created_at: str
    tags: list[str]
