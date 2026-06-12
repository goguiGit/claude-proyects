import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import trajectoryRouter from './routes/trajectory.js';
import eventsRouter from './routes/events.js';
import telemetryRouter from './routes/telemetry.js';
import crewRouter from './routes/crew.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST ?? '127.0.0.1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET'],
}));

app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json());

app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/trajectory', trajectoryRouter);
app.use('/api/events', eventsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/crew', crewRouter);

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Artemis II Mission Tracker running at http://${HOST}:${PORT}`);
    console.log(`   API: http://${HOST}:${PORT}/api/trajectory`);
    console.log(`   Launch Date: April 1, 2026\n`);
  });
}

export default app;
