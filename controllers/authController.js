import User from '../models/User.js';
import jwt from 'jsonwebtoken';                         // ← add this
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/generateToken.js';

const issueTokens = async (user, res, statusCode = 200) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
    },
  });
};

// POST /api/auth/signup
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const err = new Error('Please provide name, email and password');
      err.statusCode = 400;
      return next(err);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('User with this email already exists');
      err.statusCode = 409;
      return next(err);
    }

    const user = await User.create({ name, email, password });
    await issueTokens(user, res, 201);

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Please provide email and password');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    await issueTokens(user, res);

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // 1. Token present?
    if (!refreshToken) {
      const err = new Error('Refresh token required');
      err.statusCode = 400;
      return next(err);
    }

    // 2. Verify signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      const err = new Error(
        e.name === 'TokenExpiredError'
          ? 'Refresh token expired, please log in again'
          : 'Invalid refresh token'
      );
      err.statusCode = 401;
      return next(err);
    }

    // 3. Fetch user from DB
    const user = await User.findById(decoded.id);

    // 4. DB match check — catches token reuse after rotation
    if (!user || user.refreshToken !== refreshToken) {
      const err = new Error('Refresh token reuse detected');
      err.statusCode = 401;
      return next(err);
    }

    // 5. Issue new token pair (rotation)
    await issueTokens(user, res);

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null }
      );
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};