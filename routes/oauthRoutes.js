import express from 'express';
import {passport} from '../config/passport.js';
import { googleCallback, googleFailure } from '../controllers/oauthcontroller.js';

const router = express.Router();

// Step 1 — redirect user to Google's consent screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Step 2 — Google redirects here after user approves
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false,
  }),
  googleCallback   // only runs if Google auth succeeded
);

// Failure route
router.get('/google/failure', googleFailure);

export default router;