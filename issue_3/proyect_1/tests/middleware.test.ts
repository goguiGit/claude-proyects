import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/error-handler.js';

describe('404 handler', () => {
  const app = createApp();

  it('returns 404 with JSON for unknown routes', async () => {
    const res = await request(app).get('/does/not/exist');
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
