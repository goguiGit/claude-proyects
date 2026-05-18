# Snap URLs Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core URL shortener: create short codes, store them in SQLite, redirect visitors, and list all URLs.

**Architecture:** Three tasks build on each other. Task 1 creates the SQLite migration and wires it into `createApp()`. Task 2 adds POST /urls (create) and GET /urls (list) with tests. Task 3 adds GET /:code (redirect), updates the app wiring, and fixes one existing test that breaks when the redirect router is added.

**Tech Stack:** Express 5, TypeScript 5 (strict ESM, NodeNext), better-sqlite3 (raw SQL, no ORM), Vitest, supertest. No new dependencies.

---

## File Map

| Path | Role |
|---|---|
| `src/db/migrate.ts` | `migrate()` — runs `CREATE TABLE IF NOT EXISTS urls` once at startup |
| `src/urls/urls.router.ts` | Router mounted at `/urls`: `POST /` (create) and `GET /` (list) |
| `src/urls/redirect.router.ts` | Router mounted at `/`: `GET /:code` (redirect) |
| `src/app.ts` | Modified across tasks: call `migrate()`, mount both routers |
| `tests/urls.test.ts` | All URL feature tests |
| `tests/middleware.test.ts` | Existing file — one test path updated in Task 3 |

**Middleware chain after all tasks:**
```
requestLogger → express.json() → /health → /urls → / (redirect) → notFoundHandler → errorHandler
```

---

### Task 1: SQLite migration

**Files:**
- Create: `src/db/migrate.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/db/migrate.ts`**

```typescript
import db from './database.js';

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}
```

- [ ] **Step 2: Call `migrate()` in `src/app.ts`**

Replace the entire file with:

```typescript
import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { migrate } from './db/migrate.js';

export function createApp() {
  migrate();
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 3: Run existing tests — confirm they still pass**

```bash
npm test
```

Expected: `4 passed`

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: clean exit, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/migrate.ts src/app.ts
git commit -m "feat: add SQLite migration for urls table"
```

---

### Task 2: POST /urls (create) + GET /urls (list)

**Files:**
- Create: `tests/urls.test.ts`
- Create: `src/urls/urls.router.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/urls.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import db from '../src/db/database.js';

const app = createApp();

beforeEach(() => {
  db.exec('DELETE FROM urls');
});

describe('POST /urls', () => {
  it('creates a short URL and returns 201 with code and url', async () => {
    const res = await request(app)
      .post('/urls')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ url: 'https://example.com' });
    expect(typeof res.body.code).toBe('string');
    expect(res.body.code.length).toBeGreaterThan(0);
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/urls').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'url is required' });
  });
});

describe('GET /urls', () => {
  it('returns an empty array when no URLs exist', async () => {
    const res = await request(app).get('/urls');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all created URLs ordered by newest first', async () => {
    await request(app).post('/urls').send({ url: 'https://first.com' });
    await request(app).post('/urls').send({ url: 'https://second.com' });

    const res = await request(app).get('/urls');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ original_url: 'https://second.com' });
    expect(res.body[1]).toMatchObject({ original_url: 'https://first.com' });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test
```

Expected: tests in `urls.test.ts` fail (cannot POST /urls — route not mounted yet).

- [ ] **Step 3: Create `src/urls/urls.router.ts`**

```typescript
import { Router } from 'express';
import db from '../db/database.js';

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

const urlsRouter = Router();

urlsRouter.post('/', (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  let code = generateCode();
  let attempts = 0;
  while (db.prepare('SELECT 1 FROM urls WHERE code = ?').get(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }

  db.prepare(
    'INSERT INTO urls (code, original_url, created_at) VALUES (?, ?, ?)'
  ).run(code, url, Date.now());

  res.status(201).json({ code, url });
});

urlsRouter.get('/', (_req, res) => {
  const urls = db
    .prepare('SELECT id, code, original_url, created_at FROM urls ORDER BY created_at DESC')
    .all();
  res.json(urls);
});

export default urlsRouter;
```

- [ ] **Step 4: Mount the router in `src/app.ts`**

Replace the entire file with:

```typescript
import express from 'express';
import healthRouter from './health/health.router.js';
import urlsRouter from './urls/urls.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { migrate } from './db/migrate.js';

export function createApp() {
  migrate();
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/urls', urlsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Run all tests — confirm they pass**

```bash
npm test
```

Expected: all pass. The previous 4 + the new 4 = `8 passed`.

- [ ] **Step 6: Run build**

```bash
npm run build
```

Expected: clean exit, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/urls/urls.router.ts src/app.ts tests/urls.test.ts
git commit -m "feat: POST /urls and GET /urls with tests"
```

---

### Task 3: GET /:code (redirect) + fix middleware test

**Files:**
- Create: `src/urls/redirect.router.ts`
- Modify: `src/app.ts`
- Modify: `tests/urls.test.ts` (add redirect tests)
- Modify: `tests/middleware.test.ts` (fix one broken test)

