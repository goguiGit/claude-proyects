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

describe('Input validation errors', () => {
  it('returns JSON 400 instead of stack trace on invalid input', async () => {
    const res = await request(app).get('/api/telemetry/CRASH_INJECT');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.text).not.toContain('at ');
  });
});

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

describe('Cache-Control — /api/trajectory', () => {
  it('returns Cache-Control header', async () => {
    const res = await request(app).get('/api/trajectory');
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });
});
