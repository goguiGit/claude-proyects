#!/bin/bash
# Bloquea cualquier comando que intente escribir en input/
if echo "$CLAUDE_BASH_COMMAND" | grep -qE "input/.*\.(jpg|jpeg|png|gif|webp)"; then
  echo '{"decision": "deny", "reason": "Cannot modify original images in input/"}'
  exit 2
fi