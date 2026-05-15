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
