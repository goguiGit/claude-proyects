# Hooks de Claude Code: Matchers y Variables de Entorno

> Guía de referencia sobre qué filtra el `matcher` en cada evento y qué variables de entorno están disponibles en los hooks.

---

## Parte 1 — Qué filtra el `matcher` en cada evento

El campo `matcher` es un **regex** que decide si un hook se activa o no. Lo importante es que **lo que filtra cambia según el evento**: en unos filtra el nombre de la herramienta, en otros filtra cómo se inició la sesión, y en otros filtra el nombre de un archivo.

> Si omites el `matcher`, lo dejas vacío (`""`) o pones `"*"`, el hook se activa **siempre** que ocurra ese evento.

---

### Eventos de herramientas — filtra el nombre de la herramienta

Estos son los eventos más usados. El `matcher` se compara contra el campo `tool_name` del JSON que recibe el hook.

**Eventos que filtran por nombre de herramienta:**
`PreToolUse` · `PostToolUse` · `PostToolUseFailure` · `PermissionRequest` · `PermissionDenied`

#### Herramientas built-in

| Matcher | Herramienta |
|---------|-------------|
| `Bash` | Comandos de shell |
| `Edit` | Reemplazar texto en un archivo existente |
| `Write` | Crear o sobrescribir un archivo |
| `MultiEdit` | Múltiples ediciones en un archivo |
| `Read` | Leer contenido de un archivo |
| `Glob` | Buscar archivos por patrón |
| `Grep` | Buscar contenido en archivos con regex |
| `WebFetch` | Obtener contenido de una URL |
| `WebSearch` | Buscar en la web |
| `Agent` | Crear un subagente |
| `AskUserQuestion` | Preguntar al usuario |
| `ExitPlanMode` | Salir del modo plan |
| `Notebook*` | Herramientas de notebook (usando regex con `*`) |

#### Herramientas MCP

El patrón es `mcp__<servidor>__<herramienta>`:

| Matcher | Descripción |
|---------|-------------|
| `mcp__memory__create_entities` | Herramienta específica del servidor Memory |
| `mcp__github__search_repositories` | Herramienta específica del servidor GitHub |
| `mcp__memory__.*` | Todas las herramientas del servidor Memory |
| `mcp__.*__write.*` | Cualquier herramienta con "write" de cualquier servidor |

> Como el `matcher` es regex, puedes combinar con pipe: `Edit|Write|MultiEdit` activa el hook cuando Claude edita o escribe cualquier archivo.

#### Ejemplo — Formatear código solo después de ediciones de archivo

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null; exit 0"
          }
        ]
      }
    ]
  }
}
```

#### Ejemplo — Auditar todas las operaciones del servidor MCP de memoria

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Memory MCP operation\" >> ~/mcp-audit.log"
          }
        ]
      }
    ]
  }
}
```

---

### `SessionStart` — filtra cómo se inició la sesión

El `matcher` se compara contra el campo `source` del JSON, que indica cómo arrancó la sesión.

| Valor | Descripción |
|-------|-------------|
| `startup` | Sesión nueva (el usuario ejecutó `claude`) |
| `resume` | Sesión reanudada con `--resume`, `--continue` o `/resume` |
| `clear` | Después de ejecutar `/clear` |
| `compact` | Después de una compactación automática o manual |

> Esto es muy útil para distinguir comportamientos. Por ejemplo, puedes re-inyectar contexto crítico **solo después de compactación** (cuando Claude "olvida" información), sin ejecutar el hook en cada inicio normal.

#### Ejemplo — Re-inyectar contexto solo después de compactación

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'RECORDATORIO: Este proyecto usa Python 3.12 con FastAPI. BD: PostgreSQL. Todos los endpoints requieren validación Pydantic.'"
          }
        ]
      }
    ]
  }
}
```

> El `stdout` de `SessionStart` se añade como contexto visible para Claude, así que lo que imprimas con `echo` llegará directamente al modelo.

#### Ejemplo — Cargar variables de entorno solo en sesiones nuevas

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/setup-env.sh"
          }
        ]
      }
    ]
  }
}
```

---

### `SessionEnd` — filtra por qué terminó la sesión

