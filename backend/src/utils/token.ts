import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload, expiresIn: string = ENV.JWT_EXPIRES_IN): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
