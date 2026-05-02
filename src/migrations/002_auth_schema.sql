-- Auth schema: extends the users table from 001_schema.sql
-- Adds refresh_tokens for JWT rotation and anonymous session tracking

-- Extend users table with anonymous-first columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS device_token UUID UNIQUE,          -- client-generated UUID for anonymous users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymous_migrated_at TIMESTAMP WITH TIME ZONE;

-- Partial unique index: only one anonymous user per device token
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_token
  ON users(device_token)
  WHERE device_token IS NOT NULL;

-- Partial unique index: only one registered user per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
  ON users(email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- Magic-link / OTP tokens for passwordless email auth
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 of the raw token
  expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at      TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_user
  ON magic_link_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires
  ON magic_link_tokens(expires_at)
  WHERE used_at IS NULL;

-- Refresh tokens for JWT rotation (one active token per session)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 of the raw token
  family         UUID NOT NULL DEFAULT gen_random_uuid(), -- rotation family; revoke whole family on reuse
  expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at     TIMESTAMP WITH TIME ZONE,
  replaced_by_id UUID REFERENCES refresh_tokens(id),
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_ip   INET
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens(user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON refresh_tokens(family)
  WHERE revoked_at IS NULL;