| Valor | Descripción |
|-------|-------------|
| `clear` | El usuario ejecutó `/clear` |
| `resume` | El usuario cambió de sesión con `/resume` interactivo |
| `logout` | El usuario cerró sesión |
| `prompt_input_exit` | El usuario salió mientras la entrada de prompt estaba visible |
| `bypass_permissions_disabled` | Se deshabilitó el modo bypass de permisos |
| `other` | Cualquier otra razón de cierre |

#### Ejemplo — Guardar un log solo cuando la sesión termina normalmente

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "other|prompt_input_exit",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Sesión finalizada\" >> .claude/logs/sessions.log"
          }
        ]
      }
    ]
  }
}
```

> Los hooks `SessionEnd` tienen un timeout por defecto de solo **1.5 segundos**. Si necesitas más tiempo, establece la variable de entorno `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` antes de lanzar Claude Code.

---

### `Notification` — filtra el tipo de notificación

| Valor | Descripción |
|-------|-------------|
| `permission_prompt` | Claude necesita que apruebes un permiso |
| `idle_prompt` | Claude ha estado inactivo y necesita tu atención |
| `auth_success` | Autenticación completada con éxito |
| `elicitation_dialog` | Un servidor MCP pide input del usuario |

#### Ejemplo — Notificación de escritorio solo cuando se requieren permisos

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude necesita permisos\" with title \"⚠️ Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

---

### `SubagentStart` y `SubagentStop` — filtra el tipo de agente

| Valor | Descripción |
|-------|-------------|
| `Bash` | Subagente de tipo Bash |
| `Explore` | Subagente de exploración |
| `Plan` | Subagente de planificación |
| `<nombre>` | Cualquier nombre de agente custom definido en `.claude/agents/` |

#### Ejemplo — Inyectar contexto de seguridad a subagentes de exploración

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "Explore",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"No leas archivos .env ni .key\"}}'"
          }
        ]
      }
    ]
  }
}
```

---

### `ConfigChange` — filtra la fuente de configuración

| Valor | Descripción |
|-------|-------------|
| `user_settings` | Cambios en `~/.claude/settings.json` |
| `project_settings` | Cambios en `.claude/settings.json` |
| `local_settings` | Cambios en `.claude/settings.local.json` |
| `policy_settings` | Cambios en managed policy settings (admin) |
| `skills` | Cambios en archivos de `.claude/skills/` |

> **Nota:** Los cambios en `policy_settings` no pueden ser bloqueados por hooks, aunque el hook sí se ejecuta (útil para auditoría).

#### Ejemplo — Auditar cualquier cambio en la configuración del proyecto

```json
{
  "hooks": {
    "ConfigChange": [
      {
        "matcher": "project_settings|local_settings",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Config changed\" >> .claude/logs/config-audit.log"
          }
        ]
      }
    ]
  }
}
```

---

### `FileChanged` — filtra por nombre de archivo (basename)

A diferencia del resto de matchers, aquí el `matcher` especifica **qué archivos vigilar**. Es una lista separada por pipes de nombres de archivo (sin ruta, solo el basename).

| Matcher | Descripción |
|---------|-------------|
| `.envrc` | Solo el archivo `.envrc` |
| `.env` | Solo el archivo `.env` |
| `.envrc\|.env` | Ambos archivos |
| `package.json` | El archivo `package.json` |
| `Dockerfile` | El Dockerfile |

> Este hook es especialmente útil combinado con `CLAUDE_ENV_FILE` para recargar variables de entorno automáticamente cuando cambian archivos de configuración.

#### Ejemplo — Recargar variables cuando cambia `.envrc`

```json
{
  "hooks": {
    "FileChanged": [
      {
        "matcher": ".envrc|.env",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/reload-env.sh"
          }
        ]
      }
    ]
  }
}
```

**Script `reload-env.sh`:**

```bash
#!/bin/bash
# Recargar variables cuando cambia .envrc o .env
if [ -n "$CLAUDE_ENV_FILE" ]; then
    if [ -f .envrc ]; then
        direnv export bash >> "$CLAUDE_ENV_FILE" 2>/dev/null
    fi
fi
exit 0
```

---

### `StopFailure` — filtra el tipo de error

