import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = str(Path(__file__).parent.parent / "todos.db")


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
