import express from 'express';
import healthRouter from './health/health.router.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { migrate } from './db/migrate.js';

export function createApp() {
  try {
    migrate();
  } catch (error) {
    // Gracefully handle database initialization errors (e.g., in test environments)
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    // In non-production environments, log and continue
    console.warn('Database migration failed:', error instanceof Error ? error.message : error);
  }
  
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
