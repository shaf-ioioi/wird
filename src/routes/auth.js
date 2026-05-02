'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');

const router = express.Router();

// Tighter rate limit on auth endpoints to limit brute force / magic-link spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.', code: 'RATE_LIMITED' },
});

router.use(authLimiter);

// ---------------------------------------------------------------------------
// POST /auth/anonymous
// Body: { device_token: string (UUID v4) }
// Response: { access_token, refresh_token, user }
//
// Call on first app open. Idempotent — same device_token always returns the
// same user. No account required; the Recitation card is immediately accessible.
// ---------------------------------------------------------------------------
router.post('/anonymous', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { device_token } = req.body;

    const result = await authService.createAnonymousSession(db, { deviceToken: device_token });

    return res.status(201).json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/signup
// Body: { email: string, device_token?: string }
// Response: { message }
//
// Surfaces only when user taps "Join a family circle" or "Save my progress".
// Sends a magic-link email. Anonymous session data is preserved.
// ---------------------------------------------------------------------------
router.post('/signup', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { email, device_token } = req.body;

    const result = await authService.initiateSignup(db, {
      email,
      deviceToken: device_token,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login
// Body: { token: string }   ← magic-link token from email
// Response: { access_token, refresh_token, user }
//
// Verifies the magic-link token and returns a full JWT pair.
// Also handles returning users (re-login via magic link).
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { token } = req.body;

    const result = await authService.verifyMagicLink(db, { token });

    return res.status(200).json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// Body: { refresh_token: string }
// Response: { access_token, refresh_token, user }
//
// Rotates the refresh token. Detects reuse and revokes entire token family
// if a previously-used token is presented (theft signal).
// ---------------------------------------------------------------------------
router.post('/refresh', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { refresh_token } = req.body;

    const result = await authService.rotateRefreshToken(db, {
      refreshToken: refresh_token,
      ip: req.ip,
    });

    return res.status(200).json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
