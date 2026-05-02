'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authConfig = require('../config/auth');

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Issue an access JWT for a user.
 * Payload includes `sub` (user id), `anon` flag, and standard claims.
 */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      anon: user.is_anonymous,
      email: user.email || null,
    },
    authConfig.jwt.accessSecret,
    { expiresIn: authConfig.jwt.accessExpiresIn }
  );
}

/**
 * Issue a refresh token opaque string, return both the raw token (to send to
 * the client) and its SHA-256 hash (to store in the DB).
 */
function generateRefreshToken() {
  const raw = generateOpaqueToken(32);
  return { raw, hash: sha256(raw) };
}

function verifyAccessToken(token) {
  return jwt.verify(token, authConfig.jwt.accessSecret);
}

// ---------------------------------------------------------------------------
// Service methods (all accept a `db` pg-pool client)
// ---------------------------------------------------------------------------

/**
 * POST /auth/anonymous
 *
 * Creates an anonymous user keyed to a client-provided device UUID.
 * Idempotent: calling again with the same device_token returns the existing user.
 */
async function createAnonymousSession(db, { deviceToken }) {
  if (!deviceToken) {
    const err = new Error('device_token is required');
    err.statusCode = 400;
    throw err;
  }

  // Validate UUID format to prevent injection via device_token
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(deviceToken)) {
    const err = new Error('device_token must be a valid UUID v4');
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await db.query(
    `INSERT INTO users (device_token, is_anonymous)
     VALUES ($1, true)
     ON CONFLICT (device_token) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [deviceToken]
  );
  const user = rows[0];

  const accessToken = signAccessToken(user);
  const { raw: refreshRaw, hash: refreshHash } = generateRefreshToken();

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '90 days')`,
    [user.id, refreshHash]
  );

  return { accessToken, refreshToken: refreshRaw, user: sanitizeUser(user) };
}

/**
 * POST /auth/signup
 *
 * Registers an email for an existing anonymous user (or creates a new account).
 * Sends a magic-link email. All anonymous session data already belongs to the
 * user row — no migration needed because anonymous sessions reference user.id.
 */
async function initiateSignup(db, { email, deviceToken }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('Valid email is required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find existing anonymous user by device token, or find existing registered user
  let user;
  if (deviceToken) {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE device_token = $1 LIMIT 1`,
      [deviceToken]
    );
    user = rows[0];
  }

  if (!user) {
    // Check if email already exists (returning user)
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );
    user = rows[0];
  }

  if (!user) {
    // Brand-new user, no prior anonymous session
    const { rows } = await db.query(
      `INSERT INTO users (email, is_anonymous) VALUES ($1, false) RETURNING *`,
      [normalizedEmail]
    );
    user = rows[0];
  } else if (user.is_anonymous) {
    // Promote anonymous user to registered; preserve all session history
    const { rows } = await db.query(
      `UPDATE users
       SET email = $1, is_anonymous = false, anonymous_migrated_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [normalizedEmail, user.id]
    );
    user = rows[0];
  }

  // Generate magic-link token
  const rawToken = generateOpaqueToken(authConfig.magicLink.tokenBytes);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + authConfig.magicLink.expiresMs);

  await db.query(
    `INSERT INTO magic_link_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // In production: send email with magic link containing rawToken.
  // Returning rawToken here only for local/dev convenience — remove in production.
  return {
    message: 'Magic link sent to ' + normalizedEmail,
    userId: user.id,
    // Only expose in non-production environments:
    ...(process.env.NODE_ENV !== 'production' && { _devMagicToken: rawToken }),
  };
}

/**
 * POST /auth/login
 *
 * Verifies a magic-link token and issues JWT pair.
 * Marks the token as used and verifies expiry.
 */
async function verifyMagicLink(db, { token }) {
  if (!token) {
    const err = new Error('token is required');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = sha256(token);

  const { rows } = await db.query(
    `UPDATE magic_link_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash]
  );

  if (!rows.length) {
    const err = new Error('Invalid or expired magic link');
    err.statusCode = 401;
    throw err;
  }

  const { user_id: userId } = rows[0];

  const { rows: userRows } = await db.query(
    `UPDATE users
     SET email_verified = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  const user = userRows[0];

  const accessToken = signAccessToken(user);
  const { raw: refreshRaw, hash: refreshHash } = generateRefreshToken();

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshHash]
  );

  return { accessToken, refreshToken: refreshRaw, user: sanitizeUser(user) };
}

/**
 * POST /auth/refresh
 *
 * Refresh token rotation: atomically revokes the presented token and issues a
 * new pair. Mirrors verifyMagicLink's UPDATE-with-conditions pattern to prevent
 * the SELECT+UPDATE race condition — two concurrent requests with the same token
 * can't both pass the revoked_at IS NULL guard.
 *
 * Theft detection: if a token that has already been rotated (revoked_at IS NOT NULL)
 * is presented, the entire token family is revoked, forcing re-authentication.
 */
async function rotateRefreshToken(db, { refreshToken, ip }) {
  if (!refreshToken) {
    const err = new Error('refresh_token is required');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = sha256(refreshToken);

  // Atomic revocation: only one concurrent request can win this UPDATE.
  const { rows } = await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING *`,
    [tokenHash]
  );

  if (!rows.length) {
    // No live token matched. Look up the token to distinguish the three cases:
    // 1. Never existed → invalid token
    // 2. revoked_at IS NOT NULL → reuse detected (theft signal) → revoke family
    // 3. Exists, not revoked, expires_at <= NOW() → expired
    const { rows: existing } = await db.query(
      `SELECT id, family, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!existing.length) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    if (existing[0].revoked_at !== null) {
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family = $1 AND revoked_at IS NULL`,
        [existing[0].family]
      );
      const err = new Error('Refresh token reuse detected; all sessions invalidated');
      err.statusCode = 401;
      throw err;
    }

    const err = new Error('Refresh token expired');
    err.statusCode = 401;
    throw err;
  }

  const record = rows[0];

  // Issue new token in the same family
  const { raw: newRaw, hash: newHash } = generateRefreshToken();

  const { rows: insertedRows } = await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at, last_used_ip)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', $4)
     RETURNING id`,
    [record.user_id, newHash, record.family, ip || null]
  );

  // Record audit trail: old token → new token
  await db.query(
    `UPDATE refresh_tokens SET replaced_by_id = $1 WHERE id = $2`,
    [insertedRows[0].id, record.id]
  );

  // Re-fetch user (may have been updated since the token was issued)
  const { rows: userRows } = await db.query(
    `SELECT * FROM users WHERE id = $1`,
    [record.user_id]
  );
  const user = userRows[0];

  const accessToken = signAccessToken(user);

  return { accessToken, refreshToken: newRaw, user: sanitizeUser(user) };
}

/**
 * Strip sensitive fields before sending user data to the client.
 */
function sanitizeUser(user) {
  const { device_token, ...safe } = user;  // eslint-disable-line no-unused-vars
  return safe;
}

module.exports = {
  createAnonymousSession,
  initiateSignup,
  verifyMagicLink,
  rotateRefreshToken,
  verifyAccessToken,
  sanitizeUser,
};
