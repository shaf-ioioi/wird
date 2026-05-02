'use strict';

/**
 * Integration-style route tests (mocked DB + Claude).
 */

jest.mock('../src/db/reflections', () => ({
  getLastReflections: jest.fn().mockResolvedValue([]),
  getSeenAyahs: jest.fn().mockResolvedValue([]),
  insertReflection: jest.fn().mockResolvedValue({ id: 'test-uuid', created_at: new Date().toISOString() }),
  findSimilarReflections: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/reflections/claudeService', () => ({
  generateReflectionPrompt: jest.fn().mockResolvedValue({
    prompt: 'How does this ayah speak to you personally right now?',
    cached: false,
    fallback: false,
  }),
  generateTafsirConnection: jest.fn().mockResolvedValue({
    tafsirConnection: 'This ayah invites deep reflection on divine mercy.',
    relatedAyah: '2:152',
    fallback: false,
  }),
}));

jest.mock('../src/reflections/embeddingService', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0.01)),
  formatForPgVector: jest.fn().mockReturnValue('[0.01,...]'),
  DIM: 1024,
}));

jest.mock('../src/reflections/quranMcpService', () => ({
  semanticSearch: jest.fn().mockResolvedValue([]),
  getAyahText: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/db/pool', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const request = require('supertest');
const app = require('../src/app');

describe('POST /reflections/prompt', () => {
  test('returns 400 if user_id missing', async () => {
    const res = await request(app)
      .post('/reflections/prompt')
      .send({ ayah_ref: '13:28' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if ayah_ref missing', async () => {
    const res = await request(app)
      .post('/reflections/prompt')
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid ayah_ref format', async () => {
    const res = await request(app)
      .post('/reflections/prompt')
      .send({ user_id: 'user-1', ayah_ref: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('returns prompt for valid cached ayah', async () => {
    const res = await request(app)
      .post('/reflections/prompt')
      .send({ user_id: 'user-1', ayah_ref: '13:28' });
    expect(res.status).toBe(200);
    expect(res.body.prompt).toBeDefined();
    expect(res.body.ayah_ref).toBe('13:28');
  });
});

describe('POST /reflections/submit', () => {
  test('returns 400 if response_text missing', async () => {
    const res = await request(app)
      .post('/reflections/submit')
      .send({ user_id: 'user-1', ayah_ref: '13:28', prompt: 'Test prompt' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if response_text too short', async () => {
    const res = await request(app)
      .post('/reflections/submit')
      .send({ user_id: 'user-1', ayah_ref: '13:28', prompt: 'Test', response_text: 'short' });
    expect(res.status).toBe(400);
  });

  test('creates reflection and returns tafsir connection', async () => {
    const res = await request(app)
      .post('/reflections/submit')
      .send({
        user_id: 'user-1',
        ayah_ref: '13:28',
        prompt: 'How does this ayah speak to you?',
        response_text: 'This ayah reminds me that peace is found only in remembrance of Allah, not in external circumstances.',
      });
    expect(res.status).toBe(201);
    expect(res.body.tafsir_connection).toBeDefined();
    expect(res.body.related_ayah).toBeDefined();
    expect(res.body.reflection_id).toBeDefined();
  });
});

describe('GET /reflections/threads', () => {
  test('returns 400 if user_id missing', async () => {
    const res = await request(app).get('/reflections/threads');
    expect(res.status).toBe(400);
  });

  test('returns demo insight for user with no embeddings', async () => {
    const res = await request(app).get('/reflections/threads?user_id=user-1');
    expect(res.status).toBe(200);
    expect(res.body.threads).toBeDefined();
    expect(Array.isArray(res.body.threads)).toBe(true);
    expect(res.body.demo_insight).toBeDefined();
  });
});

describe('GET /health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
