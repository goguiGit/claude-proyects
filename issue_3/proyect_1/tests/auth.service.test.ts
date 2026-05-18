import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/db/database.js';
import { register, login } from '../src/auth/auth.service.js';

beforeEach(() => {
  db.exec('DELETE FROM users');
});

describe('register', () => {
  it('creates a user and returns token and user object', () => {
    const result = register('user@example.com', 'password123', 'Alice');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.user).toMatchObject({ email: 'user@example.com', name: 'Alice' });
    expect(typeof result.user.id).toBe('number');
  });

  it('normalizes email to lowercase', () => {
    const result = register('USER@EXAMPLE.COM', 'password123', 'Alice');
    expect(result.user.email).toBe('user@example.com');
  });

  it('throws when email is already registered', () => {
    register('user@example.com', 'password123', 'Alice');
    expect(() => register('user@example.com', 'different', 'Bob')).toThrow('Email already registered');
  });

  it('treats different cases of the same email as a duplicate', () => {
    register('user@example.com', 'password123', 'Alice');
    expect(() => register('USER@EXAMPLE.COM', 'password123', 'Alice')).toThrow('Email already registered');
  });
});

describe('login', () => {
  beforeEach(() => {
    register('user@example.com', 'password123', 'Alice');
  });

  it('returns token and user on valid credentials', () => {
    const result = login('user@example.com', 'password123');
    expect(typeof result.token).toBe('string');
    expect(result.user).toMatchObject({ email: 'user@example.com', name: 'Alice' });
  });

  it('works when email is uppercased', () => {
    const result = login('USER@EXAMPLE.COM', 'password123');
    expect(typeof result.token).toBe('string');
  });

  it('throws on wrong password', () => {
    expect(() => login('user@example.com', 'wrongpassword')).toThrow('Invalid credentials');
  });

  it('throws on unknown email', () => {
    expect(() => login('nobody@example.com', 'password123')).toThrow('Invalid credentials');
  });
});
