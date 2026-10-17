import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  getMe,
  updatePreferences,
  deleteAccount,
  getDevRecentEmails,
  getSmtpStatusEndpoint,
  testSmtpDispatch,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter, resendLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public auth endpoints with rate limiting
router.post('/register', authLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);
router.post('/login', authLimiter, login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// Diagnostic endpoints for SMTP connectivity & test dispatch
router.get('/smtp-status', getSmtpStatusEndpoint);
router.post('/test-smtp', testSmtpDispatch);

// Protected account management endpoints
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);
router.post('/change-password', requireAuth, changePassword);
router.put('/preferences', requireAuth, updatePreferences);
router.delete('/account', requireAuth, deleteAccount);

// Dev inspector route for local testing (returns recent sent codes for verification/reset)
router.get('/dev/recent-emails', getDevRecentEmails);

export default router;
