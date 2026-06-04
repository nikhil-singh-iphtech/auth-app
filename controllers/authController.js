import User from '../models/User.js';
import jwt from 'jsonwebtoken'; 
import sendEmail from '../utils/sendEmail.js';                        
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

    const user = await User.create({ 
        name,
        email,
        password ,
        authProviders: ['local'],
    });
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

    // ── Case 1 & 2: no user OR no password ────────────
    // same vague message — never confirm if email exists
    // or which provider they used
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        // frontend reads this code and says
        // "try /check-email to see your login options"
      });
    }

    // ── Case 3: wrong password ─────────────────────────
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        // same code — attacker can't tell if email
        // was wrong or password was wrong
      });
    }

    // ── Case 4: success ────────────────────────────────
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

// POST /api/auth/check-email
export const checkEmail=async(req,res,next)=>{
    try{
       const {email}=req.body

       if(!email){
        const err=new Error("Email is required")
        err.statusCode=400
        return next(err)
       }

       const user=await User.findOne({email})

       if(!user){
        return res.status(200).json({
            exists: false,
            availableMethods: [],
            message: 'No account found. Please sign up.',
        })
       }
       return res.status(200).json({
          exists:true,
          availableMethods: user.getAvailableMethods()
       })
    }catch(err){
         next(err);
    }
}


// POST /api/auth/forgot-password

export const forgotPassword=async(req,res,next)=>{
    try{
     const {email}=req.body
     if(!email){
        const err=new Error("email is required")
        err.status=400
        return next(err)

     }
      const safeResponse = () =>
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });

      const user=await User.findOne({email})

      if(!user) return safeResponse()

    

    const rawToken = user.generatePasswordResetToken();
    // generatePasswordResetToken() does:
    //   1. crypto.randomBytes(32) → rawToken
    //   2. sha256(rawToken)       → stored in user.passwordResetToken
    //   3. now + 15min            → stored in user.passwordResetExpiry
    //   4. returns rawToken       → goes into email only

    await user.save({ validateBeforeSave: false });
    

    const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${email}`;

    // ── Send email ─────────────────────────────────────
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;">
            <h2>Reset your password</h2>
            <p>You requested a password reset. Click the button below:</p>
            <a href="${resetURL}"
               style="display:inline-block;padding:12px 24px;background:#5340C8;
                      color:#fff;border-radius:6px;text-decoration:none;font-weight:500;">
              Reset password
            </a>
            <p style="margin-top:16px;color:#666;font-size:13px;">
              This link expires in <strong>15 minutes</strong>.
              If you didn't request this, ignore this email.
            </p>
            <p style="color:#999;font-size:12px;">
              Or copy this link: ${resetURL}
            </p>
          </div>
        `,
      });
    } catch (emailError) {
  console.error("EMAIL ERROR:", emailError);

  user.clearPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const err = new Error('Email could not be sent. Please try again.');
  err.statusCode = 500;
  return next(err);
}

    return safeResponse();

    }catch(err){
        next(err)
    }
}


// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    // ── Validate input ─────────────────────────────────
    if (!email || !token || !newPassword) {
      const err = new Error('Email, token and new password are required');
      err.statusCode = 400;
      return next(err);
    }

    if (newPassword.length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      return next(err);
    }

    // ── Find user ──────────────────────────────────────
    const user = await User.findOne({ email });

    if (!user) {
      const err = new Error('Invalid or expired reset token');
      err.statusCode = 400;
      return next(err);
      // vague on purpose — don't confirm email existence
    }

    // ── Verify token ───────────────────────────────────
    const isValid = user.verifyPasswordResetToken(token);
    // verifyPasswordResetToken():
    //   1. hashes the incoming rawToken with sha256
    //   2. compares with stored hash
    //   3. checks expiry hasn't passed

    if (!isValid) {
      const err = new Error('Invalid or expired reset token');
      err.statusCode = 400;
      return next(err);
    }

    // ── Set new password ───────────────────────────────
    user.password = newPassword;
    // pre-save hook will hash this automatically

    // ── Push 'password' into authProviders[] ──────────
    // this is the key step — after this, /check-email
    // returns 'password' in availableMethods
    user.addProvider('local');
    // addProvider() only pushes if not already present
    // so calling it twice is safe

    // ── Clear reset token ──────────────────────────────
    // token is single-use — null it out immediately
    user.clearPasswordResetToken();

    await user.save();
    // pre-save hook fires here → hashes user.password

    // ── Issue tokens — log them in directly ───────────
    // no need to make them log in again after resetting
    await issueTokens(user, res);

  } catch (err) {
    next(err);
  }
};