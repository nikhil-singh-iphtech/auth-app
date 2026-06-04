import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/generateToken.js';

// POST /api/auth/send-otp
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const err = new Error('Email is required');
      err.statusCode = 400;
      return next(err);
    }

    let user = await User.findOne({ email });

    if (!user) {
      // ── New user — create with local provider ────────
      user = await User.create({
        email,
        authProviders: ['local'],   // ← array, not string
      });
    }
    // existing user — no provider change needed
    // they already have their providers set correctly
    // OTP is always available regardless of authProviders

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: email,
      subject: 'Your login OTP',
      html: `
        <div style="font-family:sans-serif;max-width:400px;">
          <h2>Your one-time password</h2>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
          <p>Expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
    });

  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      const err = new Error('Email and OTP are required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findOne({ email });

    if (!user) {
      const err = new Error('Invalid or expired OTP');
      err.statusCode = 401;
      // vague — don't confirm email existence
      return next(err);
    }

    if (!user.verifyOTP(otp)) {
      const err = new Error('Invalid or expired OTP');
      err.statusCode = 401;
      return next(err);
    }

    user.clearOTP();

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id:    user._id,
        email: user.email,
        name:  user.name,
      },
    });

  } catch (error) {
    next(error);
  }
};

export default { sendOtp, verifyOtp };