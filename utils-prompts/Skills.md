# Campos de configuración de una Skill en Claude Code

Cuando creas una skill personalizada en Claude Code, no estás definiendo un worker con su propio cerebro como harías con un subagente, sino empaquetando un conjunto de instrucciones, herramientas y condiciones de activación que Claude puede cargar sobre la marcha, dentro de su propia sesión, cuando detecta que son útiles.

Esa diferencia cambia todo lo que importa al diseñar una skill. Aquí la decisión clave no es qué herramientas le das a un agente independiente, sino cuándo debe Claude traerse esa capacidad al contexto, con qué argumentos, con qué permisos y en qué tipo de archivos.

---

## El esqueleto de una skill

Una skill se define en un archivo Markdown con esta estructura:

```yaml
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
```

Variables disponibles en el cuerpo:

- `$ARGUMENTS` — todo lo escrito tras `/nombre`
- `$0`, `$1`, `$2` — argumentos posicionales
- `${CLAUDE_SKILL_DIR}` — directorio del skill
- `${CLAUDE_SESSION_ID}` — id de sesión

A primera vista el archivo se parece al de un subagente: bloque YAML arriba, Markdown abajo. Pero si te fijas en los campos, casi ninguno coincide con los de un subagente, y esa es precisamente la pista. Los campos de una skill están pensados para responder a preguntas distintas: no "¿cómo se comporta este trabajador?", sino "¿cuándo entra en juego esta capacidad y con qué parámetros?".

---

## Invocación: automática, manual o ambas

La primera característica diferencial de una skill es que puede activarse de dos formas distintas, y tú decides cuáles permites.

Por un lado, Claude puede cargarla automáticamente cuando considere que encaja con la tarea. Para que esto funcione bien, la `description` no es decorativa: es exactamente el texto que Claude lee para decidir si merece la pena traerse la skill al contexto. Una descripción vaga hace que la skill nunca se active; una demasiado genérica hace que se active en situaciones donde no aporta nada.

Por otro lado, el usuario puede invocarla manualmente como un comando slash, del estilo `/mi-skill`, usando el `name` como identificador. Aquí entran los dos campos clave:

- **`disable-model-invocation`** — impide que Claude la active por su cuenta. La skill queda reservada para invocación explícita del usuario.
- **`user-invocable`** — decide si aparece en el menú de comandos slash. Con `false`, la skill existe pero solo Claude puede activarla automáticamente.

Combinando estos dos campos obtienes cuatro comportamientos:

| `disable-model-invocation` | `user-invocable` | Resultado |
|---|---|---|
| `false` | `true` | Ambos pueden activarla (por defecto) |
| `true` | `true` | Solo el usuario, vía `/` |
| `false` | `false` | Solo Claude automáticamente |
| `true` | `false` | Inaccesible en la práctica |

---

## Activación condicional por archivos

Con `paths` puedes indicar que una skill solo sea relevante cuando se están editando ciertos archivos, por ejemplo `src/**/*.js`. Esto significa que una misma instalación puede tener decenas de skills definidas sin saturar el razonamiento del modelo: solo las relevantes para el archivo actual entran en juego.

Es una forma de mantener el contexto limpio que los subagentes no ofrecen de forma nativa. La skill deja de ser "una capacidad siempre disponible" y pasa a ser "una capacidad que aparece cuando hace falta".

---

## Argumentos y variables dinámicas

A diferencia de un subagente, que recibe una instrucción conversacional, una skill puede diseñarse como un comando parametrizado:

- `$ARGUMENTS` contiene todo lo que el usuario escribió después de `/nombre`.
- `$0`, `$1`, etc. son los argumentos posicionales.
- `${CLAUDE_SKILL_DIR}` apunta al directorio donde vive la skill, útil para referenciar archivos de soporte o plantillas que viajan junto a ella.
- `${CLAUDE_SESSION_ID}` identifica la sesión actual, útil para logs o estados persistentes.

`argument-hint` muestra en el autocompletado qué parámetros espera la skill, convirtiéndola en una herramienta autodocumentada. Este diseño acerca las skills a comandos CLI reutilizables más que a prompts sueltos.

---

## Herramientas pre-aprobadas

El campo `allowed-tools` no solo restringe qué puede usar la skill, sino que además pre-aprueba esas herramientas para que no pidan confirmación al usuario mientras la skill está activa.

Es una diferencia sutil pero importante respecto a los subagentes: en una skill, la lista de herramientas actúa como un **contrato de confianza puntual**, válido solo mientras esa skill ejecuta. Especialmente útil en skills de trabajo rutinario con `Bash(git *)` o `Read`, donde pedir permiso en cada paso sería ruido puro.

---

## Aislamiento del contexto

Las skills pueden ejecutarse en el mismo hilo que Claude o en un subagente separado. Con `context: fork`, Claude lanza la skill en un contexto aislado, opcionalmente delegando en un subagente concreto mediante `agent` (por ejemplo, `agent: Explore`).

Esta combinación convierte a las skills en una herramienta de composición real: la skill aporta la definición de la tarea y sus condiciones, y el subagente aporta el entorno aislado para ejecutarla. El resultado regresa al hilo principal sin contaminarlo.

---

## Hooks locales a la skill

Las skills admiten hooks del ciclo de vida, pero limitados al alcance de la skill: solo se disparan mientras esa skill está activa. Esto permite encadenar acciones específicas —validaciones, formateos, notificaciones— sin ensuciar la configuración global del proyecto.

---

## Configuración propia de modelo y esfuerzo

Las skills pueden declarar el modelo que las ejecuta (`model`) y un nivel de esfuerzo (`effort: low | medium | high | max`). La decisión es **por tarea**, no por worker. Una misma conversación puede invocar varias skills con configuraciones distintas, cada una optimizada para lo que hace:

- Una skill de lectura rápida → `effort: low`
- Una skill de refactor complejo → `effort: high` o `max`

---

## La clave conceptual: capacidad activable, no worker

La mejor forma de entender una skill es pensarla como una capacidad que Claude incorpora a su toolkit de manera temporal y condicionada. No es un agente aparte con memoria y personalidad; es un bloque de instrucciones, herramientas pre-aprobadas y variables dinámicas que se activa por nombre, por contexto o por decisión del modelo, y que desaparece cuando ya no hace falta.

> Un subagente es "alguien a quien delegar". Una skill es "algo que sabes hacer cuando toca".

Todas las características vistas —la doble vía de invocación, la activación por rutas, los argumentos dinámicos, los hooks locales, el contexto forkeable— están pensadas para reforzar esa idea.
