import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.js';
import { getDb } from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  user?: any;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, full_name, is_verified, created_at, updated_at FROM users WHERE id = ?').get(payload.userId) as any;

  if (!user) {
    res.status(401).json({ error: 'Account not found or deleted.' });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  req.user = user;
  next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyToken(token);
    if (payload) {
      const db = getDb();
      const user = db.prepare('SELECT id, email, full_name, is_verified, created_at, updated_at FROM users WHERE id = ?').get(payload.userId) as any;
      if (user) {
        req.userId = user.id;
        req.userEmail = user.email;
        req.user = user;
      }
    }
  }
  next();
}
