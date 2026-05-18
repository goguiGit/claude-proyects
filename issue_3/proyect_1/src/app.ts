import express from 'express';
import healthRouter from './health/health.router.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  return app;
}
