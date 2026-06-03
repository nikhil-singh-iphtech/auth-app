import rateLimit from 'express-rate-limit';

// General API limit — all routes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes',
  },
});

// Strict limit — auth routes (login, signup)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // only 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again after 15 minutes',
  },
});

// Very strict — OTP routes (prevent OTP spam)
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: 3,                      // only 3 OTP requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again after 10 minutes',
  },
});