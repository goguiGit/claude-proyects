# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server with hot reload (tsx watch)
npm run build      # compile TypeScript → dist/
npm test           # run all tests once (vitest run)
npm run test:watch # watch mode
```

Run a single test file:
```bash
npx vitest run tests/health.test.ts
```

## Architecture

Snap is a URL shortener with analytics. Stack: **Express 5 + TypeScript 5 (strict ESM) + better-sqlite3 + Vitest**.

### Entry points

- **`src/server.ts`** — calls `createApp()` then `app.listen()`. Never imported by tests.
- **`src/app.ts`** — exports `createApp()` factory with no `listen` call. All tests import this directly so supertest can bind an ephemeral port.

### Middleware chain (in order)

```
requestLogger → express.json() → domain routes → notFoundHandler → errorHandler
```

All middleware lives in `src/middleware/`, one file per concern, one named export per file.

### Domain modules

Each domain gets its own folder under `src/` containing a `<name>.router.ts` file. The router is a default export, mounted in `app.ts`. Current domains: `health` (active), `urls`, `auth`, `dashboard` (stubs).

### Database

`src/db/database.ts` is a **module-level singleton**: `new Database(...)` runs on first import and creates `snap.db` at the project root. WAL mode is set at startup. No domain module currently imports it — it will be imported directly wherever SQL is needed (no ORM, no repository layer).

### GET /health request flow

1. `requestLogger` records `Date.now()` and registers a `res.on('finish')` listener, then calls `next()`
2. `express.json()` parses the body (no-op for GET)
3. `healthRouter` matches `GET /` and calls `res.json({ status: 'ok' })`
4. Response is sent → `res.finish` fires → logger prints `GET /health → 200 (Xms)`

## Conventions

**Imports:** All local `.ts` files must be imported with a `.js` extension (TypeScript ESM + NodeNext module resolution resolves them at compile time).

**Exports:** Routers use `export default`. Middleware functions and utilities use named exports.

**Unused parameters:** Prefix with `_` (`_req`, `_next`) — required by strict TypeScript.

**Error handling:** Express 5 automatically catches synchronous `throw` inside route handlers and passes the error to the next error-handling middleware. No `try/catch` or `next(err)` needed in route handlers.

**Error responses:** All error responses follow `{ error: string }` shape. The global `errorHandler` exposes `err.message` when `NODE_ENV !== 'production'` and returns `'Internal server error'` in production.

**Logging:** `console.log` only. No logging libraries. Never log the request body.

## Testing

Tests use **supertest** against `createApp()` — no real port is bound.

To test a middleware in isolation (e.g., `errorHandler`), create a minimal express app inside the test rather than using `createApp()`. This avoids ordering issues with the full middleware chain.

When mutating `process.env.NODE_ENV` in tests, always save and restore it with `beforeEach`/`afterEach`.
