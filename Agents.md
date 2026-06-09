# Subagentes en Claude Code: Configuración y estructura

## Anatomía de un subagente

Un subagente en Claude Code se define mediante un archivo Markdown que combina dos elementos con responsabilidades distintas: el **frontmatter** y el **system prompt**.

El frontmatter ocupa la sección inicial del archivo, delimitada por dos bloques `---`, y está escrito en YAML. Actúa como la capa de metadatos y configuración: le indica a Claude Code qué es ese subagente, cuándo debe invocarlo y con qué restricciones o capacidades debe operar. El cuerpo del archivo, en cambio, funciona como su system prompt: define cómo debe razonar y actuar una vez que ha sido activado.

```yaml
---
name: mi-agente              # Identificador único, minúsculas y guiones
description: >               # CRÍTICO: Claude usa esto para decidir cuándo delegar
  Descripción clara de cuándo usar este agente.
  Incluir "Use proactively" fomenta delegación automática.
tools: Read, Grep, Glob      # Herramientas permitidas (allowlist); acepta Agent(nombre) para restringir subagentes invocables
disallowedTools: Write, Edit  # Herramientas prohibidas (denylist); se aplica antes que tools si ambos están presentes
model: sonnet                 # sonnet | opus | haiku | inherit | ID completo (ej: claude-opus-4-8). Default: inherit
permissionMode: default       # default | acceptEdits | auto | dontAsk | bypassPermissions | plan
                              # Ignorado en subagentes de plugins
maxTurns: 20                  # Máximo de turnos antes de detener la ejecución
skills:                       # Skills precargados en el contexto del subagente
  - api-conventions
mcpServers:                   # Servidores MCP disponibles para este subagente (ignorado en plugins)
  - github                    # Referencia a un MCP ya configurado globalmente
  - playwright:               # Definición inline (disponible solo para este subagente)
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
hooks:                        # Hooks del ciclo de vida (ignorado en plugins)
  PreToolUse: [...]
memory: project               # user | project | local — memoria persistente entre sesiones
background: false             # true para ejecutar siempre en segundo plano
effort: medium                # low | medium | high | xhigh | max; los niveles disponibles dependen del modelo
isolation: worktree           # Copia aislada del repositorio mediante git worktree
color: blue                   # Identificación visual: red, blue, green, yellow, purple, orange, pink, cyan
initialPrompt: |              # Se auto-envía como primer turno cuando el agente se lanza con --agent o como sesión principal
  Revisa el estado actual del proyecto antes de comenzar.
---

Aquí comienza el system prompt en Markdown.
Este contenido reemplaza íntegramente el system prompt de Claude Code.
El subagente no recibe el system prompt completo del hilo principal,
únicamente este texto más los detalles básicos del entorno de ejecución.
```

---

## El frontmatter: configuración frente a comportamiento

La distinción fundamental al diseñar subagentes es la siguiente:

| Sección | Función |
|---|---|
| **Frontmatter** | Define el *entorno* del subagente: permisos, modelo, herramientas, ciclo de vida. |
| **Cuerpo del archivo** | Define la *conducta* del subagente: razonamiento, instrucciones, restricciones lógicas. |

El frontmatter no es documentación accesoria. Es el mecanismo que convierte un prompt suelto en un worker especializado, reutilizable y controlado dentro del sistema de agentes. Gracias a él, Claude Code puede tomar decisiones de delegación de forma autónoma, restringir el acceso a herramientas sensibles y aplicar políticas como aislamiento de repositorio, memoria persistente o número máximo de turnos.

Dos subagentes con prompts similares pueden comportarse de forma radicalmente diferente si sus frontmatters difieren: uno puede ser de solo lectura y ejecutarse con un modelo ligero para tareas de exploración rápida; el otro puede disponer de herramientas de escritura, un modelo más capaz y más turnos disponibles para tareas de alta complejidad.

---

## Referencia de campos

Solo `name` y `description` son obligatorios. El resto son opcionales.

### `name`
Identificador único del subagente, en minúsculas con guiones. Es el valor que reciben los hooks como `agent_type` y el que aparece en la interfaz. No es necesario que coincida con el nombre del archivo.

### `description`
El campo más relevante para la delegación automática. Claude Code lo utiliza para decidir si debe invocar el subagente ante una petición determinada. Debe describir con precisión qué hace el agente y, especialmente, en qué situaciones es apropiado usarlo. Incluir `Use proactively` promueve la delegación sin que el usuario tenga que solicitarlo explícitamente.

### `tools` / `disallowedTools`
Controlan la superficie de herramientas disponible para el subagente. `tools` define una allowlist; `disallowedTools` define una denylist. Cuando ambos están presentes, `disallowedTools` se aplica primero y `tools` se resuelve contra el conjunto resultante.

`tools` también acepta la sintaxis `Agent(nombre)` para restringir qué subagentes puede invocar este agente cuando se ejecuta como sesión principal via `--agent`:

```yaml
tools: Agent(worker, researcher), Read, Bash
# Solo puede invocar los subagentes "worker" y "researcher"
```

### `model`
Especifica el modelo que utilizará el subagente. Acepta los valores `sonnet`, `opus`, `haiku`, `inherit` o un identificador de modelo completo (por ejemplo, `claude-opus-4-8`). Si se omite, el valor por defecto es `inherit`, que comparte el modelo del hilo principal.

### `effort`
Nivel de esfuerzo cognitivo del subagente. Sobreescribe el nivel de la sesión principal. Opciones: `low`, `medium`, `high`, `xhigh`, `max`. Los niveles disponibles dependen del modelo utilizado.

### `initialPrompt`
Texto que se auto-envía como primer turno del usuario cuando el agente se lanza como sesión principal mediante `--agent` o la configuración `agent`. Admite comandos y skills. Se antepone a cualquier prompt que proporcione el usuario.

### `memory`
Habilita un directorio de memoria persistente que sobrevive entre conversaciones. Acepta tres ámbitos:

| Valor | Ubicación | Cuándo usarlo |
|---|---|---|
| `user` | `~/.claude/agent-memory/<nombre>/` | El conocimiento aplica a todos los proyectos |
| `project` | `.claude/agent-memory/<nombre>/` | El conocimiento es específico del proyecto y compartible via control de versiones |
| `local` | `.claude/agent-memory-local/<nombre>/` | Específico del proyecto pero no debe subirse al repositorio |

### `permissionMode`
Controla cómo gestiona el subagente los prompts de permisos. **Este campo se ignora en subagentes distribuidos como plugins.**

| Valor | Comportamiento |
|---|---|
| `default` | Verificación estándar con prompts |
| `acceptEdits` | Acepta automáticamente ediciones de archivos en el directorio de trabajo |
| `auto` | Modo automático con clasificador en segundo plano |
| `dontAsk` | Deniega automáticamente los prompts de permiso |
| `bypassPermissions` | Omite todos los prompts de permiso |
| `plan` | Modo solo lectura (exploración) |

### `hooks` / `mcpServers`
Ambos campos se ignoran en subagentes distribuidos mediante plugins. Para usarlos, copia el archivo del subagente a `.claude/agents/` o `~/.claude/agents/`.

---

Sources:
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
