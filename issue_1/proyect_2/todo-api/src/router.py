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
