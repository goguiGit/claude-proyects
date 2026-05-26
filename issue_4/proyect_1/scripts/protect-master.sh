#!/bin/bash
# Bloquea cualquier intento de hacer commit directamente sobre master
if echo "$CLAUDE_BASH_COMMAND" | grep -qE "git commit"; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    echo '{"decision": "deny", "reason": "Cannot commit directly to master/main. Create a feature branch first."}'
    exit 2
  fi
fi
