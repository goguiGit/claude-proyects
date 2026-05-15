# Todo API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI + SQLite todo REST API with Pydantic validation, pytest tests, a Streamlit dashboard, and full README documentation.

**Architecture:** Router/service separation — `router.py` contains thin FastAPI endpoints that delegate all SQL to `database.py`. Pydantic models in `models.py` validate all input/output. Tests use FastAPI's `TestClient` with an in-memory SQLite database injected via dependency override. The Streamlit panel (`app_ui.py`) communicates exclusively via HTTP requests to the API.

**Tech Stack:** Python 3.11+, FastAPI, SQLite (sqlite3 stdlib), Pydantic v2, pytest, httpx, Streamlit, requests, uvicorn

---

## File Map

| File | Responsibility |
|------|---------------|
| `todo-api/requirements.txt` | All Python dependencies |
| `todo-api/src/__init__.py` | Makes `src` a package |
| `todo-api/src/models.py` | Pydantic schemas: TodoCreate, TodoUpdate, TodoResponse |
| `todo-api/src/database.py` | SQLite connection, init_db, all CRUD functions |
| `todo-api/src/router.py` | 5 FastAPI endpoints + `get_db` dependency |
| `todo-api/src/main.py` | FastAPI app creation, router mount, DB init on startup |
| `todo-api/tests/__init__.py` | Makes `tests` a package |
| `todo-api/tests/test_todos.py` | pytest tests with in-memory SQLite fixture |
| `todo-api/app_ui.py` | Streamlit dashboard |
| `todo-api/README.md` | Tech docs, endpoints, run instructions |

---

### Task 1: Project Scaffold

**Files:**
- Create: `todo-api/requirements.txt`
- Create: `todo-api/src/__init__.py`
- Create: `todo-api/tests/__init__.py`

- [ ] **Step 1: Create directory structure**

Run from the project root (`proyect_2/`):

```bash
mkdir -p todo-api/src todo-api/tests
touch todo-api/src/__init__.py todo-api/tests/__init__.py
```

- [ ] **Step 2: Create `todo-api/requirements.txt`**

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.0.0
httpx>=0.27.0
pytest>=8.0.0
streamlit>=1.35.0
requests>=2.31.0
```

- [ ] **Step 3: Install dependencies**

```bash
cd todo-api
pip install -r requirements.txt
```

Expected: All packages install without errors.

- [ ] **Step 4: Commit**

```bash
git add todo-api/
git commit -m "chore: project scaffold and requirements"
```

---

### Task 2: Pydantic Models

**Files:**
- Create: `todo-api/src/models.py`

- [ ] **Step 1: Write `todo-api/src/models.py`**

```python
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
```

- [ ] **Step 2: Verify models parse correctly (quick sanity check)**

```bash
cd todo-api
python -c "from src.models import TodoCreate; t = TodoCreate(title='Test'); print(t)"
```

Expected output: `title='Test' description=None priority='medium' tags=[]`

- [ ] **Step 3: Commit**

```bash
git add todo-api/src/models.py
git commit -m "feat: add Pydantic models"
```

---

### Task 3: Write Failing Tests (TDD)

**Files:**
- Create: `todo-api/tests/test_todos.py`

- [ ] **Step 1: Write `todo-api/tests/test_todos.py`**

```python
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
```

- [ ] **Step 2: Run tests — verify they all fail (nothing implemented yet)**

```bash
cd todo-api
pytest tests/ -v
```

Expected: `ImportError` or `ModuleNotFoundError` — `src.main`, `src.database`, `src.router` don't exist yet. This confirms TDD baseline.

---

### Task 4: Database Layer

**Files:**
- Create: `todo-api/src/database.py`

- [ ] **Step 1: Write `todo-api/src/database.py`**

```python
import sqlite3
from datetime import datetime, timezone