| Valor | Descripción |
|-------|-------------|
| `rate_limit` | Límite de tasa alcanzado |
| `authentication_failed` | Fallo de autenticación |
| `billing_error` | Error de facturación |
| `invalid_request` | Petición inválida |
| `server_error` | Error del servidor |
| `max_output_tokens` | Se alcanzó el límite máximo de tokens de salida |
| `unknown` | Error no identificado |

#### Ejemplo — Alerta específica para rate limits

```json
{
  "hooks": {
    "StopFailure": [
      {
        "matcher": "rate_limit",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Rate limit alcanzado. Espera antes de continuar.'"
          }
        ]
      }
    ]
  }
}
```

---

### `InstructionsLoaded` — filtra la razón de carga

| Valor | Descripción |
|-------|-------------|
| `session_start` | Archivos cargados al iniciar sesión |
| `nested_traversal` | Carga lazy al acceder a un subdirectorio con su propio `CLAUDE.md` |
| `path_glob_match` | Carga lazy cuando una regla condicional con `paths:` coincide |
| `include` | Archivo cargado por inclusión desde otro archivo de instrucciones |
| `compact` | Archivos recargados después de una compactación |

> Este evento es **solo de observación**: no puedes bloquear ni modificar la carga de instrucciones.

---

### `PreCompact` y `PostCompact` — filtra qué disparó la compactación

| Valor | Descripción |
|-------|-------------|
| `manual` | El usuario ejecutó `/compact` |
| `auto` | Compactación automática cuando la ventana de contexto se llenó |

---

### `Elicitation` y `ElicitationResult` — filtra el servidor MCP

El `matcher` se compara contra el **nombre del servidor MCP** que está solicitando input del usuario. Los valores dependen de los servidores MCP que tengas configurados.

---

### Eventos sin soporte de `matcher`

Los siguientes eventos no soportan matchers y **se disparan siempre**. Si añades un campo `matcher`, será ignorado silenciosamente.

| Evento | Cuándo se dispara |
|--------|-------------------|
| `UserPromptSubmit` | Al enviar un prompt |
| `Stop` | Cuando Claude termina de responder |
| `TeammateIdle` | Cuando un teammate va a entrar en idle |
| `TaskCreated` | Al crear una tarea |
| `TaskCompleted` | Al completar una tarea |
| `WorktreeCreate` | Al crear un worktree |
| `WorktreeRemove` | Al eliminar un worktree |
| `CwdChanged` | Al cambiar de directorio |

---

## Parte 2 — Variables de entorno disponibles en hooks

Los hooks tienen acceso a ciertas variables de entorno que Claude Code establece automáticamente. Además, reciben datos del evento como **JSON por stdin** (en hooks de tipo `command`) o como **body del POST** (en hooks HTTP).

> No confundas las variables de entorno (accesibles con `$VARIABLE`) con los campos JSON (accesibles con `jq`).

---

### Variables disponibles en todos los hooks

#### `$CLAUDE_PROJECT_DIR`

Ruta absoluta a la raíz del proyecto. Es la variable más usada para referenciar scripts relativos al proyecto. Siempre envuélvela en comillas para manejar rutas con espacios.

```json
{
  "type": "command",
  "command": "python3 \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/mi-hook.py"
}
```

#### `$CLAUDE_CODE_REMOTE`

Se establece como `"true"` cuando Claude Code se ejecuta en un entorno web remoto. No se establece en la CLI local.

```bash
#!/bin/bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
    echo "Ejecutando en entorno remoto, saltando notificación de escritorio"
    exit 0
fi
osascript -e 'display notification "Tarea completada" with title "Claude Code"'
```

---

### Variable para persistir variables de sesión

#### `$CLAUDE_ENV_FILE`

Disponible **solo** en: `SessionStart`, `CwdChanged` y `FileChanged`.

Contiene la ruta a un archivo temporal donde puedes escribir sentencias `export` que se aplicarán a todos los comandos Bash subsiguientes de la sesión.

> Usa append (`>>`) para no sobreescribir variables establecidas por otros hooks.

```bash
#!/bin/bash
# .claude/hooks/setup-env.sh (hook de SessionStart)
if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo 'export NODE_ENV=development' >> "$CLAUDE_ENV_FILE"
    echo 'export PYTHONDONTWRITEBYTECODE=1' >> "$CLAUDE_ENV_FILE"
    echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

**Patrón avanzado** — capturar variables de entorno de un script de setup (como `nvm use`) comparando el estado antes y después:

```bash
#!/bin/bash
ENV_BEFORE=$(export -p | sort)

