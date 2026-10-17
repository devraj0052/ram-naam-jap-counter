import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb } from '../config/db.js';
import { signToken, generateOtp, generateRandomToken } from '../utils/token.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  getRecentEmails,
  testSmtpConnection,
  getSmtpStatus,
} from '../services/emailService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (minimum 2 characters).' });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match. Please verify and re-enter.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const db = getDb();

    // Check if user already exists
    const existing = db.prepare('SELECT id, email, full_name, is_verified FROM users WHERE email = ?').get(cleanEmail) as any;

    if (existing) {
      if (existing.is_verified) {
        res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
        return;
      }

      // Existing unverified user: update credentials and generate fresh verification
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      db.prepare('UPDATE users SET full_name = ?, password_hash = ?, updated_at = ? WHERE id = ?').run(
        cleanName,
        passwordHash,
        now,
        existing.id
      );

      // Invalidate any previous pending OTP codes for this user
      db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(existing.id);

      const code = generateOtp(6);
      const token = generateRandomToken();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      db.prepare(`
        INSERT INTO email_verifications (id, user_id, token, code, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), existing.id, token, code, expiresAt, now);

      const emailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token);

      if (!emailResult.success) {
        res.status(502).json({
          error: `Verification code generated, but email delivery failed: ${emailResult.error}. Please check your SMTP settings in .env.`,
          email: cleanEmail,
          userId: existing.id,
        });
        return;
      }

      res.status(200).json({
        message: emailResult.simulated
          ? `Account updated! (Development Mode: Verification code generated)`
          : 'A new 6-digit verification code has been delivered to your email.',
        email: cleanEmail,
        userId: existing.id,
        isVerified: false,
        simulated: emailResult.simulated,
        devOtp: emailResult.simulated ? code : undefined,
      });
      return;
    }

    // New user creation
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, full_name, password_hash, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(userId, cleanEmail, cleanName, passwordHash, now, now);

    // Default user preferences
    db.prepare(`
      INSERT INTO user_preferences (user_id, language, theme, mala_target, mala_size, sound_enabled, vibration_enabled, selected_darshan_id, bg_music_state, updated_at)
      VALUES (?, 'en', 'saffron', 250, 108, 1, 1, 1, 0, ?)
    `).run(userId, now);

    // Create verification token & code
    const code = generateOtp(6);
    const token = generateRandomToken();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    db.prepare(`
      INSERT INTO email_verifications (id, user_id, token, code, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, token, code, expiresAt, now);

    const emailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token);

    if (!emailResult.success) {
      res.status(502).json({
        error: `Account created, but verification email could not be delivered: ${emailResult.error}. Please check your SMTP settings in .env.`,
        email: cleanEmail,
        userId,
      });
      return;
    }

    res.status(201).json({
      message: emailResult.simulated
        ? 'Registration successful! (Development Mode: Verification code generated)'
        : 'Registration successful! A 6-digit verification code has been sent to your email address.',
      email: cleanEmail,
      userId,
      isVerified: false,
      simulated: emailResult.simulated,
      devOtp: emailResult.simulated ? code : undefined,
    });
  } catch (err: any) {
    console.error('[AuthController] Register error:', err);
    res.status(500).json({ error: 'Registration failed due to an internal server error.' });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, token } = req.body;

    if (!email || (!code && !token)) {
      res.status(400).json({ error: 'Please provide your email and the 6-digit verification code or link token.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code ? code.toString().trim() : '';
    const cleanToken = token ? token.toString().trim() : '';
    const db = getDb();

    const user = db.prepare('SELECT id, email, full_name, is_verified FROM users WHERE email = ?').get(cleanEmail) as any;
    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    // If user is already verified, provide frictionless login
    if (user.is_verified) {
      const authToken = signToken({ userId: user.id, email: user.email });
      const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id) as any;
      res.status(200).json({
        message: 'Your email address is already verified. Welcome to Shri Ram Naam Jap.',
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          isVerified: true,
        },
        preferences: preferences ? formatPreferences(preferences) : defaultPreferences(user.id),
      });
      return;
    }

    const now = Date.now();
    let verification: any = null;

    if (cleanCode) {
      verification = db.prepare(`
        SELECT * FROM email_verifications 
        WHERE user_id = ? AND code = ? AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(user.id, cleanCode, now);
    } else if (cleanToken) {
      verification = db.prepare(`
        SELECT * FROM email_verifications 
        WHERE user_id = ? AND token = ? AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(user.id, cleanToken, now);
    }

    if (!verification) {
      res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
      return;
    }

    // Mark user verified
    const isoNow = new Date().toISOString();
    db.prepare('UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?').run(isoNow, user.id);

    // Remove used verification entries for this user
    db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(user.id);

    const authToken = signToken({ userId: user.id, email: user.email });
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id) as any;

    res.status(200).json({
      message: 'Email successfully verified! Welcome to Shri Ram Naam Jap.',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isVerified: true,
      },
      preferences: preferences ? formatPreferences(preferences) : defaultPreferences(user.id),
    });
  } catch (err: any) {
    console.error('[AuthController] VerifyEmail error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name, is_verified FROM users WHERE email = ?').get(cleanEmail) as any;

    if (!user) {
      res.status(404).json({ error: 'No account registered with this email address.' });
      return;
    }

    if (user.is_verified) {
      res.status(400).json({ error: 'This account is already verified. Please log in.' });
      return;
    }

    // Enforce 60-second cooldown rate limiting between resends per user
    const lastVerification = db.prepare(`
      SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(user.id) as any;

    if (lastVerification) {
      const lastTime = new Date(lastVerification.created_at).getTime();
      const elapsed = Date.now() - lastTime;
      if (elapsed < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - elapsed) / 1000);
        res.status(429).json({ error: `Please wait ${remaining} seconds before requesting another verification code.` });
        return;
      }
    }

    // Invalidate previous pending verification records for this user
    db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(user.id);

    const code = generateOtp(6);
    const token = generateRandomToken();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO email_verifications (id, user_id, token, code, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), user.id, token, code, expiresAt, now);

    const emailResult = await sendVerificationEmail(cleanEmail, user.full_name, code, token);

    if (!emailResult.success) {
      res.status(502).json({
        error: `Could not send verification email: ${emailResult.error}. Please check your SMTP settings in .env.`,
      });
      return;
    }

    res.status(200).json({
      message: emailResult.simulated
        ? `A fresh verification code was generated (Development Mode: ${code})`
        : 'A fresh 6-digit verification code has been delivered to your email.',
      simulated: emailResult.simulated,
      devOtp: emailResult.simulated ? code : undefined,
    });
  } catch (err: any) {
    console.error('[AuthController] Resend error:', err);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide both email and password.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id) as any;

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isVerified: Boolean(user.is_verified),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      preferences: preferences ? formatPreferences(preferences) : defaultPreferences(user.id),
    });
  } catch (err: any) {
    console.error('[AuthController] Login error:', err);
    res.status(500).json({ error: 'Login failed due to an internal server error.' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Please enter your registered email address.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name FROM users WHERE email = ?').get(cleanEmail) as any;

    let emailResult: any = null;
    let code = '';

    if (user) {
      code = generateOtp(6);
      const token = generateRandomToken();
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const now = new Date().toISOString();

      // Invalidate existing unused password resets for this user
      db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now, user.id);

      db.prepare(`
        INSERT INTO password_resets (id, user_id, token, code, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), user.id, token, code, expiresAt, now);

      emailResult = await sendPasswordResetEmail(cleanEmail, user.full_name, code, token);
    }

    // Always respond with success message to prevent user enumeration
    res.status(200).json({
      message: 'If this email is registered in our system, a password reset code has been sent.',
      simulated: emailResult?.simulated,
      devOtp: emailResult?.simulated ? code : undefined,
    });
  } catch (err: any) {
    console.error('[AuthController] Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, token, newPassword } = req.body;

    if (!email || (!code && !token) || !newPassword) {
      res.status(400).json({ error: 'Email, verification code/token, and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code ? code.toString().trim() : '';
    const cleanToken = token ? token.toString().trim() : '';
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as any;

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired password reset request.' });
      return;
    }

    const now = Date.now();
    let resetRecord: any = null;

    if (cleanCode) {
      resetRecord = db.prepare(`
        SELECT * FROM password_resets 
        WHERE user_id = ? AND code = ? AND expires_at > ? AND used_at IS NULL 
        ORDER BY created_at DESC LIMIT 1
      `).get(user.id, cleanCode, now);
    } else if (cleanToken) {
      resetRecord = db.prepare(`
        SELECT * FROM password_resets 
        WHERE user_id = ? AND token = ? AND expires_at > ? AND used_at IS NULL 
        ORDER BY created_at DESC LIMIT 1
      `).get(user.id, cleanToken, now);
    }

    if (!resetRecord) {
      res.status(400).json({ error: 'Invalid or expired password reset code. Please request a new code.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const isoNow = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, isoNow, user.id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(isoNow, resetRecord.id);

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err: any) {
    console.error('[AuthController] Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId!;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'The current password you entered is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[AuthController] Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const db = getDb();

    const user = db.prepare('SELECT id, email, full_name, is_verified, created_at, updated_at FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    const countRow = db.prepare('SELECT COALESCE(SUM(delta), 0) as total FROM count_events WHERE user_id = ?').get(userId) as any;

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isVerified: Boolean(user.is_verified),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        totalCount: countRow?.total || 0,
      },
      preferences: prefs ? formatPreferences(prefs) : defaultPreferences(userId),
    });
  } catch (err: any) {
    console.error('[AuthController] getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { language, theme, malaTarget, malaSize, soundEnabled, vibrationEnabled, selectedDarshanId, bgMusicState } = req.body;

    const db = getDb();
    const now = new Date().toISOString();

    const current = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;

    const newLang = language || current?.language || 'en';
    const newTheme = theme || current?.theme || 'saffron';
    const newTarget = typeof malaTarget === 'number' ? malaTarget : current?.mala_target || 250;
    const newSize = typeof malaSize === 'number' ? malaSize : current?.mala_size || 108;
    const newSound = typeof soundEnabled === 'boolean' ? (soundEnabled ? 1 : 0) : current?.sound_enabled ?? 1;
    const newVib = typeof vibrationEnabled === 'boolean' ? (vibrationEnabled ? 1 : 0) : current?.vibration_enabled ?? 1;
    const newDarshan = typeof selectedDarshanId === 'number' ? selectedDarshanId : current?.selected_darshan_id || 1;
    const newBg = typeof bgMusicState === 'boolean' ? (bgMusicState ? 1 : 0) : current?.bg_music_state ?? 0;

    db.prepare(`
      INSERT INTO user_preferences (user_id, language, theme, mala_target, mala_size, sound_enabled, vibration_enabled, selected_darshan_id, bg_music_state, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        language = excluded.language,
        theme = excluded.theme,
        mala_target = excluded.mala_target,
        mala_size = excluded.mala_size,
        sound_enabled = excluded.sound_enabled,
        vibration_enabled = excluded.vibration_enabled,
        selected_darshan_id = excluded.selected_darshan_id,
        bg_music_state = excluded.bg_music_state,
        updated_at = excluded.updated_at
    `).run(userId, newLang, newTheme, newTarget, newSize, newSound, newVib, newDarshan, newBg, now);

    res.status(200).json({
      message: 'Preferences updated successfully.',
      preferences: {
        userId,
        language: newLang,
        theme: newTheme,
        malaTarget: newTarget,
        malaSize: newSize,
        soundEnabled: Boolean(newSound),
        vibrationEnabled: Boolean(newVib),
        selectedDarshanId: newDarshan,
        bgMusicState: Boolean(newBg),
      },
    });
  } catch (err: any) {
    console.error('[AuthController] Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password confirmation is required to delete your account.' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect password. Account deletion aborted.' });
      return;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM count_events WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM jap_sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM daily_stats WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM daily_targets WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    res.status(200).json({ message: 'Your account and all associated cloud data have been permanently deleted.' });
  } catch (err: any) {
    console.error('[AuthController] Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    console.log(`[AuthController] User ${userId} logged out successfully.`);
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('[AuthController] Logout error:', err);
    res.status(500).json({ error: 'Failed to process logout.' });
  }
}

// Development endpoint to inspect recent sent verification & reset codes
export function getDevRecentEmails(req: Request, res: Response): void {
  const emails = getRecentEmails();
  res.status(200).json({ count: emails.length, emails });
}

// Diagnostic endpoint to check SMTP configuration & connectivity
export async function getSmtpStatusEndpoint(req: Request, res: Response): Promise<void> {
  const status = getSmtpStatus();
  const test = await testSmtpConnection();
  res.status(200).json({
    status,
    connectionTest: test,
  });
}

// Manual test email dispatch to check real SMTP delivery
export async function testSmtpDispatch(req: Request, res: Response): Promise<void> {
  const { testEmail } = req.body;
  if (!testEmail || !EMAIL_REGEX.test(testEmail)) {
    res.status(400).json({ error: 'Please provide a valid test email address.' });
    return;
  }

  const testOtp = generateOtp(6);
  const result = await sendVerificationEmail(testEmail, 'Test User', testOtp, 'test-token');

  if (result.success) {
    res.status(200).json({
      message: result.simulated
        ? `Dev Mode: Simulated test email generated (OTP: ${testOtp}). Set SMTP_USER & SMTP_PASS in .env for real delivery.`
        : `Live test email dispatched successfully to ${testEmail}! Check your inbox.`,
      result,
    });
  } else {
    res.status(502).json({
      error: `SMTP delivery failed: ${result.error}`,
      result,
    });
  }
}

function formatPreferences(row: any) {
  return {
    userId: row.user_id,
    language: row.language,
    theme: row.theme,
    malaTarget: row.mala_target,
    malaSize: row.mala_size,
    soundEnabled: Boolean(row.sound_enabled),
    vibrationEnabled: Boolean(row.vibration_enabled),
    selectedDarshanId: row.selected_darshan_id,
    bgMusicState: Boolean(row.bg_music_state),
  };
}

function defaultPreferences(userId: string) {
  return {
    userId,
    language: 'en',
    theme: 'saffron',
    malaTarget: 250,
    malaSize: 108,
    soundEnabled: true,
    vibrationEnabled: true,
    selectedDarshanId: 1,
    bgMusicState: false,
  };
}
