'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { getLastReflections, getSeenAyahs, insertReflection, findSimilarReflections } = require('../db/reflections');
const { generateReflectionPrompt, generateTafsirConnection } = require('../reflections/claudeService');
const { generateEmbedding, formatForPgVector } = require('../reflections/embeddingService');
const { semanticSearch } = require('../reflections/quranMcpService');
const { getTafsir, buildAyahText, getKnownAyahRefs } = require('../reflections/tafsirService');

const router = express.Router();

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

router.use(requireAuth);

const AYAH_REF_RE = /^\d{1,3}:\d{1,3}$/;

// ---------------------------------------------------------------------------
// POST /reflections/prompt — generate a personalised reflection prompt
// ---------------------------------------------------------------------------
router.post('/prompt', async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { ayah_ref } = req.body;

    if (!ayah_ref || !AYAH_REF_RE.test(ayah_ref)) {
      const err = new Error('ayah_ref must be in format surah:ayah (e.g. 13:28)');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const tafsirEntry = getTafsir(ayah_ref);
    const ayahText = buildAyahText(tafsirEntry);
    const recentReflections = await getLastReflections(user_id);

    const { prompt, cached, fallback } = await generateReflectionPrompt({
      ayahRef: ayah_ref,
      ayahText: ayahText || ayah_ref,
      tafsirSummary: tafsirEntry?.tafsir_summary || null,
      recentReflections,
    });

    return res.json({ prompt, ayah_ref, cached, fallback });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /reflections/submit — submit a reflection and get tafsir connection
// ---------------------------------------------------------------------------
router.post('/submit', async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { ayah_ref, prompt, response_text } = req.body;

    if (!ayah_ref || !AYAH_REF_RE.test(ayah_ref)) {
      const err = new Error('ayah_ref must be in format surah:ayah (e.g. 13:28)');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    if (!response_text || typeof response_text !== 'string') {
      const err = new Error('response_text is required');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    if (response_text.trim().length < 20) {
      const err = new Error('response_text must be at least 20 characters');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const tafsirEntry = getTafsir(ayah_ref);
    const ayahText = buildAyahText(tafsirEntry);

    const [mcpResults, recentReflections] = await Promise.all([
      semanticSearch(response_text, { limit: 3, excludeRef: ayah_ref }),
      getLastReflections(user_id),
    ]);

    const relatedAyahs = mcpResults.map((r) => r.ayah_ref).filter(Boolean);

    const [tafsirResult, embedding] = await Promise.all([
      generateTafsirConnection({
        ayahRef: ayah_ref,
        ayahText: ayahText || ayah_ref,
        tafsirSummary: tafsirEntry?.tafsir_summary || null,
        responseText: response_text,
        relatedAyahs,
      }),
      generateEmbedding(response_text),
    ]);

    const pgVector = formatForPgVector(embedding);

    const saved = await insertReflection({
      userId: user_id,
      ayahRef: ayah_ref,
      prompt: prompt || null,
      responseText: response_text,
      embedding: pgVector,
    });

    return res.status(201).json({
      reflection_id: saved.id,
      tafsir_connection: tafsirResult.tafsirConnection,
      related_ayah: tafsirResult.relatedAyah,
      fallback: tafsirResult.fallback,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /reflections/threads — cluster reflections by semantic similarity
// ---------------------------------------------------------------------------
router.get('/threads', async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const [recentReflections, seenAyahs] = await Promise.all([
      getLastReflections(user_id, 10),
      getSeenAyahs(user_id),
    ]);

    let threads = [];
    let similarReflections = [];

    if (recentReflections.length > 0) {
      const latestText = recentReflections[0]?.response_text;
      if (latestText) {
        const anchor = await generateEmbedding(latestText);
        if (anchor) {
          const pgVector = formatForPgVector(anchor);
          similarReflections = await findSimilarReflections(user_id, pgVector);
        }
      }
    }

    const knownRefs = getKnownAyahRefs();
    const unseenRefs = knownRefs.filter((ref) => !seenAyahs.includes(ref));
    const nextAyah =
      unseenRefs.length > 0
        ? unseenRefs[Math.floor(Math.random() * unseenRefs.length)]
        : knownRefs[Math.floor(Math.random() * knownRefs.length)];

    threads = similarReflections.map((r) => ({
      reflection_id: r.id,
      ayah_ref: r.ayah_ref,
      snippet: r.response_text.slice(0, 100),
      distance: r.distance,
    }));

    const demoInsight = {
      message: 'Your reflections show a deepening journey. Keep going.',
      suggested_ayah: nextAyah,
    };

    return res.json({ threads, demo_insight: demoInsight, total: threads.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
