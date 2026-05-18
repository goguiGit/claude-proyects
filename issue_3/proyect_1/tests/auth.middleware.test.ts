import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'snap-dev-secret';

function makeApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ userId: req.user?.userId });
  });
  return app;
}

describe('requireAuth middleware', () => {
  const app = makeApp();

  it('passes through with a valid Bearer token and populates req.user', async () => {
    const token = jwt.sign(
      { userId: 1, email: 'u@example.com', name: 'U' },
      JWT_SECRET,
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(1);
  });

  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer this-is-not-a-jwt');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 with an expired token', async () => {
    const token = jwt.sign(
      { userId: 1, email: 'u@example.com', name: 'U' },
      JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
