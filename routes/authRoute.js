import express from 'express';
import { signup, login, refresh, logout ,  checkEmail,forgotPassword, resetPassword,     } from '../controllers/authController.js';
import otpController from '../controllers/otpController.js';
import protect from '../middleware/protect.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Auth service running' });
});

// ── Email check — always first ────────────────────────────
router.post('/check-email', checkEmail);         // ← add this

// Password auth — rate limited
router.post('/signup',     authLimiter, signup);
router.post('/login',      authLimiter, login);

// OTP auth — stricter limit
router.post('/send-otp',   otpLimiter,  otpController.sendOtp);
router.post('/verify-otp', otpLimiter,  otpController.verifyOtp);

// Token management
router.post('/refresh',    authLimiter, refresh);
router.post('/logout',     logout);

router.post('/forgot-password',  authLimiter, forgotPassword);  
router.post('/reset-password',   authLimiter, resetPassword); 

// Protected example route
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;