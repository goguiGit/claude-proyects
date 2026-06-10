# Skills en Claude Code — Guía de referencia

Una skill no es un agente con cerebro propio. Es una capacidad empaquetada que Claude carga en su propia sesión cuando la necesita: instrucciones, herramientas pre-aprobadas y condiciones de activación. La diferencia con un subagente no es de grado sino de naturaleza.

> **Subagente** → alguien a quien delegar.  
> **Skill** → algo que sabes hacer cuando toca.

---

## Dónde viven los archivos

```
.claude/
└── skills/
    ├── mi-skill.md          # skill de proyecto (solo este repo)
    └── otro-skill.md

~/.claude/
└── skills/
    └── global-skill.md      # skill global (todos los proyectos)
```

---

## Esqueleto completo

```markdown
---
name: mi-skill
description: >
  Qué hace esta skill. Claude lee esto para decidir si cargarla.
  Máx. ~250 caracteres visibles. Sé específico.
argument-hint: "<archivo> [--flag]"
disable-model-invocation: false
user-invocable: true
allowed-tools: Read Bash(git *) Glob
model: sonnet
effort: high
context: fork
agent: Explore
paths: "src/**/*.ts"
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: echo "antes de cada Bash"
---

Instrucciones en Markdown normal.

Recibe estos valores en tiempo de ejecución:
- $ARGUMENTS   → todo lo escrito tras /mi-skill
- $0, $1, $2   → argumentos posicionales
- ${CLAUDE_SKILL_DIR}   → directorio de este archivo .md
- ${CLAUDE_SESSION_ID}  → id de la sesión activa
```

---

## Campos campo a campo

### `name`
Identificador del comando slash. `/mi-skill` invoca la skill con `name: mi-skill`.  
Solo letras, números y guiones. Sin espacios.

### `description`
El texto que Claude lee para decidir si activar la skill automáticamente.  
- **Vago** → nunca se activa sola.  
- **Genérico** → se activa cuando no hace falta.  
- **Preciso** → se activa exactamente cuando corresponde.

```yaml
# Malo
description: Ayuda con código

# Bueno
description: >
  Revisa PRs abiertos en GitHub, lista los cambios por archivo
  y genera un resumen de impacto. Úsalo antes de hacer merge.
```

### `argument-hint`
Texto que aparece en el autocompletado del slash command. No afecta la ejecución.

```yaml
argument-hint: "<rama> [--only-failing]"
```

### `disable-model-invocation`
| Valor | Efecto |
|---|---|
| `false` (por defecto) | Claude puede cargarla automáticamente |
| `true` | Solo se activa si el usuario la invoca con `/` |

Úsalo cuando la skill hace algo destructivo o costoso que no debe ejecutarse sin intención explícita.

### `user-invocable`
| Valor | Efecto |
|---|---|
| `true` (por defecto) | Aparece en el menú de slash commands |
| `false` | No aparece; solo Claude puede activarla automáticamente |

### Combinaciones de invocación

| `disable-model-invocation` | `user-invocable` | Quién puede activarla |
|---|---|---|
| `false` | `true` | Cualquiera (por defecto) |
| `true` | `true` | Solo el usuario, vía `/` |
| `false` | `false` | Solo Claude, automáticamente |
| `true` | `false` | Nadie (inutilizable) |

### `allowed-tools`
Herramientas pre-aprobadas durante la ejecución de la skill. El usuario no ve prompts de confirmación para estas herramientas mientras la skill está activa.

```yaml
# Solo lectura, sin preguntar
allowed-tools: Read Glob Grep

# Lectura + comandos git específicos
allowed-tools: Read Bash(git log) Bash(git diff)

# Todo bash (peligroso, solo si sabes lo que haces)
allowed-tools: Bash
```

Es un **contrato de confianza puntual**: los permisos solo aplican durante la ejecución de la skill, no de forma permanente.

### `model`
Modelo que ejecuta esta skill cuando está activa.

```yaml
model: haiku     # rápido y barato, para tareas simples
model: sonnet    # equilibrado (por defecto del proyecto)
model: opus      # máxima capacidad, para análisis complejos
```

### `effort`
Nivel de esfuerzo de razonamiento. Afecta la profundidad del análisis.

```yaml
effort: low      # respuesta rápida, contexto mínimo
effort: medium
effort: high     # análisis profundo
effort: max      # sin restricciones, máximo tokens de pensamiento
```

### `context`
```yaml
context: fork
```
Ejecuta la skill en un subagente aislado. El resultado vuelve al hilo principal sin contaminar el contexto de la conversación. Útil para exploración o tareas con mucho output.

### `agent`
Solo válido con `context: fork`. Especifica qué tipo de subagente usar.

```yaml
context: fork
agent: Explore    # subagente especializado en búsqueda de código
```

### `paths`
Activa la skill solo cuando el archivo activo coincide con el patrón glob.

```yaml
paths: "src/**/*.ts"        # solo archivos TypeScript en src/
paths: "**/*.test.*"        # solo archivos de test
paths: "**"                 # cualquier archivo (comportamiento por defecto)
```

Permite tener decenas de skills sin saturar el contexto: solo entran las relevantes para lo que estás editando.

### `hooks`
Hooks del ciclo de vida con scope local a la skill. Solo se disparan mientras la skill está activa, no afectan el resto del proyecto.

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: echo "ejecutando bash dentro de la skill"
```

---

## Variables en el cuerpo

```markdown
# El usuario escribió: /revisar-pr main --verbose

$ARGUMENTS          → "main --verbose"
$0                  → "main"
$1                  → "--verbose"
${CLAUDE_SKILL_DIR} → /ruta/a/.claude/skills
${CLAUDE_SESSION_ID}→ abc123xyz
```

---

## Ejemplo real: skill de revisión de PR

```markdown
---
name: revisar-pr
description: >
  Revisa el diff del PR actual contra main. Lista cambios por archivo,
  detecta patrones problemáticos y sugiere mejoras. Invócalo antes de
  hacer merge o pedir review.
argument-hint: "[rama-base]"
allowed-tools: Read Bash(git *) Glob Grep
effort: high
---

Revisa el diff entre la rama actual y $0 (o `main` si no se especifica).

1. Ejecuta `git diff $0...HEAD --stat` para ver los archivos cambiados.
2. Para cada archivo modificado, lee el diff completo.
3. Detecta: código duplicado, dependencias nuevas sin justificar,
   tests eliminados, secretos hardcodeados, cambios de comportamiento
   no documentados.
4. Devuelve un resumen estructurado: archivos → hallazgos → veredicto.
```

---

## Skills vs Subagentes — cuándo usar cada uno

| Necesitas... | Usa |
|---|---|
| Reutilizar una secuencia de pasos como comando | **Skill** |
| Ejecutar trabajo en paralelo sin bloquear el hilo | **Subagente** |
| Pre-aprobar herramientas para una tarea específica | **Skill** |
| Aislar trabajo con memoria y estado propios | **Subagente** |
| Activar capacidades según el archivo que editas | **Skill** |
| Delegar una tarea completa y esperar el resultado | **Subagente** |
| Parametrizar una tarea como CLI (`/cmd arg1 arg2`) | **Skill** |
