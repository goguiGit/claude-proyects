import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import db from '../src/db/database.js';

const app = createApp();

async function getToken(email = 'user@example.com'): Promise<string> {
  await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'Test User' });
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password: 'password123' });
  return res.body.token as string;
}

beforeEach(() => {
  db.exec('DELETE FROM urls');
  db.exec('DELETE FROM users');
});

describe('POST /urls', () => {
  it('creates a short URL and returns 201 when authenticated', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ url: 'https://example.com' });
    expect(typeof res.body.code).toBe('string');
    expect(res.body.code.length).toBeGreaterThan(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/urls').send({ url: 'https://example.com' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when url is missing', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'url is required' });
  });
});

describe('GET /urls', () => {
  it('returns an empty array when no URLs exist (public)', async () => {
    const res = await request(app).get('/urls');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all created URLs ordered by newest first', async () => {
    const token = await getToken();
    await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://first.com' });
    await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://second.com' });

    const res = await request(app).get('/urls');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ original_url: 'https://second.com' });
    expect(res.body[1]).toMatchObject({ original_url: 'https://first.com' });
  });
});

describe('GET /:code', () => {
  it('redirects 301 to the original URL (public)', async () => {
    const token = await getToken();
    const create = await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
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

describe('DELETE /urls/:code', () => {
  it('deletes a URL owned by the authenticated user and returns 204', async () => {
    const token = await getToken();
    const create = await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com' });
    const { code } = create.body as { code: string };

    const res = await request(app)
      .delete(`/urls/${code}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it("returns 403 when deleting another user's URL", async () => {
    const ownerToken = await getToken('owner@example.com');
    const otherToken = await getToken('other@example.com');

    const create = await request(app)
      .post('/urls')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ url: 'https://example.com' });
    const { code } = create.body as { code: string };

    const res = await request(app)
      .delete(`/urls/${code}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('returns 404 for an unknown code', async () => {
    const token = await getToken();
    const res = await request(app)
      .delete('/urls/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete('/urls/somecode');
    expect(res.status).toBe(401);
  });
});
