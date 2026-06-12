import { describe, it, expect } from 'vitest';
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
  it('returns JSON 400 instead of stack trace on invalid input', async () => {
    const res = await request(app).get('/api/telemetry/CRASH_INJECT');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.text).not.toContain('at ');
  });
});
