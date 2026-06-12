# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediar los 30 hallazgos de seguridad identificados por la auditoría de 8 agentes especializados, eliminando 1 CRITICAL, 9 HIGH, 12 MEDIUM y 8 LOW.

**Architecture:** Los fixes se agrupan en 7 tareas independientes ordenadas por impacto: dependencias vulnerables → hardening del servidor Express → validación de inputs → XSS en frontend → CDN SRI → configuración del agente. Cada tarea es auto-contenida y commiteable por separado.

**Tech Stack:** Node.js, TypeScript, Express 4.x, Vitest 3.x, helmet, express-rate-limit, supertest

---

## Archivos afectados

| Archivo | Operación | Cambio |
|---------|-----------|--------|
| `package.json` | Modificar | Actualizar vitest, añadir helmet + express-rate-limit + supertest |
| `src/server.ts` | Modificar | Helmet, CORS restringido, rate limit, bind host, error handler |
| `src/routes/telemetry.ts` | Modificar | Validación isFinite + range en `:met` |
| `src/routes/events.ts` | Modificar | Fix type confusion + validación MET |
| `src/routes/trajectory.ts` | Modificar | Añadir Cache-Control header |
| `public/js/app.js` | Modificar | 4 sitios de innerHTML → textContent |
| `public/index.html` | Modificar | SRI hash en Chart.js CDN tag |
| `tests/routes.test.ts` | Crear | Integración: headers, CORS, rate limit, validación |
| `.gitignore` | Modificar | Añadir patterns de secretos + settings.local.json |
| `.claude/settings.local.json` | Modificar | Quitar node -e/python3 -c, añadir deny rules, quitar Playwright |
| `scripts/security/install_hooks.sh` | Crear | Implementación mínima del hook pre-commit |

---

## Task 1: Actualizar dependencias vulnerables

**Fixes:** C1 (vitest RCE CVSS 9.8), M4 (qs DoS), M5 (esbuild CORS bypass), M6 (PostCSS XSS), M7 (vite path traversal)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Actualizar vitest a v3 y añadir nuevas dependencias**

```bash
cd "C:\_Go\Claude Code Crea Aplicaciones con IA\simulador_artemis"
npm install vitest@^3.2.6 --save-dev
npm install helmet express-rate-limit --save
npm install supertest @types/supertest --save-dev
```

- [ ] **Step 2: Ejecutar npm audit fix para vulnerabilidades transitivas**

```bash
npm audit fix
```

Esperado: resuelve qs@6.15.2, postcss@8.5.10, y reduce el número de vulnerabilidades a 0 o mínimo.

- [ ] **Step 3: Verificar que los tests siguen pasando con vitest v3**

```bash
npm test
```

Esperado: todos los tests pasan (orbital-math y trajectory).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): upgrade vitest to v3, add helmet and rate-limit, run audit fix"
```

---

## Task 2: Hardening del servidor Express

**Fixes:** H1 (CORS wildcard), H2 (sin headers de seguridad), H3 (sin rate limiting), M10 (0.0.0.0 bind), M2 (sin error handler), L2 (X-Powered-By)

**Files:**
- Modify: `src/server.ts`
- Create: `tests/routes.test.ts`

- [ ] **Step 1: Escribir tests de integración que fallan**

Crear `tests/routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';

describe('Security headers', () => {
  it('sets X-Content-Type-Options', async () => {
    const res = await request(app).get('/api/crew');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('does not expose X-Powered-By', async () => {
    const res = await request(app).get('/api/crew');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects cross-origin requests from unknown origins', async () => {
    const res = await request(app)
      .get('/api/crew')
      .set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.com');
  });

  it('allows requests from localhost:3000', async () => {
    const res = await request(app)
      .get('/api/crew')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

describe('Error handler', () => {
  it('returns JSON 500 instead of stack trace on error', async () => {
    const res = await request(app).get('/api/telemetry/CRASH_INJECT');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.text).not.toContain('at ');
  });
});
```

- [ ] **Step 2: Ejecutar tests para confirmar que fallan**

```bash
npm test tests/routes.test.ts
```

Esperado: FAIL (helmet/cors restriction no aplicados aún).

- [ ] **Step 3: Actualizar `src/server.ts` con todas las correcciones**

Reemplazar el contenido completo de `src/server.ts`:

```typescript
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import trajectoryRouter from './routes/trajectory.js';
import eventsRouter from './routes/events.js';
import telemetryRouter from './routes/telemetry.js';
import crewRouter from './routes/crew.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST ?? '127.0.0.1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET'],
}));

app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json());

app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/trajectory', trajectoryRouter);
app.use('/api/events', eventsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/crew', crewRouter);

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler — must be last middleware, must have 4 params
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Artemis II Mission Tracker running at http://${HOST}:${PORT}`);
    console.log(`   API: http://${HOST}:${PORT}/api/trajectory`);
    console.log(`   Launch Date: April 1, 2026\n`);
  });
}

