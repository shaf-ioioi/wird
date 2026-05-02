'use strict';

const { formatForPgVector, DIM } = require('../src/reflections/embeddingService');

describe('EmbeddingService', () => {
  test('formatForPgVector returns correct format', () => {
    const embedding = new Array(DIM).fill(0.1);
    const result = formatForPgVector(embedding);
    expect(result).toMatch(/^\[.*\]$/);
    expect(result.split(',').length).toBe(DIM);
  });

  test('formatForPgVector returns null for null input', () => {
    expect(formatForPgVector(null)).toBeNull();
    expect(formatForPgVector(undefined)).toBeNull();
  });

  test('DIM is 1024', () => {
    expect(DIM).toBe(1024);
  });
});
