import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';

// ─── SEND OTP ────────────────────────────────────────────
// POST /api/auth/send-otp
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const err = new Error('Email is required');
      err.statusCode = 400;
      return next(err);
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, authProvider: 'local' });
    }

    // Generate OTP and save to DB
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });
    // validateBeforeSave: false — skips "password required" validation
    // since OTP users may not have a password yet

    // Send email
    await sendEmail({
      to: email,
      subject: 'Your login OTP',
      html: `
        <div style="font-family: sans-serif; max-width: 400px;">
          <h2>Your one-time password</h2>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
          <p>This OTP expires in <strong>10 minutes</strong>.</p>
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
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    if (!user.verifyOTP(otp)) {
      const err = new Error('Invalid or expired OTP');
      err.statusCode = 401;
      return next(err);
    }

    user.clearOTP();

    // Issue tokens — same as password login
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    next(error);
  }
};

export default { sendOtp, verifyOtp };