import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/generateToken.js';

// Called after Passport verifies Google profile successfully
// GET /api/auth/google/callback (on success)
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;  // attached by passport.authenticate()

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Redirect to frontend with tokens in query string
    // In production: use httpOnly cookies instead
    res.redirect(
      `${process.env.CLIENT_URL}/auth/success` +
      `?accessToken=${accessToken}` +
      `&refreshToken=${refreshToken}`
    );

  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }
};

// OAuth failure handler
export const googleFailure = (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google authentication failed',
  });
};