import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

export interface EmailSendResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

interface SentEmailRecord {
  to: string;
  subject: string;
  code: string;
  token: string;
  link: string;
  sentAt: string;
}

const recentEmails: SentEmailRecord[] = [];

// Determine whether valid SMTP credentials have been provided or are placeholders
function isRealSmtp(pass: string, user: string, host: string, service: string): boolean {
  if (!user || !pass) return false;
  if (!host && !service && !user.includes('@gmail.com')) return false;

  const placeholders = [
    're_your_api_key_here',
    'your_password_here',
    'your_api_key',
    'changeme',
    'placeholder',
    'xxxx',
  ];
  const lowerPass = pass.toLowerCase();
  for (const p of placeholders) {
    if (lowerPass.includes(p)) return false;
  }
  return pass.trim().length >= 4;
}

const hasValidSmtp = isRealSmtp(ENV.SMTP_PASS, ENV.SMTP_USER, ENV.SMTP_HOST, ENV.SMTP_SERVICE);

let transporter: nodemailer.Transporter | null = null;
let effectiveFrom = ENV.SMTP_FROM;

if (hasValidSmtp) {
  // If Gmail is configured (either by service flag, host, or user email ending in @gmail.com)
  const isGmail =
    ENV.SMTP_SERVICE === 'gmail' ||
    ENV.SMTP_HOST.includes('gmail') ||
    ENV.SMTP_USER.endsWith('@gmail.com');

  if (isGmail) {
    // Strip spaces if user pasted 16-char Google App Password like 'abcd efgh ijkl mnop'
    const cleanPass = ENV.SMTP_PASS.replace(/\s+/g, '');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ENV.SMTP_USER,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    // In Gmail, sender MUST be the authenticated Gmail account
    effectiveFrom = `Shri Ram Naam Jap <${ENV.SMTP_USER}>`;
  } else {
    // Standard custom SMTP (Brevo, Resend, Amazon SES, SendGrid, etc.)
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    if (ENV.SMTP_FROM.includes('yourdomain.com') && ENV.SMTP_USER.includes('@')) {
      effectiveFrom = `Shri Ram Naam Jap <${ENV.SMTP_USER}>`;
    }
  }
}

// Test SMTP connection and print diagnostic log on startup
export async function testSmtpConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  if (!hasValidSmtp || !transporter) {
    return {
      ok: false,
      message: 'SMTP is running in Development Simulator Mode. Set SMTP_USER and SMTP_PASS in .env for real email delivery.',
      details: {
        hasValidSmtp: false,
        host: ENV.SMTP_HOST || (ENV.SMTP_USER.endsWith('@gmail.com') ? 'smtp.gmail.com' : 'none'),
        user: ENV.SMTP_USER ? `${ENV.SMTP_USER.substring(0, 3)}***` : 'none',
      },
    };
  }

  try {
    await transporter.verify();
    console.log(`[EmailService] ✅ SMTP connection verified successfully with user: ${ENV.SMTP_USER}`);
    return {
      ok: true,
      message: 'SMTP server connection verified successfully.',
      details: {
        host: ENV.SMTP_HOST || 'gmail',
        from: effectiveFrom,
      },
    };
  } catch (err: any) {
    const sanitizedMsg = err.message || 'SMTP Authentication failed';
    console.warn(`[EmailService] ⚠️ SMTP Connection Check Failed: ${sanitizedMsg}`);
    return {
      ok: false,
      message: `SMTP verification failed: ${sanitizedMsg}`,
      details: {
        code: err.code,
        responseCode: err.responseCode,
      },
    };
  }
}