**Why the middleware test breaks:** Adding `redirectRouter` mounted at `/` makes `GET /:code` match any single-segment path — including `/this-does-not-exist` used in the existing 404 test. That request now hits the redirect router (returns `{ error: 'Short URL not found' }`) instead of notFoundHandler (returns `{ error: 'Route not found' }`). The fix is to change the test path to a multi-segment path like `/does/not/exist`, which `/:code` cannot match.

- [ ] **Step 1: Add redirect tests to `tests/urls.test.ts`**

Append the following `describe` block to the existing `tests/urls.test.ts` (keep all existing content, add this at the end of the file):

```typescript
describe('GET /:code', () => {
  it('redirects 301 to the original URL', async () => {
    const create = await request(app)
      .post('/urls')
      .send({ url: 'https://example.com' });
    const { code } = create.body as { code: string };

    const res = await request(app).get(`/${code}`).redirects(0);

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('returns 404 for an unknown code', async () => {
    const res = await request(app).get('/no-such-code');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Short URL not found' });
  });
});
```

- [ ] **Step 2: Run tests — confirm redirect tests fail**

```bash
npm test
```

Expected: the two new redirect tests fail (router not mounted yet). All other tests still pass.

- [ ] **Step 3: Create `src/urls/redirect.router.ts`**

```typescript
import { Router } from 'express';
import db from '../db/database.js';

const redirectRouter = Router();

redirectRouter.get('/:code', (req, res) => {
  const row = db
    .prepare('SELECT original_url FROM urls WHERE code = ?')
    .get(req.params.code) as { original_url: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  res.redirect(301, row.original_url);
});

export default redirectRouter;
```

- [ ] **Step 4: Mount `redirectRouter` in `src/app.ts`**

Replace the entire file with:

```typescript
import express from 'express';
import healthRouter from './health/health.router.js';
import urlsRouter from './urls/urls.router.js';
import redirectRouter from './urls/redirect.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { migrate } from './db/migrate.js';

export function createApp() {
  migrate();
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/urls', urlsRouter);
  app.use('/', redirectRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Fix the broken 404 test in `tests/middleware.test.ts`**

The test at line 10 currently sends `GET /this-does-not-exist`. After adding `redirectRouter`, that single-segment path hits the redirect router, not the 404 handler. Change the path to a multi-segment path that cannot match `/:code`.

Replace only this block (lines 7–15):

```typescript
describe('404 handler', () => {
  const app = createApp();

  it('returns 404 with JSON for unknown routes', async () => {
    const res = await request(app).get('/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
```

With:

```typescript
describe('404 handler', () => {
  const app = createApp();

  it('returns 404 with JSON for unknown routes', async () => {
    const res = await request(app).get('/does/not/exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
```

- [ ] **Step 6: Run ALL tests — confirm everything passes**

```bash
npm test
```

Expected: `10 passed` across 3 test files:
- `tests/health.test.ts` — 1
- `tests/middleware.test.ts` — 3
- `tests/urls.test.ts` — 6

- [ ] **Step 7: Run build**

```bash
npm run build
```

Expected: clean exit, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/urls/redirect.router.ts src/app.ts tests/urls.test.ts tests/middleware.test.ts
git commit -m "feat: GET /:code redirect with tests"
```

---

## Self-Review

**Spec coverage:**
- [x] Receive a long URL and generate a random short code — `POST /urls` in `urls.router.ts`
- [x] Save the association in SQLite — `INSERT INTO urls` in `urls.router.ts`
- [x] Redirect when someone visits the short code — `GET /:code` in `redirect.router.ts`
- [x] List all created URLs — `GET /urls` in `urls.router.ts`
- [x] Create the SQLite table — `CREATE TABLE IF NOT EXISTS urls` in `migrate.ts`
- [x] Tests added and executed — `tests/urls.test.ts` with 6 tests

**Placeholder scan:** None. All steps contain complete code.

**Type consistency:**
- `migrate()` exported as named from `migrate.ts`, imported by name in `app.ts` ✓
- `urlsRouter` default exported from `urls.router.ts`, imported as `urlsRouter` in `app.ts` ✓
- `redirectRouter` default exported from `redirect.router.ts`, imported as `redirectRouter` in `app.ts` ✓
- `{ error: string }` response shape used consistently across all error responses ✓
- `db.prepare(...).get(code) as { original_url: string } | undefined` — explicit type cast required because better-sqlite3 `.get()` returns `unknown` ✓

**Patterns followed from existing code:**
- `.js` extensions on all local imports ✓
- Named exports for utilities (`migrate`, `generateCode` is private), default exports for routers ✓
- Unused params prefixed with `_` (`_req`) ✓
- `{ error: string }` shape for all error responses ✓
- `console.log` only (no logging libraries added) ✓
- No ORMs — raw better-sqlite3 SQL ✓
- `beforeEach` cleans DB state for test isolation ✓
