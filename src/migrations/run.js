'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Create migrations tracking table if absent
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    const migrationDir = __dirname;
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        `SELECT 1 FROM _migrations WHERE filename = $1`,
        [file]
      );
      if (rows.length) {
        console.log(`[skip] ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO _migrations (filename) VALUES ($1)`,
        [file]
      );
      await client.query('COMMIT');
      console.log(`[applied] ${file}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migration failed]', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
