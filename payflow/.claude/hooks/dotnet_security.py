#!/usr/bin/env python3
"""
PreToolUse hook: .NET security gate.
Intercepta git commit y escanea el diff staged buscando secrets hardcodeados.
"""
import sys
import json
import os
import re
import subprocess
from datetime import datetime, timezone


def log_decision(tool: str, input_val: str, blocked: bool, reason: str = "") -> None:
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    log_dir = os.path.join(project_dir, ".claude", "logs")
    os.makedirs(log_dir, exist_ok=True)
    entry = json.dumps({
        "ts": datetime.now(timezone.utc).isoformat(),
        "hook": "dotnet_security",
        "tool": tool,
        "input": input_val,
        "blocked": blocked,
        "reason": reason,
    }, ensure_ascii=False)
    with open(os.path.join(log_dir, "security.jsonl"), "a", encoding="utf-8") as f:
        f.write(entry + "\n")


# Patrones que indican un valor literal sensible (no placeholder)
SECRET_PATTERNS = [
    (r'(?i)(password|passwd|pwd)\s*[:=]\s*["\']?(?!\$\()(?!\%)[^\s"\'<>{}\[\]]{6,}', "Contraseña hardcodeada"),
    (r'(?i)(connectionstring|connection_string|data\s+source)\s*[:=]\s*["\']?(?!\$\()[^\s"\']{20,}', "Connection string hardcodeada"),
    (r'(?i)(clientsecret|client_secret)\s*[:=]\s*["\']?(?!\$\()[^\s"\']{8,}', "Client secret hardcodeado"),
]

# Líneas que son placeholders seguros, no bloquear
SAFE_PLACEHOLDER = re.compile(r'\$\([^)]+\)|\%[A-Z_]+\%|\{\{[^}]+\}\}')


def is_added_line(line: str) -> bool:
    return line.startswith('+') and not line.startswith('+++')


def scan_diff(diff: str) -> tuple[bool, str]:
    for line in diff.splitlines():
        if not is_added_line(line):
            continue
        content = line[1:]
        if SAFE_PLACEHOLDER.search(content):
            continue
        for pattern, reason in SECRET_PATTERNS:
            if re.search(pattern, content):
                return True, reason
    return False, ""


def deny(reason: str) -> None:
    json.dump({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }, sys.stdout)


def main():
    input_data = json.load(sys.stdin)
    tool_name = input_data.get("tool_name", "")
    cmd = input_data.get("tool_input", {}).get("command", "")

    if tool_name != "Bash" or not re.search(r'git\s+commit', cmd):
        sys.exit(0)

    # Detectar git add && git commit encadenados: el staging aún no existe cuando
    # el hook corre, por lo que el escaneo sería sobre el estado anterior.
    if re.search(r'git\s+add', cmd):
        reason = "git add y git commit encadenados — staging no disponible para escanear"
        log_decision("Bash", cmd, True, reason)
        deny(
            "Separa 'git add' y 'git commit' en comandos distintos. "
            "El .NET Security Gate necesita escanear el staging antes del commit."
        )
        sys.exit(0)

    result = subprocess.run(
        ["git", "diff", "--cached", "--unified=0"],
        capture_output=True,
        text=True,
    )

    blocked, reason = scan_diff(result.stdout)
    log_decision("Bash", cmd, blocked, reason)

    if blocked:
        deny(
            f"Commit bloqueado por .NET Security Gate: {reason}. "
            "Elimina el valor hardcodeado y usa una variable de entorno o Azure Key Vault."
        )

    sys.exit(0)


if __name__ == "__main__":
    main()
