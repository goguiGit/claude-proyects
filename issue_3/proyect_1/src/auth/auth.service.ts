import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'snap-dev-secret';
const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 10;

export interface JwtPayload {
  userId: number;
  email: string;
  name: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
}

export interface AuthResult {
  token: string;
  user: { id: number; email: string; name: string };
}

export function register(email: string, password: string, name: string): AuthResult {
  const normalizedEmail = email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) throw new Error('Email already registered');

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db
    .prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
    .run(normalizedEmail, passwordHash, name, Date.now());

  const userId = result.lastInsertRowid as number;
  const token = jwt.sign({ userId, email: normalizedEmail, name }, JWT_SECRET, { expiresIn: '24h' });
  return { token, user: { id: userId, email: normalizedEmail, name } };
}

export function login(email: string, password: string): AuthResult {
  const normalizedEmail = email.toLowerCase();
  const user = db
    .prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?')
    .get(normalizedEmail) as UserRow | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, email: normalizedEmail, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
  return { token, user: { id: user.id, email: normalizedEmail, name: user.name } };
}
