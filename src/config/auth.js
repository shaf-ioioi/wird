'use strict';

module.exports = {
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
    refreshExpiresMs: 30 * 24 * 60 * 60 * 1000,
  },
  magicLink: {
    expiresMs: 15 * 60 * 1000,        // 15 minutes
    tokenBytes: 32,
  },
  anonymousSession: {
    expiresIn: '90d',                  // anonymous tokens live longer; migrated on sign-up
  },
};
