'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db/pool');

const authRoutes = require('./routes/auth');
const reflectionRoutes = require('./routes/reflections');

const app = express();

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet());
app.set('trust proxy', 1); // trust first proxy for req.ip accuracy

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Global rate limit (per-route limits are additive)
// ---------------------------------------------------------------------------
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---------------------------------------------------------------------------
// Database pool (shared across requests via app.set)
// ---------------------------------------------------------------------------
app.set('db', db);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/reflections', reflectionRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// Centralised error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ error: message, code: err.code || 'INTERNAL_ERROR' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Wird API listening on port ${PORT}`));
}
