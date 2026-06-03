"""Stop hook: verifica calidad del código Python antes de que Claude termine."""
import json
import os
import re
import sys

project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
app_dir = os.path.join(project_dir, "app")
tests_dir = os.path.join(project_dir, "tests")

issues = []
warnings = []

NO_RETURN_HINT = re.compile(r"^\s*async def \w+\(.*\)\s*:|^\s*def \w+\(.*\)\s*:")
SQL_FSTRING = re.compile(r'f["\'].*\b(SELECT|INSERT|UPDATE|DELETE)\b', re.IGNORECASE)
TODO_PATTERN = re.compile(r"\b(TODO|FIXME)\b")

def scan_py_files(directory, callback):
    if not os.path.isdir(directory):
        return
    for root, _, files in os.walk(directory):
        for fname in files:
            if fname.endswith(".py"):
                path = os.path.join(root, fname)
                with open(path, encoding="utf-8") as f:
                    lines = f.readlines()
                callback(path, lines)

def check_type_hints(path, lines):
    for lineno, line in enumerate(lines, 1):
        if NO_RETURN_HINT.match(line) and "->" not in line:
            rel = os.path.relpath(path, project_dir)
            issues.append(f"Sin type hint de retorno: {rel}:{lineno}")

def check_sql_fstrings(path, lines):
    for lineno, line in enumerate(lines, 1):
        if SQL_FSTRING.search(line):
            rel = os.path.relpath(path, project_dir)
            issues.append(f"Query SQL con f-string: {rel}:{lineno}")

def check_todos(path, lines):
    for lineno, line in enumerate(lines, 1):
        if TODO_PATTERN.search(line):
            rel = os.path.relpath(path, project_dir)
            warnings.append(f"TODO/FIXME pendiente: {rel}:{lineno}")

scan_py_files(app_dir, check_type_hints)
scan_py_files(app_dir, check_sql_fstrings)
scan_py_files(app_dir, check_todos)

for router in ["payments", "merchants", "health"]:
    if not os.path.exists(os.path.join(tests_dir, f"test_{router}.py")):
        issues.append(f"Falta archivo de test: tests/test_{router}.py")

if issues:
    reason = "Verificador de calidad bloqueó la finalización:\n" + "\n".join(f"• {i}" for i in issues)
    if warnings:
        reason += "\n\nAdvertencias (no bloquean):\n" + "\n".join(f"⚠ {w}" for w in warnings)
    print(json.dumps({"decision": "block", "reason": reason}))
    sys.exit(0)

if warnings:
    msg = "Advertencias: " + " | ".join(warnings)
    print(json.dumps({"systemMessage": msg}))
