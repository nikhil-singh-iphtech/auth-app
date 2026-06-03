import dotenv from 'dotenv';
dotenv.config();   // ← runs first

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { passport, initializePassport } from './config/passport.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoute.js';
import oauthRoutes from './routes/oauthRoutes.js';
import errorHandler from './middleware/errorHandler.js';

initializePassport();   // ← now process.env values are available

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

export default app;