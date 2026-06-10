# Lectura: Skills vs Subagentes vs Memoria vs Hooks

A medida que trabajas más con Claude Code, llega un momento en que deja de ser solo "un asistente que responde prompts" y empieza a parecerse más a un sistema de trabajo. Ahí es donde entran cuatro piezas que conviene diferenciar bien: CLAUDE.md, skills, subagentes y hooks. Anthropic los presenta como mecanismos distintos para organizar comportamiento, contexto y automatización dentro de Claude Code.

Mucha gente entiende rápido para qué sirve CLAUDE.md, pero duda con esta parte:
> "¿Esto debería ser una skill o un subagente?"

Esa es la decisión importante, porque aunque ambos ayudan a especializar a Claude, resuelven problemas distintos.

Las skills empaquetan conocimiento y procesos reutilizables; los subagentes delegan trabajo a agentes especializados con contexto separado y, en algunos casos, restricciones de herramientas.

---

## La idea general: cada pieza resuelve una necesidad distinta

Antes de comparar skills y subagentes, conviene tener este mapa mental:

- **CLAUDE.md**: reglas y contexto persistente del proyecto.
- **Skill**: una receta reutilizable, normalmente expresada como instrucciones, ejemplos, plantillas o scripts.
- **Subagente**: un agente especializado al que Claude puede delegar una tarea concreta.
- **Hook**: una automatización determinista que debe ejecutarse sí o sí en un punto del flujo.

Dicho de forma simple:

- Si quieres que Claude **sepa cómo hacer algo** de una forma concreta, piensa en una **skill**.
- Si quieres que Claude **delegue una tarea especializada** a otro agente, piensa en un **subagente**.
- Si quieres que una acción **ocurra siempre**, sin depender de la decisión del modelo, piensa en un **hook**.

---

## Qué es una skill y cuándo merece la pena crearla

Las skills en Claude Code son unidades reutilizables de comportamiento. Según la documentación oficial, son una forma de extender Claude con instrucciones, recursos auxiliares y lógica de uso para tareas específicas. Pueden incluir SKILL.md, ejemplos, scripts y otros archivos de apoyo, y Claude puede invocarlas automáticamente si su descripción encaja con la tarea o manualmente mediante `/nombre-de-skill`.

Una skill tiene sentido cuando el problema principal no es "quién hace el trabajo", sino **cómo quieres que se haga**.

### Señales claras de que necesitas una skill

**1. Repites la misma receta una y otra vez.**
Si cada semana vuelves a escribir algo como "primero analiza, luego resume, luego conviértelo a formato X y luego valida Y", ya tienes una skill esperando nacer. Anthropic recomienda usar skills precisamente para encapsular playbooks y procedimientos repetibles.

**2. Una parte de CLAUDE.md ya no es una regla, sino un proceso largo.**
CLAUDE.md debería contener hechos del proyecto y preferencias persistentes. Cuando empiezas a meter flujos de 20 pasos, plantillas, instrucciones condicionales y ejemplos extensos, normalmente esa parte ya encaja mejor como skill.

**3. Quieres empaquetar instrucciones + ejemplos + scripts.**
La documentación de skills contempla precisamente esto: una skill puede incluir materiales de referencia, salidas de ejemplo y scripts ejecutables para apoyar la tarea.

**4. Quieres reutilizar una salida con formato o estándar de calidad fijo.**
Por ejemplo:
- redactar posts de LinkedIn,
- generar PRDs,
- auditar automatizaciones,
- revisar APIs con una checklist,
- crear changelogs,
- documentar incidentes.

En todos esos casos, una skill permite que Claude siga un marco repetible.

**5. Quieres que el comportamiento completo solo se cargue cuando sea necesario.**
Una ventaja importante es que las skills funcionan como contexto especializado que Claude usa cuando corresponde, en vez de inflar el contexto general de todas las conversaciones.

### Ejemplos donde una skill encaja muy bien

- `/crear-post-linkedin`: usa una plantilla, revisa ejemplos, ajusta tono, devuelve varias versiones.
- `/auditar-workflow-n8n`: revisa robustez, nomenclatura, logs, fallos y mantenibilidad.
- `/generar-prd`: sigue una estructura fija, rellena apartados y evita ambigüedades.
- `/review-api`: comprueba naming, errores, autenticación, consistencia y DX.

