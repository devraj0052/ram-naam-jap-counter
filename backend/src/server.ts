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

// CORS Configuration supporting configured frontend URLs, Vercel deployments, and mobile/app requests
const configuredOrigins = [
  ENV.FRONTEND_URL,
  ENV.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow if wildcard or development
    if (ENV.FRONTEND_URL === '*' || ENV.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 3. Exact configured origins (Vercel production URL, CLIENT_URL, etc.)
    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 4. Any Vercel deployment preview or production domain (*.vercel.app)
    if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }

    // 5. Render web service preview / custom domains (*.onrender.com)
    if (/^https:\/\/([a-z0-9-]+\.)*onrender\.com$/i.test(origin)) {
      return callback(null, true);
    }

    // 6. Local development domains & IP ports
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
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

// Start listening on 0.0.0.0 and dynamic port
const server = app.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  Shri Ram Naam Jap Backend API v2.0`);
  console.log(`  Server running on http://0.0.0.0:${ENV.PORT}`);
  console.log(`  Environment: ${ENV.NODE_ENV}`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

export default app;
