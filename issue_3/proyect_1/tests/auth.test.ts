import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import db from '../src/db/database.js';

const app = createApp();

beforeEach(() => {
  db.exec('DELETE FROM users');
});

describe('POST /auth/register', () => {
  it('returns 201 with token and user on success', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'user@example.com', name: 'Alice' });
    expect(typeof res.body.user.id).toBe('number');
  });

  it('returns 409 on duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password123', name: 'Alice' });
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'other', name: 'Bob' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'password123', name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'notanemail', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'short', name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password123', name: 'Alice' });
  });

  it('returns 200 with token and user on valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'user@example.com', name: 'Alice' });
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email or password are missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'user@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
