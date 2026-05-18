import { Router } from 'express';
import { register, login } from './auth.service.js';

const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const result = register(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Email already registered') {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = login(email, password);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid credentials') {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
});

export default authRouter;
