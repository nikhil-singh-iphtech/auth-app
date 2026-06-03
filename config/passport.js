import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const initializePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,      // read at call time, not import time
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name  = profile.displayName;

          let user = await User.findOne({ email });

          if (user) {
            if (user.authProvider === 'local') {
              user.authProvider = 'google';
              await user.save({ validateBeforeSave: false });
            }
            return done(null, user);
          }

          user = await User.create({ name, email, authProvider: 'google' });
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