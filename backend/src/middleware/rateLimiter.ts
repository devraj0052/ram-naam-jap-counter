import rateLimit from 'express-rate-limit';

const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevOrTest ? 1000 : 30, // Relaxed in dev/test to allow automated test suites
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 500 : 6,
  message: { error: 'Too many verification code requests. Please wait before requesting another code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 500 : 6,
  message: { error: 'Too many password reset requests. Please check your inbox or try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
