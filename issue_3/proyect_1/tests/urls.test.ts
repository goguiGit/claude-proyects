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