// Perform initial connection test in background
if (hasValidSmtp && transporter) {
  testSmtpConnection().catch(() => {});
} else {
  console.log('[EmailService] ℹ️ SMTP credentials not configured or placeholder detected. Operating in Dev Mode.');
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string,
  token: string
): Promise<EmailSendResult> {
  const verifyLink = `${ENV.CLIENT_URL}/verify-email?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}&code=${code}`;
  const subject = `Verify your Shri Ram Naam Jap Account - OTP: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #fffaf0;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ea580c; margin: 0; font-size: 26px;">|| जय श्री राम ||</h1>
        <h2 style="color: #9a3412; margin: 6px 0 0; font-size: 20px;">Shri Ram Naam Jap Counter</h2>
      </div>
      <p style="color: #431407; font-size: 16px;">Pranam <strong>${name}</strong>,</p>
      <p style="color: #7c2d12; font-size: 15px; line-height: 1.6;">
        Thank you for joining the Shri Ram Naam Jap platform. Please verify your email address to enable cross-device cloud sync and preserve your sacred jap history.
      </p>
      <div style="background: #ffedd5; border: 2px dashed #f97316; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #9a3412; display: block; margin-bottom: 6px;">Your 6-Digit Verification OTP</span>
        <strong style="font-size: 34px; letter-spacing: 8px; color: #c2410c; font-family: monospace;">${code}</strong>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyLink}" style="background: #ea580c; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
          Verify Email Automatically
        </a>
      </div>
      <p style="color: #9a3412; font-size: 13px;">This verification code and link will expire in 15 minutes.</p>
      <hr style="border: none; border-top: 1px solid #fed7aa; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">May Lord Shri Ram bless your devotional journey.</p>
    </div>
  `;

  recentEmails.unshift({
    to,
    subject,
    code,
    token,
    link: verifyLink,
    sentAt: new Date().toISOString(),
  });
  if (recentEmails.length > 50) recentEmails.pop();

  if (hasValidSmtp && transporter) {
    try {
      const info = await transporter.sendMail({
        from: effectiveFrom,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] ✅ Verification OTP delivered to ${to} (ID: ${info.messageId})`);
      return {
        success: true,
        simulated: false,
        messageId: info.messageId,
        code,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'SMTP delivery failed';
      console.error(`[EmailService] ❌ Failed to send verification email to ${to}:`, errorMsg);
      return {
        success: false,
        simulated: false,
        error: errorMsg,
        code,
      };
    }
  } else {
    // Development simulator
    console.log(`\n======================================================`);
    console.log(`📧 [DEV EMAIL SIMULATOR] Verification Email to: ${to}`);
    console.log(`🔑 Verification Code: ${code}`);
    console.log(`🔗 Verification Link: ${verifyLink}`);
    console.log(`💡 To deliver real emails to inbox, configure SMTP_USER & SMTP_PASS in .env`);
    console.log(`======================================================\n`);
    return {
      success: true,
      simulated: true,
      code,
    };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  code: string,
  token: string
): Promise<EmailSendResult> {
  const resetLink = `${ENV.CLIENT_URL}/reset-password?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}&code=${code}`;
  const subject = `Reset your password - Shri Ram Naam Jap Counter`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #fffaf0;">
      <h2 style="color: #ea580c; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #431407;">Pranam <strong>${name}</strong>,</p>
      <p style="color: #7c2d12;">We received a request to reset your password for Shri Ram Naam Jap Counter.</p>
      <div style="background: #ffedd5; border: 2px dashed #f97316; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 14px; text-transform: uppercase; color: #9a3412; display: block; margin-bottom: 6px;">Your 6-Digit Reset Code</span>
        <strong style="font-size: 34px; letter-spacing: 8px; color: #c2410c; font-family: monospace;">${code}</strong>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="background: #ea580c; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
          Reset Password Now
        </a>
      </div>
      <p style="color: #9a3412; font-size: 13px;">If you did not request this, please ignore this email. Code expires in 15 minutes.</p>
    </div>
  `;

  recentEmails.unshift({
    to,
    subject,
    code,
    token,
    link: resetLink,
    sentAt: new Date().toISOString(),
  });
  if (recentEmails.length > 50) recentEmails.pop();

  if (hasValidSmtp && transporter) {
    try {
      const info = await transporter.sendMail({
        from: effectiveFrom,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] ✅ Password reset email delivered to ${to} (ID: ${info.messageId})`);
      return {
        success: true,
        simulated: false,
        messageId: info.messageId,
        code,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'SMTP delivery failed';
      console.error(`[EmailService] ❌ Failed to send reset email to ${to}:`, errorMsg);
      return {
        success: false,
        simulated: false,
        error: errorMsg,
        code,
      };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`📧 [DEV EMAIL SIMULATOR] Password Reset Email to: ${to}`);
    console.log(`🔑 Reset Code: ${code}`);
    console.log(`🔗 Reset Link: ${resetLink}`);
    console.log(`======================================================\n`);
    return {
      success: true,
      simulated: true,
      code,
    };
  }
}

export function getRecentEmails(): SentEmailRecord[] {
  return [...recentEmails];
}

export function getSmtpStatus() {
  return {
    isConfigured: hasValidSmtp,
    provider: ENV.SMTP_HOST || (ENV.SMTP_USER.endsWith('@gmail.com') ? 'gmail' : 'none'),
    from: effectiveFrom,
    user: ENV.SMTP_USER ? `${ENV.SMTP_USER.substring(0, 3)}***@${ENV.SMTP_USER.split('@')[1] || ''}` : '',
  };
}