DB_PATH = "todos.db"


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS todos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT,
            status      TEXT NOT NULL DEFAULT 'pending',
            priority    TEXT NOT NULL DEFAULT 'medium',
            created_at  TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS todo_tags (
            todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
            tag_id  INTEGER REFERENCES tags(id)  ON DELETE CASCADE,
            PRIMARY KEY (todo_id, tag_id)
        );
    """)
    conn.commit()


def _get_tags(conn: sqlite3.Connection, todo_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT tg.name FROM tags tg JOIN todo_tags tt ON tg.id = tt.tag_id WHERE tt.todo_id = ?",
        (todo_id,),
    ).fetchall()
    return [row["name"] for row in rows]


def _row_to_dict(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    d = dict(row)
    d["tags"] = _get_tags(conn, d["id"])
    return d


def _set_tags(conn: sqlite3.Connection, todo_id: int, tags: list[str]) -> None:
    conn.execute("DELETE FROM todo_tags WHERE todo_id = ?", (todo_id,))
    for name in tags:
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (name,))
        tag_id = conn.execute(
            "SELECT id FROM tags WHERE name = ?", (name,)
        ).fetchone()["id"]
        conn.execute(
            "INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)",
            (todo_id, tag_id),
        )


def create_todo(
    conn: sqlite3.Connection,
    title: str,
    description: str | None,
    priority: str,
    tags: list[str],
) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(
        "INSERT INTO todos (title, description, priority, created_at) VALUES (?, ?, ?, ?)",
        (title, description, priority, created_at),
    )
    todo_id = cursor.lastrowid
    _set_tags(conn, todo_id, tags)
    conn.commit()
    row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    return _row_to_dict(conn, row)


def get_todos(
    conn: sqlite3.Connection,
    status: str | None = None,
    priority: str | None = None,
    title: str | None = None,
    description: str | None = None,
) -> list[dict]:
    query = "SELECT * FROM todos WHERE 1=1"
    params: list = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if priority:
        query += " AND priority = ?"
        params.append(priority)
    if title:
        query += " AND title LIKE ?"
        params.append(f"%{title}%")
    if description:
        query += " AND description LIKE ?"
        params.append(f"%{description}%")
    rows = conn.execute(query, params).fetchall()
    return [_row_to_dict(conn, row) for row in rows]


def get_todo_by_id(conn: sqlite3.Connection, todo_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        return None
    return _row_to_dict(conn, row)


def update_todo(
    conn: sqlite3.Connection,
    todo_id: int,
    title: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    tags: list[str] | None = None,
) -> dict | None:
    updates: dict = {}
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if status is not None:
        updates["status"] = status
    if priority is not None:
        updates["priority"] = priority

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE todos SET {set_clause} WHERE id = ?",
            list(updates.values()) + [todo_id],
        )

    if tags is not None:
        _set_tags(conn, todo_id, tags)

    conn.commit()
    return get_todo_by_id(conn, todo_id)


def delete_todo(conn: sqlite3.Connection, todo_id: int) -> bool:
    cursor = conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    conn.commit()
    return cursor.rowcount > 0
```

- [ ] **Step 2: Commit**

```bash
git add todo-api/src/database.py
git commit -m "feat: add SQLite database layer"
```

---

### Task 5: FastAPI Router

**Files:**
- Create: `todo-api/src/router.py`

- [ ] **Step 1: Write `todo-api/src/router.py`**

```python
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from src.database import (
    create_todo,
    delete_todo,
    get_connection,
    get_todo_by_id,
    get_todos,
    update_todo,
)
from src.models import TodoCreate, TodoResponse, TodoUpdate

router = APIRouter(prefix="/api/todos")


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.get("", response_model=list[TodoResponse])
def list_todos(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    return get_todos(conn, status=status, priority=priority, title=title, description=description)


@router.get("/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, conn: sqlite3.Connection = Depends(get_db)):
    todo = get_todo_by_id(conn, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
    return todo


@router.post("", response_model=TodoResponse, status_code=201)
def create_todo_endpoint(data: TodoCreate, conn: sqlite3.Connection = Depends(get_db)):
    return create_todo(conn, data.title, data.description, data.priority, data.tags)


@router.patch("/{todo_id}", response_model=TodoResponse)
def update_todo_endpoint(
    todo_id: int, data: TodoUpdate, conn: sqlite3.Connection = Depends(get_db)
):
    if get_todo_by_id(conn, todo_id) is None:
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
    return update_todo(
        conn,
        todo_id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        tags=data.tags,
    )


@router.delete("/{todo_id}")
def delete_todo_endpoint(todo_id: int, conn: sqlite3.Connection = Depends(get_db)):
    if not delete_todo(conn, todo_id):
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
    return {"message": "deleted"}
```

- [ ] **Step 2: Commit**

```bash
git add todo-api/src/router.py
git commit -m "feat: add FastAPI router with 5 endpoints"
```

---

### Task 6: Main App Entry Point

**Files:**
- Create: `todo-api/src/main.py`

- [ ] **Step 1: Write `todo-api/src/main.py`**

```python
from fastapi import FastAPI

from src.database import get_connection, init_db
from src.router import router

app = FastAPI(title="Todo API", version="1.0.0")

_conn = get_connection()
init_db(_conn)
_conn.close()

app.include_router(router)
```

- [ ] **Step 2: Commit**

```bash
git add todo-api/src/main.py
git commit -m "feat: add FastAPI app entry point"
```

---

### Task 7: Run All Tests

- [ ] **Step 1: Run the full test suite**

```bash
cd todo-api
pytest tests/ -v
```

Expected output — all 5 tests pass:
```
tests/test_todos.py::test_create_todo                    PASSED
tests/test_todos.py::test_get_all_todos_and_filters      PASSED
tests/test_todos.py::test_get_todo_by_id                 PASSED
tests/test_todos.py::test_update_todo                    PASSED
tests/test_todos.py::test_delete_todo                    PASSED

5 passed in X.XXs
```

If any test fails, debug before proceeding to the next task.

- [ ] **Step 2: Commit**

```bash
git add todo-api/tests/test_todos.py
git commit -m "test: add full endpoint test suite (5 passing)"
```

---

### Task 8: Streamlit Dashboard

**Files:**
- Create: `todo-api/app_ui.py`

- [ ] **Step 1: Write `todo-api/app_ui.py`**

```python
import requests
import streamlit as st

API_URL = "http://localhost:8000/api/todos"


def fetch_todos(**filters: str) -> list[dict]:
    params = {k: v for k, v in filters.items() if v}
    try:
        r = requests.get(API_URL, params=params, timeout=5)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to the API. Make sure it is running on port 8000.")
        return []
    except requests.exceptions.HTTPError as exc:
        st.error(f"API error: {exc}")
        return []


def api_create(title: str, description: str, priority: str, tags_raw: str) -> bool:
    tag_list = [t.strip() for t in tags_raw.split(",") if t.strip()]
    r = requests.post(
        API_URL,
        json={"title": title, "description": description, "priority": priority, "tags": tag_list},
        timeout=5,
    )
    return r.status_code == 201


def api_complete(todo_id: int) -> None:
    requests.patch(f"{API_URL}/{todo_id}", json={"status": "done"}, timeout=5)


def api_delete(todo_id: int) -> None:
    requests.delete(f"{API_URL}/{todo_id}", timeout=5)


st.set_page_config(page_title="Todo Manager", layout="wide")
st.title("Todo Manager")

# ── Sidebar filters ──────────────────────────────────────────
st.sidebar.header("Filters")
filter_priority = st.sidebar.selectbox("Priority", ["", "low", "medium", "high"])
filter_title = st.sidebar.text_input("Title contains")
filter_description = st.sidebar.text_input("Description contains")

todos = fetch_todos(priority=filter_priority, title=filter_title, description=filter_description)

# ── Summary metrics ──────────────────────────────────────────
total = len(todos)
pending_count = sum(1 for t in todos if t["status"] == "pending")
done_count = total - pending_count

col1, col2, col3 = st.columns(3)
col1.metric("Total", total)
col2.metric("Pending", pending_count)
col3.metric("Done", done_count)

# ── New task form ─────────────────────────────────────────────
with st.expander("New Task", expanded=False):
    with st.form("new_todo_form"):
        new_title = st.text_input("Title *")
        new_desc = st.text_area("Description")
        new_priority = st.selectbox("Priority", ["medium", "low", "high"])
        new_tags = st.text_input("Tags (comma-separated)")
        if st.form_submit_button("Create"):
            if not new_title.strip():
                st.error("Title is required.")
            elif api_create(new_title.strip(), new_desc, new_priority, new_tags):
                st.success("Task created!")
                st.rerun()
            else:
                st.error("Failed to create task.")

# ── Task list ─────────────────────────────────────────────────
st.subheader("Tasks")
if not todos:
    st.info("No tasks found.")

for todo in todos:
    bg = "#d4edda" if todo["status"] == "done" else "#fff3cd"
    tags_str = ", ".join(todo["tags"]) if todo["tags"] else "—"
    desc_str = todo.get("description") or ""

    st.markdown(
        f"""<div style="background:{bg};padding:12px;border-radius:6px;margin:6px 0">
        <b>{todo['title']}</b> &nbsp;|&nbsp; priority: <b>{todo['priority']}</b>
        &nbsp;|&nbsp; status: <b>{todo['status']}</b><br>
        {desc_str}<br>
        <small>Tags: {tags_str}</small>
        </div>""",
        unsafe_allow_html=True,
    )
    btn1, btn2, _ = st.columns([1, 1, 8])
    if todo["status"] == "pending":
        with btn1:
            if st.button("Complete", key=f"complete_{todo['id']}"):
                api_complete(todo["id"])
                st.rerun()
    with btn2:
        if st.button("Delete", key=f"delete_{todo['id']}"):
            api_delete(todo["id"])
            st.rerun()
```

- [ ] **Step 2: Commit**

```bash
git add todo-api/app_ui.py
git commit -m "feat: add Streamlit dashboard"
```

---

### Task 9: README

**Files:**
- Create: `todo-api/README.md`

- [ ] **Step 1: Write `todo-api/README.md`**

```markdown
# Todo API

A REST API for managing tasks, built with **FastAPI** and **SQLite** (no ORM), with a **Streamlit** dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API framework | FastAPI |
| Database | SQLite via `sqlite3` (stdlib) |
| Validation | Pydantic v2 |
| Tests | pytest + httpx + FastAPI TestClient |
| Dashboard | Streamlit |
| Server | Uvicorn |

## Prerequisites

- Python 3.11+

```bash
cd todo-api
pip install -r requirements.txt
```

## Running the API

```bash
cd todo-api
uvicorn src.main:app --reload --port 8000
```

Interactive docs available at: `http://localhost:8000/docs`

## Running the Dashboard

Open a second terminal (API must be running first):

```bash
cd todo-api
streamlit run app_ui.py
```

Dashboard opens at: `http://localhost:8501`

## Running Tests

```bash
cd todo-api
pytest tests/ -v
```

## Endpoints

### `GET /api/todos`

Returns all tasks. All query parameters are optional and combinable.

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `pending` \| `done` | Filter by exact status |
| `priority` | `low` \| `medium` \| `high` | Filter by exact priority |
| `title` | string | Case-insensitive partial match |
| `description` | string | Case-insensitive partial match |

```bash
curl http://localhost:8000/api/todos
curl "http://localhost:8000/api/todos?status=pending&priority=high"
curl "http://localhost:8000/api/todos?title=groceries"
```

### `GET /api/todos/{id}`

Returns a single task by ID.

```bash
curl http://localhost:8000/api/todos/1
```

Returns `404` if not found.

### `POST /api/todos`

Creates a new task.

```bash
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "description": "Milk and eggs", "priority": "high", "tags": ["shopping"]}'
```

| Field | Required | Type | Default |
|-------|----------|------|---------|
| `title` | Yes | string | — |
| `description` | No | string | null |
| `priority` | No | `low`\|`medium`\|`high` | `medium` |
| `tags` | No | list of strings | [] |

### `PATCH /api/todos/{id}`

Partially updates a task. Only the fields you send are updated. Sending `tags` replaces all existing tags.

```bash
curl -X PATCH http://localhost:8000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

Returns `404` if not found.

### `DELETE /api/todos/{id}`

Deletes a task and its tag relationships.

```bash
curl -X DELETE http://localhost:8000/api/todos/1
```

Returns `404` if not found.

## Database Schema

```sql
todos     (id, title, description, status, priority, created_at)
tags      (id, name UNIQUE)
todo_tags (todo_id → todos.id CASCADE, tag_id → tags.id CASCADE)
```
```

- [ ] **Step 2: Commit**

```bash
git add todo-api/README.md
git commit -m "docs: add README with tech stack, endpoints, and run instructions"
```

---

### Task 10: Integration Smoke Test

- [ ] **Step 1: Start the API in the background**

```bash
cd todo-api
uvicorn src.main:app --port 8000 &
```

- [ ] **Step 2: Verify the API responds**

```bash
curl http://localhost:8000/api/todos
```

Expected: `[]`

- [ ] **Step 3: Create a test task**

```bash
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "priority": "high", "tags": ["smoke-test"]}'
```

Expected: JSON with `id`, `status: "pending"`, `tags: ["smoke-test"]`.

- [ ] **Step 4: Start Streamlit and verify dashboard loads**

```bash
streamlit run app_ui.py
```

Open `http://localhost:8501` in a browser. Confirm:
- Summary metrics show 1 total / 1 pending / 0 done
- The task row appears with orange background
- "Complete" and "Delete" buttons are visible

- [ ] **Step 5: Stop the background API process**

```bash
kill %1
```
