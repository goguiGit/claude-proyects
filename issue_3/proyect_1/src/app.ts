import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';

export function createApp() {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  return app;
}
