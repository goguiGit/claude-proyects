import sqlite3
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.database import init_db
from src.router import get_db


@pytest.fixture
def client():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)

    def override_get_db():
        yield conn

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    conn.close()


def test_create_todo(client):
    response = client.post("/api/todos", json={
        "title": "Buy groceries",
        "description": "Milk and eggs",
        "priority": "high",
        "tags": ["shopping", "urgent"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Buy groceries"
    assert data["status"] == "pending"
    assert data["priority"] == "high"
    assert set(data["tags"]) == {"shopping", "urgent"}
    assert "created_at" in data
    assert "id" in data


def test_get_all_todos_and_filters(client):
    client.post("/api/todos", json={"title": "Task Alpha", "priority": "low"})
    client.post("/api/todos", json={"title": "Task Beta", "priority": "high"})

    r = client.get("/api/todos")
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = client.get("/api/todos?priority=low")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Task Alpha"

    r = client.get("/api/todos?title=Beta")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Task Beta"

    r = client.get("/api/todos?status=pending")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_get_todo_by_id(client):
    created = client.post("/api/todos", json={"title": "Find me"}).json()

    r = client.get(f"/api/todos/{created['id']}")
    assert r.status_code == 200
    assert r.json()["title"] == "Find me"

    r = client.get("/api/todos/9999")
    assert r.status_code == 404


def test_update_todo(client):
    created = client.post("/api/todos", json={"title": "Original", "tags": ["a"]}).json()

    r = client.patch(f"/api/todos/{created['id']}", json={
        "status": "done",
        "title": "Updated",
        "tags": ["b", "c"]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "done"
    assert data["title"] == "Updated"
    assert set(data["tags"]) == {"b", "c"}

    r = client.patch("/api/todos/9999", json={"status": "done"})
    assert r.status_code == 404


def test_delete_todo(client):
    created = client.post("/api/todos", json={"title": "Delete me"}).json()

    r = client.delete(f"/api/todos/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"message": "deleted"}

    r = client.delete(f"/api/todos/{created['id']}")
    assert r.status_code == 404
