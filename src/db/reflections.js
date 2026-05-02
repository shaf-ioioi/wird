'use strict';

const pool = require('./pool');

async function getLastReflections(userId, limit = 3) {
  const { rows } = await pool.query(
    `SELECT response_text FROM reflection_entries
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getSeenAyahs(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ayah_ref FROM reflection_entries WHERE user_id = $1`,
    [userId]
  );
  return rows.map(r => r.ayah_ref);
}

async function insertReflection({ userId, ayahRef, prompt, responseText, embedding }) {
  const { rows } = await pool.query(
    `INSERT INTO reflection_entries (user_id, ayah_ref, prompt, response_text, embedding, created_at)
     VALUES ($1, $2, $3, $4, $5::vector, NOW())
     RETURNING id, created_at`,
    [userId, ayahRef, prompt, responseText, embedding]
  );
  return rows[0];
}

async function findSimilarReflections(userId, embedding, limit = 5) {
  if (!embedding) return [];
  const { rows } = await pool.query(
    `SELECT id, ayah_ref, response_text, prompt,
            (embedding <=> $2::vector) AS distance
     FROM reflection_entries
     WHERE user_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [userId, embedding, limit]
  );
  return rows;
}

module.exports = { getLastReflections, getSeenAyahs, insertReflection, findSimilarReflections };
