import express from 'express';
import healthRouter from './health/health.router.js';
import urlsRouter from './urls/urls.router.js';
import redirectRouter from './urls/redirect.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { migrate } from './db/migrate.js';

export function createApp() {
  migrate();
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/urls', urlsRouter);
  app.use('/', redirectRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
