'use strict';

const { verifyAccessToken } = require('../services/authService');

/**
 * requireAuth — enforces a valid JWT access token.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header', code: 'UNAUTHORIZED' });
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token', code: 'INVALID_TOKEN' });
  }
}

/**
 * requireRegistered — extends requireAuth; rejects anonymous sessions.
 * Use this on family circle endpoints that require a real account.
 */
function requireRegistered(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.anon) {
      return res.status(403).json({
        error: 'This feature requires a registered account',
        code: 'REGISTRATION_REQUIRED',
        prompt: 'signup',
      });
    }
    next();
  });
}

/**
 * optionalAuth — attaches user if token is present and valid, but never blocks.
 * Use this on recitation endpoints that work for both anonymous and registered users.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
  } catch (_) {
    // Silently ignore invalid/expired token for optional routes
  }
  next();
}

module.exports = { requireAuth, requireRegistered, optionalAuth };