En todos estos casos, el valor está en el **playbook**. Claude necesita un buen marco, no necesariamente otro agente distinto.

---

## Qué es un subagente y cuándo conviene usarlo

Los subagentes son agentes especializados a los que Claude puede delegar trabajo. Anthropic explica que Claude Code incluye varios subagentes integrados, como Explore, Plan y otros de propósito general, y también permite crear subagentes personalizados para tareas específicas. Claude usa la descripción del subagente para decidir cuándo delegar.

La clave aquí es que un subagente no es solo "más instrucciones". Es otra unidad de trabajo, con un papel definido, y puede operar con un tipo de contexto o conjunto de herramientas diferente. Por ejemplo, Anthropic documenta que el subagente Explore está optimizado para búsqueda y análisis de código, usa un modelo rápido y tiene acceso solo de lectura.

### Señales claras de que necesitas un subagente

**1. Quieres separar el trabajo especializado del hilo principal.**
Si la tarea requiere mucha exploración, búsqueda de archivos, análisis intermedio o razonamiento auxiliar, puede ser mejor que un subagente haga ese trabajo y luego devuelva una síntesis o resultado. Esto evita mezclar demasiada exploración con el flujo principal.

**2. La tarea es más "rol especializado" que "receta de formato".**
Por ejemplo:
- explorador de código,
- revisor de seguridad,
- analista de rendimiento,
- arquitecto de planificación,
- investigador del repo.

Eso encaja muy bien con un subagente, porque lo importante es el **perfil operativo** del agente.

**3. Quieres limitar o especializar herramientas.**
Un buen ejemplo oficial es Explore: un subagente rápido, orientado a exploración y con herramientas de solo lectura. Ese tipo de especialización no es solo prompt; es una configuración de trabajo.

**4. Necesitas dividir una tarea grande en piezas y delegarlas.**
Si pides algo como "revisa todos mis cambios recientes en busca de problemas de seguridad" o "ejecuta tests y corrige fallos", Claude puede usar subagentes especializados automáticamente cuando la tarea lo merece.

**5. Quieres un "worker" reutilizable para una categoría de tareas.**
Aquí la palabra clave es **worker**. Una skill te da un procedimiento. Un subagente te da un especialista. Esa diferencia es muy útil.

### Ejemplos donde un subagente encaja muy bien

- **Subagente de seguridad**: inspecciona cambios, dependencias, secretos, validaciones y superficies de ataque.
- **Subagente de exploración**: busca archivos, entiende arquitectura y devuelve mapa del repo.
- **Subagente de planificación**: propone estrategia de implementación antes de tocar código.
- **Subagente de rendimiento**: detecta cuellos de botella, queries caras, loops innecesarios y puntos de caching.

Aquí el valor está en la **delegación a una especialidad**, no tanto en una plantilla de salida.

---

## Skill vs subagente: la diferencia de fondo

La confusión entre ambos suele venir de que los dos "especializan" a Claude. Pero no lo hacen del mismo modo.

### Una skill especializa el método
Una skill dice:
> "Cuando aparezca este tipo de tarea, sigue este playbook, usa estos recursos, este tono, esta plantilla y esta validación."

Es un marco **procedural y de conocimiento**.

### Un subagente especializa al ejecutor
Un subagente dice:
> "Cuando aparezca esta clase de problema, delégaselo a este agente especializado, que está pensado para hacer este trabajo concreto."

Es una especialización de **rol, delegación y contexto operativo**.

---

## Una comparación muy práctica

Imagina que trabajas en marketing técnico.

**Caso A: quieres que Claude escriba siempre tus posts con cierta estructura**
Necesitas: hook inicial, desarrollo claro, CTA final, tono profesional, validación de longitud.
→ Eso es una **skill**.

**Caso B: quieres que Claude analice una carpeta de contenidos y detecte patrones, errores de posicionamiento y oportunidades**
→ Eso encaja mejor con un **subagente analista**.

