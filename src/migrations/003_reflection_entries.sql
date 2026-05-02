-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Reflection entries table
CREATE TABLE IF NOT EXISTS reflection_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    ayah_ref    TEXT NOT NULL,
    prompt      TEXT,
    response_text TEXT NOT NULL,
    embedding   vector(1024),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for per-user chronological lookups
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_created
    ON reflection_entries (user_id, created_at DESC);

-- Index for per-user ayah lookups (distinct seen ayahs)
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_ayah
    ON reflection_entries (user_id, ayah_ref);

-- IVFFlat index for cosine similarity search (tune lists at ~sqrt(row count))
-- Only created when the column is populated; harmless on empty table.
CREATE INDEX IF NOT EXISTS idx_reflection_entries_embedding
    ON reflection_entries
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
