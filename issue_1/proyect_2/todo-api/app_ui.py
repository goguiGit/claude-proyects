import html
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
    try:
        r = requests.post(
            API_URL,
            json={"title": title, "description": description, "priority": priority, "tags": tag_list},
            timeout=5,
        )
        return r.status_code == 201
    except requests.exceptions.RequestException:
        return False


def api_complete(todo_id: int) -> None:
    try:
        requests.patch(f"{API_URL}/{todo_id}", json={"status": "done"}, timeout=5)
    except requests.exceptions.RequestException:
        pass


def api_delete(todo_id: int) -> None:
    try:
        requests.delete(f"{API_URL}/{todo_id}", timeout=5)
    except requests.exceptions.RequestException:
        pass


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

    safe_title = html.escape(todo['title'])
    safe_desc = html.escape(desc_str)
    safe_tags = html.escape(tags_str)
    safe_priority = html.escape(todo['priority'])
    safe_status = html.escape(todo['status'])
    st.markdown(
        f"""<div style="background:{bg};padding:12px;border-radius:6px;margin:6px 0">
        <b>{safe_title}</b> &nbsp;|&nbsp; priority: <b>{safe_priority}</b>
        &nbsp;|&nbsp; status: <b>{safe_status}</b><br>
        {safe_desc}<br>
        <small>Tags: {safe_tags}</small>
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
