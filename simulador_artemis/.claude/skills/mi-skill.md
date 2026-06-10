---
name: mi-skill                    # ID para /mi-skill
description: >                    # Claude usa esto para decidir cuándo cargarlo
  Qué hace. Max 250 chars visibles.
argument-hint: "[param]"          # Hint en autocompletado
disable-model-invocation: true    # Solo tú, no Claude automáticamente
user-invocable: false             # Solo Claude, no aparece en /
allowed-tools: Read Bash(git *)   # Pre-aprobados sin prompt
model: sonnet                     # Modelo cuando está activo
effort: high                      # low | medium | high | max
context: fork                     # Ejecutar en subagente aislado
agent: Explore                    # Subagente para context: fork
hooks: { ... }                    # Hooks scoped a este skill
paths: "src/**/*.js"              # Solo activar con estos archivos
---

Instrucciones en Markdown...
$ARGUMENTS = todo tras /nombre
$0, $1 = argumentos posicionales
${CLAUDE_SKILL_DIR} = directorio del skill
${CLAUDE_SESSION_ID} = id de sesión