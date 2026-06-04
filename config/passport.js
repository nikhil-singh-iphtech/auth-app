import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const initializePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name  = profile.displayName;

          let user = await User.findOne({ email });

          if (user) {
            // ── Existing user ────────────────────────────
            // push 'google' only if not already there
            // addProvider() is idempotent — safe to call every login
            user.addProvider('google');
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }

          // ── New user ─────────────────────────────────
          user = await User.create({
            name,
            email,
            authProviders: ['google'],  // ← array from the start
          });

          return done(null, user);

        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

export { passport, initializePassport };