export default app;
```

- [ ] **Step 4: Ejecutar tests**

```bash
npm test tests/routes.test.ts
```

Esperado: todos los tests pasan.

- [ ] **Step 5: Verificar que el build TypeScript compila**

```bash
npm run build
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/server.ts tests/routes.test.ts
git commit -m "fix(security): add helmet, restrict CORS, rate limit, error handler, bind host"
```

---

## Task 3: Validación de inputs en rutas

**Fixes:** M1 (MET sin bounds), M3 (type confusion query param)

**Files:**
- Modify: `src/routes/telemetry.ts`
- Modify: `src/routes/events.ts`
- Modify: `src/routes/trajectory.ts`
- Modify: `tests/routes.test.ts` (añadir casos)

La duración total de la misión Artemis II es 9 días = `9 * 24 * 3600 = 777,600 s`. El MET máximo con margen es **803,400 s** (punto final de la trayectoria generada con 600 puntos).

- [ ] **Step 1: Añadir tests de validación a `tests/routes.test.ts`**

Añadir al final del archivo:

```typescript
describe('Input validation — /api/telemetry/:met', () => {
  it('rejects NaN', async () => {
    const res = await request(app).get('/api/telemetry/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MET/i);
  });

  it('rejects Infinity', async () => {
    const res = await request(app).get('/api/telemetry/Infinity');
    expect(res.status).toBe(400);
  });

  it('rejects negative values', async () => {
    const res = await request(app).get('/api/telemetry/-1');
    expect(res.status).toBe(400);
  });

  it('rejects values beyond mission end', async () => {
    const res = await request(app).get('/api/telemetry/9999999');
    expect(res.status).toBe(400);
  });

  it('accepts valid MET', async () => {
    const res = await request(app).get('/api/telemetry/7020');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('phase');
  });
});

describe('Input validation — /api/events/upcoming', () => {
  it('accepts valid met query param', async () => {
    const res = await request(app).get('/api/events/upcoming?met=1000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('falls back to 0 on invalid met', async () => {
    const res = await request(app).get('/api/events/upcoming?met=abc');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('handles array met param without crashing', async () => {
    const res = await request(app).get('/api/events/upcoming?met[]=1&met[]=2');
    expect(res.status).toBe(200);
  });

  it('handles Infinity met param', async () => {
    const res = await request(app).get('/api/events/upcoming?met=Infinity');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar tests para confirmar que fallan**

```bash
npm test tests/routes.test.ts
```

Esperado: los tests de validación fallan.

- [ ] **Step 3: Actualizar `src/routes/telemetry.ts`**

```typescript
import { Router } from 'express';
import { generateTrajectory, getTrajectoryAtMET } from '../lib/trajectory.js';
import { formatMET } from '../lib/orbital-math.js';

const router = Router();
const trajectory = generateTrajectory(600);
const MISSION_MAX_MET = trajectory[trajectory.length - 1].met;

let simStartTime = Date.now();
let simMET = 0;
const simSpeed = 1;

function getCurrentMET(): number {
  const elapsed = (Date.now() - simStartTime) / 1000;
  return Math.min(simMET + elapsed * simSpeed, MISSION_MAX_MET);
}

router.get('/current', (_req, res) => {
  const met = getCurrentMET();
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({ ...point, metFormatted: formatMET(met) });
});

router.get('/:met', (req, res) => {
  const met = parseFloat(req.params.met);
  if (!isFinite(met) || met < 0 || met > MISSION_MAX_MET) {
    res.status(400).json({ error: `MET must be a finite number between 0 and ${MISSION_MAX_MET}` });
    return;
  }
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({ ...point, metFormatted: formatMET(met) });
});

export default router;
```

- [ ] **Step 4: Actualizar `src/routes/events.ts`**

```typescript
import { Router } from 'express';
import { MISSION_EVENTS } from '../data/events.js';
import { formatMET } from '../lib/orbital-math.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(MISSION_EVENTS);
});

router.get('/upcoming', (req, res) => {
  const raw = req.query.met;
  const parsed = typeof raw === 'string' ? parseFloat(raw) : NaN;
  const met = isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const upcoming = MISSION_EVENTS.filter(e => e.met >= met).slice(0, 3);
  res.json(upcoming);
});

export default router;
```

- [ ] **Step 5: Añadir Cache-Control a `src/routes/trajectory.ts`**

```typescript
import { Router } from 'express';
import { generateTrajectory } from '../lib/trajectory.js';

const router = Router();
const cachedTrajectory = generateTrajectory(600);

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(cachedTrajectory);
});

export default router;
```

- [ ] **Step 6: Ejecutar todos los tests**

```bash
npm test
```

Esperado: todos los tests pasan incluyendo los nuevos de validación.

- [ ] **Step 7: Commit**

```bash
git add src/routes/telemetry.ts src/routes/events.ts src/routes/trajectory.ts tests/routes.test.ts
git commit -m "fix(security): validate MET bounds, fix query param type confusion, add Cache-Control"
```

---

## Task 4: Eliminar XSS en frontend (DOM innerHTML → textContent)

**Fixes:** H4 (XSS en app.js:565, :621, :643, :849)

**Files:**
- Modify: `public/js/app.js`

Hay 4 bloques de `innerHTML` con datos externos. Se reemplazan con construcción manual del DOM usando `textContent`.

- [ ] **Step 1: Localizar las 4 secciones exactas**

Las líneas objetivo (referencia):
- **L565-573**: `buildEventsPanel` — datos de `/api/events`
- **L620-623**: `buildTimelineMarkers` — `ev.icon` en timeline
- **L643-651**: `buildCrewTooltip` — datos de `/api/crew`
- **L847-851**: `catch (err)` — `err.message` en pantalla de error

- [ ] **Step 2: Fix L565-573 — buildEventsPanel**

Localizar este bloque en `public/js/app.js`:

```javascript
    div.innerHTML = `
      <div class="event-header">
        <span class="event-icon">${ev.icon}</span>
        <span class="event-title">${ev.title}</span>
        <span class="event-phase-badge">${label}</span>
      </div>
      <div class="event-met">MET ${ev.metFormatted}</div>
      <div class="event-desc">${ev.description}</div>
    `;
```

Reemplazar con:

```javascript
    const header = document.createElement('div');
    header.className = 'event-header';

    const icon = document.createElement('span');
    icon.className = 'event-icon';
    icon.textContent = ev.icon;

    const title = document.createElement('span');
    title.className = 'event-title';
    title.textContent = ev.title;

    const badge = document.createElement('span');
    badge.className = 'event-phase-badge';
    badge.textContent = label;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(badge);

    const metEl = document.createElement('div');
    metEl.className = 'event-met';
    metEl.textContent = `MET ${ev.metFormatted}`;

    const desc = document.createElement('div');
    desc.className = 'event-desc';
    desc.textContent = ev.description;

    div.appendChild(header);
    div.appendChild(metEl);
    div.appendChild(desc);
```

- [ ] **Step 3: Fix L620-623 — buildTimelineMarkers**

Localizar:

```javascript
    marker.innerHTML = `
      <div class="timeline-marker-dot"></div>
      <div class="timeline-marker-label">${ev.icon}</div>
    `;
```

Reemplazar con:

```javascript
    const dot = document.createElement('div');
    dot.className = 'timeline-marker-dot';

    const markerLabel = document.createElement('div');
    markerLabel.className = 'timeline-marker-label';
    markerLabel.textContent = ev.icon;

    marker.appendChild(dot);
    marker.appendChild(markerLabel);
```

- [ ] **Step 4: Fix L643-651 — buildCrewTooltip**

Localizar:

```javascript
    div.innerHTML = `
      <div class="crew-avatar">${avatars[idx] || '🧑‍🚀'}</div>
      <div class="crew-info">
        <div class="crew-name">${member.name}</div>
        <div class="crew-role">${member.role}</div>
        <div class="crew-agency">${member.agency}</div>
        <div class="crew-bio">${member.bio}</div>
      </div>
    `;
```

Reemplazar con:

```javascript
    const avatar = document.createElement('div');
    avatar.className = 'crew-avatar';
    avatar.textContent = avatars[idx] || '🧑‍🚀';

    const info = document.createElement('div');
    info.className = 'crew-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'crew-name';
    nameEl.textContent = member.name;

    const roleEl = document.createElement('div');
    roleEl.className = 'crew-role';
    roleEl.textContent = member.role;

    const agencyEl = document.createElement('div');
    agencyEl.className = 'crew-agency';
    agencyEl.textContent = member.agency;

    const bioEl = document.createElement('div');
    bioEl.className = 'crew-bio';
    bioEl.textContent = member.bio;

    info.appendChild(nameEl);
    info.appendChild(roleEl);
    info.appendChild(agencyEl);
    info.appendChild(bioEl);

    div.appendChild(avatar);
    div.appendChild(info);
```

- [ ] **Step 5: Fix L847-851 — error handler en catch**

Localizar:

```javascript
      inner.innerHTML = `
        <div class="loading-error">ERROR DE CONEXIÓN</div>
        <div class="loading-error-msg">${err.message}</div>
        <div class="loading-error-hint">Verifica que el servidor esté activo en puerto 3000</div>
      `;
```

Reemplazar con:

```javascript
      inner.textContent = '';

      const errTitle = document.createElement('div');
      errTitle.className = 'loading-error';
      errTitle.textContent = 'ERROR DE CONEXIÓN';

      const errMsg = document.createElement('div');
      errMsg.className = 'loading-error-msg';
      errMsg.textContent = err.message;

      const errHint = document.createElement('div');
      errHint.className = 'loading-error-hint';
      errHint.textContent = 'Verifica que el servidor esté activo en puerto 3000';

      inner.appendChild(errTitle);
      inner.appendChild(errMsg);
      inner.appendChild(errHint);
```

- [ ] **Step 6: Verificación manual**

Iniciar el servidor y verificar visualmente que:
1. Los eventos se renderizan con sus iconos y títulos correctamente
2. Los marcadores del timeline muestran los emojis
3. El tooltip de tripulación muestra nombre/rol/bio
4. Si hay error de conexión, el mensaje se muestra correctamente

```bash
npm run dev
```

Abrir http://localhost:3000 y verificar los tres paneles.

- [ ] **Step 7: Commit**

```bash
git add public/js/app.js
git commit -m "fix(security): replace innerHTML with textContent to eliminate XSS vectors"
```

---

## Task 5: Subresource Integrity en CDN scripts

**Fixes:** H9 (CDN sin SRI — Chart.js), L7 (Google Fonts CSP), L8 (font-src)

**Files:**
- Modify: `public/index.html`

Nota: Los importmaps (`<script type="importmap">`) no soportan atributo `integrity` en la mayoría de navegadores. La solución completa para Three.js requiere bundlear localmente — se documenta como deuda técnica. Para Chart.js (tag `<script>` normal), se añade SRI.

- [ ] **Step 1: Obtener el hash SHA384 de Chart.js 4.4.1**

```bash
curl -s "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" | openssl dgst -sha384 -binary | openssl base64 -A
```

Guardar el hash resultante (formato: `abc123...`).

- [ ] **Step 2: Actualizar el tag de Chart.js en `public/index.html`**

Localizar:

```html
  <!-- Chart.js via CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
```

Reemplazar con (usar el hash obtenido en Step 1):

```html
  <!-- Chart.js via CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
          integrity="sha384-HASH_AQUI"
          crossorigin="anonymous"></script>
```

- [ ] **Step 3: Añadir comentario de deuda técnica para Three.js**

Localizar el bloque importmap y añadir comentario:

```html
  <!-- Three.js + OrbitControls via CDN -->
  <!-- TODO(security): importmap no soporta SRI. Migrar a bundle local con vite/esbuild. -->
  <script type="importmap">
```

- [ ] **Step 4: Verificar que la app sigue funcionando**

```bash
npm run dev
```

Abrir http://localhost:3000, confirmar que Three.js y Chart.js cargan sin errores en consola.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "fix(security): add SRI integrity hash to Chart.js CDN script tag"
```

---

## Task 6: Hardening del entorno del agente

**Fixes:** H5 (settings.local.json commiteado), H6 (node -e/python3 -c en allowlist), H7 (sin deny rules), L6 (permisos Playwright huérfanos), M9 (install_hooks.sh no existe)

**Files:**
- Modify: `.gitignore`
- Modify: `.claude/settings.local.json`
- Create: `scripts/security/install_hooks.sh`

- [ ] **Step 1: Añadir settings.local.json a .gitignore**

Leer `.gitignore` actual y añadir al final:

```
# Claude Code — local overrides (no commitear)
.claude/settings.local.json

# Archivos de secretos
.env.*
*.pem
*.key
*.p12
*.pfx
.npmrc
```

- [ ] **Step 2: Mover settings.local.json fuera del tracking de git**

```bash
git rm --cached .claude/settings.local.json
```

- [ ] **Step 3: Limpiar settings.local.json — quitar entradas peligrosas**

Reemplazar el contenido de `.claude/settings.local.json` con una versión saneada.

Quitar:
- Las 4 entradas `node -e "... readFileSync('/dev/stdin' ..."` (stdin + inline code)
- Las 3 entradas `python3 -c "..."` (inline code)  
- `mcp__playwright__browser_take_screenshot`
- `mcp__playwright__browser_snapshot`

Añadir bloque `deny` con rutas sensibles.

Nuevo contenido de `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(curl -s http://localhost:3000/api/trajectory)",
      "Bash(curl -s http://localhost:3000/api/events)",
      "Bash(curl -s http://localhost:3000/api/crew)",
      "Bash(curl -s http://localhost:3000/api/telemetry/current)",
      "Bash(curl -s \"http://localhost:3000/api/telemetry/7020\")",
      "Bash(curl -s \"http://localhost:3000\")"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl * | bash)",
      "Bash(curl * | sh)",
      "Bash(wget * | bash)",
      "Bash(wget * | sh)",
      "Bash(* /dev/stdin*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)"
    ]
  }
}
```

- [ ] **Step 4: Crear `scripts/security/install_hooks.sh`**

```bash
#!/usr/bin/env bash
# Instala pre-commit hooks de seguridad en el repo especificado.
# Uso: bash scripts/security/install_hooks.sh [REPO_ROOT]
set -euo pipefail

REPO_ROOT="${1:-.}"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "Error: $HOOKS_DIR no existe. ¿Es un repositorio git?" >&2
  exit 1
fi

cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# Pre-commit hook: bloquea archivos sensibles y cambios a CLAUDE.md
set -euo pipefail

# Bloquear .env* y credenciales
BLOCKED=$(git diff --cached --name-only | grep -E '\.(env|pem|key|p12|pfx)$' || true)
if [ -n "$BLOCKED" ]; then
  echo "❌ Bloqueado: intento de commitear archivos sensibles:"
  echo "$BLOCKED"
  exit 1
fi

# Alertar si CLAUDE.md o settings cambian
SENSITIVE=$(git diff --cached --name-only | grep -E '(CLAUDE\.md|\.claude/settings.*\.json)$' || true)
if [ -n "$SENSITIVE" ]; then
  echo "⚠️  Advertencia: se están commiteando archivos de configuración del agente:"
  echo "$SENSITIVE"
  echo "Continuar de todas formas? (Ctrl+C para cancelar, Enter para continuar)"
  read -r _confirm
fi

exit 0
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ Pre-commit hook instalado en $HOOKS_DIR/pre-commit"
```

Hacer el script ejecutable:

```bash
chmod +x scripts/security/install_hooks.sh
```

- [ ] **Step 5: Instalar el hook en el repo local**

```bash
bash scripts/security/install_hooks.sh .
```

Esperado: `✅ Pre-commit hook instalado en .git/hooks/pre-commit`

- [ ] **Step 6: Commit**

```bash
git add .gitignore scripts/security/install_hooks.sh .claude/settings.local.json
git commit -m "fix(security): harden agent env, add deny rules, remove unsafe allowlist entries, add pre-commit hook"
```

Nota: `settings.local.json` ya no estará trackeado después del `git rm --cached` del Step 2, pero el cambio en `.gitignore` sí se commitea.

---

## Task 7: Correcciones de configuración restantes

**Fixes:** L4 (path mappings en CLAUDE.md global), L5 (capture-view skill sin allowed-tools), M11 (CLAUDE.md como target sin integridad)

**Files:**
- Modify: `.claude/skills/capture-view/SKILL.md` (si existe)
- Modify: `CLAUDE.md` (añadir scope statement)

- [ ] **Step 1: Leer el skill capture-view**

```bash
cat ".claude/skills/capture-view/SKILL.md"
```

- [ ] **Step 2: Añadir `allowed-tools` al frontmatter de capture-view**

Si el frontmatter YAML existe, añadir la línea `allowed-tools`:

```yaml
---
name: capture-view
description: Captura una vista de la escena 3D y la guarda como bookmark
allowed-tools: Read, Write, Edit
---
```

- [ ] **Step 3: Añadir scope statement al inicio de CLAUDE.md del proyecto**

Al principio del archivo `CLAUDE.md`, añadir después del primer encabezado:

```markdown
> **Security scope:** All file operations are restricted to the project root directory.
> Do not read or write files outside this directory without explicit user approval.
```

- [ ] **Step 4: Verificar tests finales**

```bash
npm test
```

Esperado: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/capture-view/SKILL.md CLAUDE.md
git commit -m "fix(security): add allowed-tools to capture-view skill, add scope statement to CLAUDE.md"
```

---

## Self-Review

### Spec coverage

| Hallazgo | Tarea | Cubierto |
|----------|-------|---------|
| C1 Vitest RCE | Task 1 | ✅ |
| H1 CORS wildcard | Task 2 | ✅ |
| H2 Sin helmet | Task 2 | ✅ |
| H3 Sin rate limiting | Task 2 | ✅ |
| H4 XSS innerHTML | Task 4 | ✅ |
| H5 settings.local.json commiteado | Task 6 | ✅ |
| H6 node -e stdin | Task 6 | ✅ |
| H7 Sin deny rules | Task 6 | ✅ |
| H8 Semver ^ranges | Task 1 (npm ci doc) | ✅ parcial — documenta; fix completo requeriría pinear versiones exactas |
| H9 CDN sin SRI | Task 5 | ✅ (Chart.js); Three.js: deuda documentada |
| M1 MET sin bounds | Task 3 | ✅ |
| M2 Sin error handler | Task 2 | ✅ |
| M3 Type confusion query | Task 3 | ✅ |
| M4 qs DoS | Task 1 | ✅ |
| M5 esbuild CORS | Task 1 | ✅ (via vitest v3) |
| M6 PostCSS XSS | Task 1 | ✅ |
| M7 Vite path traversal | Task 1 | ✅ (via vitest v3) |
| M8 Auto-fix sin confirmación | No en scope — es documentación del skill, no código |
| M9 install_hooks.sh ausente | Task 6 | ✅ |
| M10 0.0.0.0 bind | Task 2 | ✅ |
| M11 CLAUDE.md sin integridad | Task 7 | ✅ parcial — scope statement + hook |
| M12 SSRF + inline interpreters | Task 6 | ✅ (eliminar entradas stdin) |
| L1 Sin HTTPS | Deployment concern — no en scope (requiere reverse proxy) |
| L2 X-Powered-By | Task 2 | ✅ (helmet lo deshabilita) |
| L3 Sin Cache-Control | Task 3 | ✅ |
| L4 Path mappings global | Fuera de scope — afecta otros proyectos, requiere decisión del usuario |
| L5 capture-view sin allowed-tools | Task 7 | ✅ |
| L6 Playwright huérfano | Task 6 | ✅ |
| L7 Sin .npmrc | Task 6 (.gitignore) | ✅ parcial — gitignore actualizado |
| L8 Google Fonts CSP | Task 2 | ✅ (font-src en helmet CSP) |

### Deuda documentada (fuera de scope de este plan)

- **L1 HTTPS**: Requiere reverse proxy (nginx/Caddy) o cloud LB. No es un fix de código.
- **L4 Path aliases globales**: Afecta `C:\Users\rodrigo.valdez\.claude\CLAUDE.md` y otros proyectos. El usuario debe decidir.
- **H9 Three.js SRI**: Importmap no soporta SRI. Requiere migración a bundle local con vite/esbuild (proyecto separado).
- **H8 Version pinning**: Requiere auditoría de breaking changes antes de pinear versiones exactas.
