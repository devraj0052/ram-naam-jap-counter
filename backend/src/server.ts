import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { getDb } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

const app = express();

// Initialize database
try {
  getDb();
  console.log(`[Database] SQLite connected at ${ENV.DB_PATH}`);
} catch (err) {
  console.error('[Database] Failed to initialize SQLite:', err);
  process.exit(1);
}

// Global Middlewares
app.use(cors({
  origin: '*', // Allow web app, mobile app, and dev previews
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (ENV.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });
}

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'Shri Ram Naam Jap Backend API',
    version: '2.0.0',
    time: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Central Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

// Start listening
const server = app.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`  Shri Ram Naam Jap Backend API v2.0`);
  console.log(`  Server running on http://localhost:${ENV.PORT}`);
  console.log(`  Environment: ${ENV.NODE_ENV}`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

export default app;