**Caso C: quieres ambas cosas**
Primero un subagente analiza y extrae insights. Después una skill transforma esos insights en un artículo o post.
Esta combinación, de hecho, suele ser muy potente.

---

## Cuándo elegir una skill y cuándo un subagente: tabla mental rápida

| Usa una **skill** cuando... | Usa un **subagente** cuando... |
|---|---|
| el valor está en el procedimiento | el valor está en la especialización del rol |
| necesitas una plantilla o formato | quieres delegar una sub-tarea |
| quieres ejemplos de salida | necesitas exploración o análisis separado |
| quieres empaquetar scripts o validaciones | quieres aprovechar herramientas o restricciones específicas |
| repites una receta exacta | la tarea se parece más a "pon a alguien experto a hacer esto" |

---

## Cuándo no crear una skill

No todo merece una skill. No la crees si:

- la instrucción es una regla corta y estable del proyecto;
- solo ocurre una vez;
- lo que necesitas no es un playbook sino una automatización obligatoria;
- el flujo es demasiado pequeño para justificar mantenimiento.

En esos casos, probablemente vaya mejor en CLAUDE.md o en un hook. Los hooks están pensados para control determinista y automatización en puntos concretos del ciclo de vida de Claude Code.

> **Ejemplo:** "Siempre ejecutar lint antes de terminar" puede vivir en CLAUDE.md. "Bloquear acciones si falla una validación" ya suena más a hook.

---

## Cuándo no crear un subagente

Tampoco todo necesita un subagente. No lo crees si:

- solo necesitas un formato de respuesta,
- la lógica es básicamente una plantilla,
- no hay delegación real de trabajo,
- no necesitas un rol separado,
- la tarea es lineal y se resuelve bien con una skill.

Un error común es intentar usar subagentes para cosas que en realidad son solo "prompts largos con estructura". Si lo que quieres es una receta, no un especialista, normalmente basta con una skill.

---

## Un marco de decisión en 5 preguntas

Antes de crear nada, pregúntate esto:

1. **¿Lo repito mucho?** Si no se repite, quizá no merece estructura.
2. **¿Lo importante es el formato/proceso o la especialidad?** Proceso = skill. Especialidad = subagente.
3. **¿Necesito ejemplos, plantillas o scripts?** Eso favorece una skill.
4. **¿Necesito separar exploración, análisis o trabajo auxiliar del hilo principal?** Eso favorece un subagente.
5. **¿Debe ejecutarse sí o sí, sin depender del modelo?** Entonces probablemente no necesitas ni skill ni subagente, sino un hook.

---

## Combinarlas suele ser mejor que elegir solo una

En la práctica, muchas veces no compiten: se complementan.

Un patrón muy bueno es este:
- **subagente** para explorar, investigar o analizar;
- **skill** para convertir ese trabajo en una salida consistente;
- **hook** para garantizar validaciones automáticas.

**Ejemplo realista:**
1. Un subagente explora el repo y detecta componentes, endpoints y dependencias.
2. Una skill genera el PRD o la documentación técnica con plantilla fija.
3. Un hook comprueba formato o ejecuta tests antes de cerrar el trabajo.

Ese modelo es muy potente porque cada pieza hace lo suyo.

---

## Regla final para no equivocarte

> Si lo que estás construyendo se parece a un **manual de trabajo** → crea una **skill**.
> Si se parece a un **perfil profesional especializado** → crea un **subagente**.
> Si se parece a una **regla que debe ejecutarse siempre** → crea un **hook**.
> Si se parece a una **norma estable del proyecto** → llévalo a **CLAUDE.md**.

---

## Conclusión

Las skills personalizadas merecen la pena cuando quieres capturar y reutilizar una forma concreta de trabajar. Son ideales para procesos repetidos, formatos estables, plantillas, ejemplos y validaciones. Los subagentes, en cambio, brillan cuando necesitas delegar tareas a especialistas con un papel claro, especialmente si hay exploración, análisis separado o restricciones de herramientas.

La pregunta correcta no es solo "¿qué puedo personalizar?", sino:
> **"¿Quiero definir un método o quiero crear un especialista?"**

Si respondes eso bien, casi siempre sabrás si necesitas una skill o un subagente.
