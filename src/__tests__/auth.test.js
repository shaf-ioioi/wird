'use strict';

/**
 * Auth service unit tests — uses an in-memory mock db client.
 * Run: npm test
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-padded!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-paddd!';
process.env.NODE_ENV = 'test';

const authService = require('../services/authService');

// ---------------------------------------------------------------------------
// Minimal mock DB that stores rows in-memory
// ---------------------------------------------------------------------------
function createMockDb() {
  const tables = {
    users: [],
    magic_link_tokens: [],
    refresh_tokens: [],
  };
  let seq = 1;

  return {
    _tables: tables,
    async query(sql, params = []) {
      const s = sql.trim().toLowerCase().replace(/\s+/g, ' ');

      // INSERT INTO users ... ON CONFLICT ... RETURNING *
      if (s.startsWith('insert into users') && s.includes('on conflict')) {
        const [device_token] = params;
        let existing = tables.users.find(u => u.device_token === device_token);
        if (existing) {
          existing.updated_at = new Date().toISOString();
          return { rows: [existing] };
        }
        const newUser = {
          id: `user-${seq++}`,
          device_token,
          is_anonymous: true,
          email: null,
          email_verified: false,
          anonymous_migrated_at: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tables.users.push(newUser);
        return { rows: [newUser] };
      }

      // INSERT INTO users (email, is_anonymous)
      if (s.startsWith('insert into users') && s.includes('email')) {
        const [email] = params;
        const newUser = {
          id: `user-${seq++}`,
          device_token: null,
          is_anonymous: false,
          email,
          email_verified: false,
          anonymous_migrated_at: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tables.users.push(newUser);
        return { rows: [newUser] };
      }

      // SELECT * FROM users WHERE device_token
      if (s.includes('from users') && s.includes('device_token')) {
        const [device_token] = params;
        const rows = tables.users.filter(u => u.device_token === device_token);
        return { rows };
      }

      // SELECT * FROM users WHERE email
      if (s.includes('from users') && s.includes('email')) {
        const [email] = params;
        const rows = tables.users.filter(u => u.email === email);
        return { rows };
      }

      // UPDATE users SET email ...
      if (s.startsWith('update users') && s.includes('email')) {
        const [email, id] = params;
        const user = tables.users.find(u => u.id === id);
        if (user) {
          user.email = email;
          user.is_anonymous = false;
          user.anonymous_migrated_at = new Date().toISOString();
          user.updated_at = new Date().toISOString();
        }
        return { rows: user ? [user] : [] };
      }

      // UPDATE users SET email_verified
      if (s.startsWith('update users') && s.includes('email_verified')) {
        const [id] = params;
        const user = tables.users.find(u => u.id === id);
        if (user) user.email_verified = true;
        return { rows: user ? [user] : [] };
      }

      // SELECT * FROM users WHERE id
      if (s.includes('from users') && s.includes('where id')) {
        const [id] = params;
        const rows = tables.users.filter(u => u.id === id);
        return { rows };
      }

      // INSERT INTO refresh_tokens
      if (s.startsWith('insert into refresh_tokens')) {
        const token = {
          id: `rt-${seq++}`,
          user_id: params[0],
          token_hash: params[1],
          family: params[2] || `fam-${seq++}`,
          expires_at: params[3] || new Date(Date.now() + 30 * 86400000).toISOString(),
          revoked_at: null,
          replaced_by_id: null,
          last_used_ip: params[4] || null,
          created_at: new Date().toISOString(),
        };
        tables.refresh_tokens.push(token);
        return { rows: [token] };
      }

      // SELECT rt.*, u.* FROM refresh_tokens rt JOIN users
      if (s.includes('from refresh_tokens rt') && s.includes('join users')) {
        const [hash] = params;
        const rt = tables.refresh_tokens.find(t => t.token_hash === hash);
        if (!rt) return { rows: [] };
        const user = tables.users.find(u => u.id === rt.user_id);
        return { rows: rt ? [{ ...rt, ...user }] : [] };
      }

      // UPDATE refresh_tokens SET revoked_at WHERE id
      if (s.startsWith('update refresh_tokens') && s.includes('where id')) {
        const [id] = params;
        const rt = tables.refresh_tokens.find(t => t.id === id);
        if (rt) rt.revoked_at = new Date().toISOString();
        return { rows: [] };
      }

      // UPDATE refresh_tokens SET revoked_at WHERE family (theft revocation)
      if (s.startsWith('update refresh_tokens') && s.includes('where family')) {
        const [family] = params;
        tables.refresh_tokens
          .filter(t => t.family === family)
          .forEach(t => { t.revoked_at = new Date().toISOString(); });
        return { rows: [] };
      }

      // INSERT INTO magic_link_tokens
      if (s.startsWith('insert into magic_link_tokens')) {
        const token = {
          id: `ml-${seq++}`,
          user_id: params[0],
          token_hash: params[1],
          expires_at: params[2],
          used_at: null,
          created_at: new Date().toISOString(),
        };
        tables.magic_link_tokens.push(token);
        return { rows: [token] };
      }

      // UPDATE magic_link_tokens SET used_at WHERE token_hash
      if (s.startsWith('update magic_link_tokens')) {
        const [hash] = params;
        const ml = tables.magic_link_tokens.find(
          t => t.token_hash === hash && !t.used_at && new Date(t.expires_at) > new Date()
        );
        if (!ml) return { rows: [] };
        ml.used_at = new Date().toISOString();
        return { rows: [{ user_id: ml.user_id }] };
      }

      return { rows: [] };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /auth/anonymous (createAnonymousSession)', () => {
  test('creates a new anonymous user and returns tokens', async () => {
    const db = createMockDb();
    const deviceToken = '550e8400-e29b-41d4-a716-446655440000';

    const result = await authService.createAnonymousSession(db, { deviceToken });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.is_anonymous).toBe(true);
    expect(result.user.device_token).toBeUndefined(); // sanitized
  });

  test('is idempotent — same device_token returns same user', async () => {
    const db = createMockDb();
    const deviceToken = '550e8400-e29b-41d4-a716-446655440000';

    const r1 = await authService.createAnonymousSession(db, { deviceToken });
    const r2 = await authService.createAnonymousSession(db, { deviceToken });

    expect(r1.user.id).toBe(r2.user.id);
    expect(db._tables.users).toHaveLength(1);
  });

  test('rejects missing device_token', async () => {
    const db = createMockDb();
    await expect(authService.createAnonymousSession(db, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects malformed device_token', async () => {
    const db = createMockDb();
    await expect(
      authService.createAnonymousSession(db, { deviceToken: 'not-a-uuid' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('POST /auth/signup (initiateSignup)', () => {
  test('promotes anonymous user to registered on signup', async () => {
    const db = createMockDb();
    const deviceToken = '550e8400-e29b-41d4-a716-446655440001';

    await authService.createAnonymousSession(db, { deviceToken });
    const result = await authService.initiateSignup(db, {
      email: 'user@example.com',
      deviceToken,
    });

    expect(result.message).toMatch(/magic link sent/i);
    const user = db._tables.users[0];
    expect(user.is_anonymous).toBe(false);
    expect(user.email).toBe('user@example.com');
    expect(user.anonymous_migrated_at).toBeTruthy();
    // One user row, not two
    expect(db._tables.users).toHaveLength(1);
  });

  test('rejects invalid email', async () => {
    const db = createMockDb();
    await expect(
      authService.initiateSignup(db, { email: 'not-an-email' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('POST /auth/login (verifyMagicLink)', () => {
  test('verifies magic-link token and returns JWT pair', async () => {
    const db = createMockDb();

    await authService.initiateSignup(db, { email: 'login@example.com' });
    // In dev mode, _devMagicToken is returned
    const signupResult = await authService.initiateSignup(db, { email: 'login2@example.com' });

    // Manually grab the raw token from the mock (simulate email click)
    const crypto = require('crypto');
    const rawToken = require('crypto').randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = db._tables.users[db._tables.users.length - 1];
    db._tables.magic_link_tokens.push({
      id: 'ml-test',
      user_id: user.id,
      token_hash: hash,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      used_at: null,
      created_at: new Date().toISOString(),
    });

    const result = await authService.verifyMagicLink(db, { token: rawToken });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email_verified).toBe(true);
  });

  test('rejects expired magic-link', async () => {
    const db = createMockDb();
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    db._tables.users.push({ id: 'u-x', email: 'x@test.com', is_anonymous: false });
    db._tables.magic_link_tokens.push({
      id: 'ml-exp',
      user_id: 'u-x',
      token_hash: hash,
      expires_at: new Date(Date.now() - 1000).toISOString(), // already expired
      used_at: null,
    });

    await expect(authService.verifyMagicLink(db, { token: rawToken })).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe('POST /auth/refresh (rotateRefreshToken)', () => {
  test('issues new token pair and revokes old refresh token', async () => {
    const db = createMockDb();
    const deviceToken = '550e8400-e29b-41d4-a716-446655440002';

    const { refreshToken } = await authService.createAnonymousSession(db, { deviceToken });

    const result = await authService.rotateRefreshToken(db, { refreshToken });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(refreshToken);

    // Old token should be revoked
    const crypto = require('crypto');
    const oldHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const old = db._tables.refresh_tokens.find(t => t.token_hash === oldHash);
    expect(old.revoked_at).toBeTruthy();
  });

  test('detects token reuse and revokes entire family', async () => {
    const db = createMockDb();
    const deviceToken = '550e8400-e29b-41d4-a716-446655440003';

    const { refreshToken } = await authService.createAnonymousSession(db, { deviceToken });
    // First rotation (legitimate)
    await authService.rotateRefreshToken(db, { refreshToken });
    // Reuse the original token (theft simulation)
    await expect(
      authService.rotateRefreshToken(db, { refreshToken })
    ).rejects.toMatchObject({ statusCode: 401 });

    // All tokens in the family should be revoked
    const allRevoked = db._tables.refresh_tokens.every(t => t.revoked_at !== null);
    expect(allRevoked).toBe(true);
  });
});
