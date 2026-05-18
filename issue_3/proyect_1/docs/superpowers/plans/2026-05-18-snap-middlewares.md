# Snap Middlewares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two groups of Express middleware to Snap: an HTTP request logger (first in chain) and 404 + global error handlers (last in chain).

**Architecture:** Each middleware lives in its own file under `src/middleware/`. `src/app.ts` wires them in the correct order: logger → json → routes → 404 handler → error handler. Tests for the 404 and error handler are added to a new `tests/middleware.test.ts` file. The logger has no automated test (spec requires manual curl verification only).

**Tech Stack:** Express 5, TypeScript 5 (strict ESM, NodeNext), Vitest, supertest. No new dependencies.

---

## File Map

| Path | Role |
|---|---|
| `src/middleware/logger.ts` | Request logger middleware — fires on `res.finish`, logs method + path + status + ms |
| `src/middleware/not-found.ts` | 404 handler — last route, returns `{ error: 'Route not found' }` |
| `src/middleware/error-handler.ts` | Global error handler — returns 500, exposes message only outside production |
| `src/app.ts` | Modified to import and wire all three middlewares in correct order |
| `tests/middleware.test.ts` | Vitest tests for 404 and error handler behaviors |

---

### Task 1: Request logger middleware

**Files:**
- Create: `src/middleware/logger.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/middleware/logger.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
}
```

- [ ] **Step 2: Update `src/app.ts` to add the logger first in the chain**

Replace the entire file with:

```typescript
import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';

export function createApp() {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  return app;
}
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npm test
```

Expected: `1 passed`

- [ ] **Step 4: Verify logger output manually**

Start the server:
```bash
npx tsx src/server.ts
```

In a second terminal:
```bash
curl http://localhost:3000/health
```

Expected log line in the server terminal:
```
GET /health → 200 (Xms)
```

Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/middleware/logger.ts src/app.ts
git commit -m "feat: add request logger middleware"
```

---

### Task 2: 404 and global error handler + tests

**Files:**
- Create: `src/middleware/not-found.ts`
- Create: `src/middleware/error-handler.ts`
- Modify: `src/app.ts`
- Create: `tests/middleware.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/middleware.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/error-handler.js';

describe('404 handler', () => {
  const app = createApp();

  it('returns 404 with JSON for unknown routes', async () => {
    const res = await request(app).get('/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});

describe('error handler', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns 500 without exposing error details in production', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.get('/boom', () => { throw new Error('secret internal error'); });
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('includes error message in development', async () => {
    process.env.NODE_ENV = 'development';
    const app = express();
    app.get('/boom', () => { throw new Error('debug info'); });
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'debug info' });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (modules don't exist yet)**

```bash
npm test
```

Expected: tests fail with import errors for `not-found` and `error-handler`.

- [ ] **Step 3: Create `src/middleware/not-found.ts`**

```typescript
import { Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
```

- [ ] **Step 4: Create `src/middleware/error-handler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message =
    process.env.NODE_ENV !== 'production' && err instanceof Error
      ? err.message
      : 'Internal server error';
  res.status(500).json({ error: message });
}
```

- [ ] **Step 5: Update `src/app.ts` to wire the new handlers at the end**

Replace the entire file with:

```typescript
import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Run all tests and confirm they pass**

```bash
npm test
```

Expected: `4 passed` (1 existing health test + 3 new middleware tests).

- [ ] **Step 7: Run build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: clean exit, no errors, `dist/` updated.

- [ ] **Step 8: Commit**

```bash
git add src/middleware/not-found.ts src/middleware/error-handler.ts src/app.ts tests/middleware.test.ts
git commit -m "feat: add 404 and global error handler middleware with tests"
```

---

## Self-Review

**Spec coverage (log.txt):**
- [x] Logs method, path, status code, milliseconds — `requestLogger` uses `res.on('finish')`
- [x] Format `GET /health → 200 (12ms)` — exact format in `console.log` template literal
- [x] `console.log` only, no new logging libraries — confirmed
- [x] Middleware first in chain — `app.use(requestLogger)` is before `express.json()` and routes
- [x] No request body logging — only `req.method` and `req.path` are accessed

**Spec coverage (config.txt):**
- [x] 404 handler returns JSON with route-not-found message — `notFoundHandler`
- [x] Global error handler returns 500 with generic message — `errorHandler`
- [x] In development: includes error message — `NODE_ENV !== 'production'` branch
- [x] In production: no internal details — `'Internal server error'` string
- [x] `/health` endpoint not modified — only `src/app.ts` wiring changed
- [x] No new dependencies — only Express built-ins
- [x] Tests for 404 and error handler — `tests/middleware.test.ts` with 3 tests

**Placeholder scan:** None found.

**Type consistency:**
- `requestLogger`, `notFoundHandler`, `errorHandler` — named consistently in their files and imported with the same names in `app.ts`.
- `errorHandler` has 4-argument signature required by Express for error middleware — correct.
