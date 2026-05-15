# Todo API — Design Spec
**Date:** 2026-05-15  
**Stack:** Python · FastAPI · SQLite (sqlite3) · Pydantic · pytest · Streamlit

---

## Overview

A REST API for managing todo tasks, backed by SQLite without an ORM, plus a Streamlit dashboard that communicates with the API exclusively via HTTP. The project follows a router/service separation: endpoints are thin, all SQL lives in `database.py`.

---

## File Structure

```
todo-api/
├── requirements.txt
├── README.md
├── src/
│   ├── main.py        # Creates FastAPI app, mounts router, initializes DB
│   ├── database.py    # SQLite connection + all query functions
│   ├── models.py      # Pydantic schemas (request / response)
│   └── router.py      # FastAPI endpoints (thin, delegate to database.py)
├── tests/
│   └── test_todos.py  # Tests using TestClient + in-memory SQLite
└── app_ui.py          # Streamlit panel
```

---

## Database Schema

Three tables in SQLite:

```sql
todos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'done'
  priority    TEXT NOT NULL DEFAULT 'medium',    -- 'low' | 'medium' | 'high'
  created_at  TEXT NOT NULL                      -- ISO 8601 string
)

tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
)

todo_tags (
  todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  tag_id  INTEGER REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
)
```

- Tables are created on app startup with `CREATE TABLE IF NOT EXISTS`.
- `ON DELETE CASCADE` on `todo_tags` ensures tag links are removed when a todo is deleted.
- Tag names are unique; inserting a duplicate tag reuses the existing row (`INSERT OR IGNORE`).

---

## Pydantic Models (`models.py`)

```python
class TodoCreate(BaseModel):
    title: str                                      # required, non-empty
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    tags: list[str] = []                            # tag names

class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["pending", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    tags: list[str] | None = None                  # replaces all tags if provided

class TodoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    created_at: str
    tags: list[str]
```

---

## API Endpoints

Base path: `/api/todos`  
Server runs on port **8000** by default.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/todos` | List all todos. Supports optional query filters. |
| `GET` | `/api/todos/{id}` | Get a single todo by ID. Returns 404 if not found. |
| `POST` | `/api/todos` | Create a new todo. Returns 201. |
| `PATCH` | `/api/todos/{id}` | Partially update a todo. Returns 404 if not found. |
| `DELETE` | `/api/todos/{id}` | Delete a todo. Returns 404 if not found. |

### Query parameters for `GET /api/todos`

| Param | Type | Behavior |
|-------|------|----------|
| `status` | `pending` \| `done` | Exact match |
| `priority` | `low` \| `medium` \| `high` | Exact match |
| `title` | string | Case-insensitive partial match (`LIKE %value%`) |
| `description` | string | Case-insensitive partial match (`LIKE %value%`) |

All filters are optional and combinable.

### Error handling

- Missing todo → `404 Not Found` with descriptive message
- Invalid field values → `422 Unprocessable Entity` (Pydantic)
- No bare 500s exposed to the client

---

## Architecture: Router / Service Separation

- **`main.py`**: Creates the `FastAPI` app, calls `database.init_db()`, includes the router.
- **`router.py`**: Defines all 5 endpoints. Each endpoint calls a function from `database.py` and returns a response. No SQL here.
- **`database.py`**: Holds `get_connection()`, `init_db()`, and one function per operation (`create_todo`, `get_todos`, `get_todo_by_id`, `update_todo`, `delete_todo`). All SQL lives here.
- **`models.py`**: Pure Pydantic schemas, no logic.

---

## Tests (`tests/test_todos.py`)

- Use FastAPI's `TestClient` with a pytest fixture that overrides the DB connection to use SQLite `:memory:`.
- Each test gets a fresh in-memory database (no state leakage between tests).
- Minimum one test per endpoint:

| Test | What it verifies |
|------|-----------------|
| `test_create_todo` | POST returns 201, all fields present including `created_at` and `tags` |
| `test_get_all_todos` | GET returns list; `status`, `priority`, `title` filters work correctly |
| `test_get_todo_by_id` | GET by ID returns correct todo; non-existent ID returns 404 |
| `test_update_todo` | PATCH updates only sent fields; non-existent ID returns 404 |
| `test_delete_todo` | DELETE removes todo; second call returns 404 |

---

## Streamlit Panel (`app_ui.py`)

- Connects to `http://localhost:8000` via `requests`.
- Displays a clear error message if the API is unreachable (no crash).

**Layout:**

- **Sidebar**: filters for `priority` (selectbox), `title` (text input), `description` (text input) + "Apply filters" button.
- **Main area**:
  - Summary row: 3 metric cards — Total / Pending / Done.
  - "New task" form: title, description, priority, tags (comma-separated string).
  - Task table: color-coded rows (green = done, orange = pending), tags column, "Complete" button (pending only), "Delete" button.

The UI never writes directly to the database — all data flows through the API.

---

## README.md Content

The README will cover:
1. Project description and tech stack
2. Prerequisites and installation (`pip install -r requirements.txt`)
3. How to run the API (`uvicorn src.main:app --reload --port 8000`)
4. How to run the Streamlit panel (`streamlit run app_ui.py`)
5. How to run tests (`pytest tests/`)
6. Full endpoint reference with example `curl` commands
7. Database schema summary

---

## Out of Scope

- Authentication / authorization
- Pagination
- Tag filtering in the API (tags are display-only in this version)
- Deployment configuration