# Ejecutar setup que modifica el entorno
source ~/.nvm/nvm.sh
nvm use 20

if [ -n "$CLAUDE_ENV_FILE" ]; then
    ENV_AFTER=$(export -p | sort)
    comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

---

### Lo que NO son variables de entorno (son campos JSON)

Un error común es confundir los datos que llegan por JSON stdin con variables de entorno. Los siguientes datos llegan como parte del **JSON del evento** y se acceden con `jq`, no con `$VARIABLE`:

| Campo JSON | Descripción |
|------------|-------------|
| `session_id` | Identificador de la sesión actual |
| `transcript_path` | Ruta al archivo JSON de la conversación |
| `cwd` | Directorio de trabajo actual |
| `permission_mode` | Modo de permisos activo (`"default"`, `"auto"`, `"plan"`, etc.) |
| `hook_event_name` | Nombre del evento que se disparó |
| `tool_name` | Nombre de la herramienta (en eventos de tool) |
| `tool_input` | Parámetros de la herramienta (en eventos de tool) |

**Acceder desde Bash:**

```bash
#!/bin/bash
input=$(cat)  # Leer todo el JSON de stdin
session_id=$(echo "$input" | jq -r '.session_id')
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
command=$(echo "$input" | jq -r '.tool_input.command // empty')
```

**Acceder desde Python:**

```python
import sys, json

data = json.load(sys.stdin)
session_id = data.get("session_id", "unknown")
tool_name = data.get("tool_name", "")
```

---

### Variable para el timeout de `SessionEnd`

#### `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`

No es una variable que usen los hooks internamente, sino que la estableces **antes de lanzar Claude Code** para controlar cuánto tiempo pueden tardar los hooks de `SessionEnd`.

El valor por defecto es **1500 ms** (1.5 segundos), que es bastante corto. Si tus hooks de limpieza necesitan más tiempo:

```bash
CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=5000 claude
```

---

### Nota sobre `$CLAUDECODE`

La variable `CLAUDECODE` (sin guion bajo) se establece como `1` en los shells que Claude Code genera con la herramienta Bash y en sesiones tmux. **Pero no se establece dentro de hooks.** No la uses en tus scripts de hooks porque siempre estará vacía.

> Existe para que tus scripts normales (no hooks) puedan detectar si están ejecutándose dentro de un shell de Claude Code.

---

## Resumen rápido

| Evento | El matcher filtra... |
|--------|----------------------|
| `PreToolUse`, `PostToolUse`, etc. | Nombre de la herramienta (`Bash`, `Edit`, `mcp__*`, ...) |
| `SessionStart` | Cómo arrancó la sesión (`startup`, `resume`, `clear`, `compact`) |
| `SessionEnd` | Por qué terminó la sesión (`clear`, `logout`, `other`, ...) |
| `Notification` | Tipo de alerta (`permission_prompt`, `idle_prompt`, ...) |
| `SubagentStart/Stop` | Tipo de agente (`Bash`, `Explore`, `Plan`, nombre custom) |
| `ConfigChange` | Fuente de configuración (`user_settings`, `project_settings`, ...) |
| `FileChanged` | Nombre del archivo vigilado (`.env`, `package.json`, ...) |
| `StopFailure` | Tipo de error (`rate_limit`, `server_error`, ...) |
| `InstructionsLoaded` | Razón de carga (`session_start`, `compact`, ...) |
| `PreCompact/PostCompact` | Quién disparó la compactación (`manual`, `auto`) |
| `UserPromptSubmit`, `Stop`, `CwdChanged`, etc. | Sin soporte de matcher — siempre activo |

| Variable de entorno | Disponible en | Para qué sirve |
|---------------------|---------------|----------------|
| `$CLAUDE_PROJECT_DIR` | Todos los hooks | Ruta raíz del proyecto |
| `$CLAUDE_CODE_REMOTE` | Todos los hooks | Detectar entorno web remoto |
| `$CLAUDE_ENV_FILE` | `SessionStart`, `CwdChanged`, `FileChanged` | Persistir variables de sesión |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | Variable de lanzamiento | Controlar timeout de hooks `SessionEnd` |
