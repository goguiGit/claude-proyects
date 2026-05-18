import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
