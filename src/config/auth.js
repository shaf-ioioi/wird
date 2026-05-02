'use strict';

module.exports = {
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    // Refresh tokens are opaque random bytes (not JWTs), so no HMAC secret is needed.
    accessExpiresIn: '15m',
  },
  magicLink: {
    expiresMs: 15 * 60 * 1000,        // 15 minutes
    tokenBytes: 32,
  },
  anonymousSession: {
    expiresIn: '90d',                  // anonymous tokens live longer; migrated on sign-up
  },
};
