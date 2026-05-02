'use strict';

const { getTafsir, buildAyahText, getKnownAyahRefs } = require('../src/reflections/tafsirService');

describe('TafsirService', () => {
  test('loads cache and finds known ayah', () => {
    const entry = getTafsir('1:1');
    expect(entry).not.toBeNull();
    expect(entry.arabic).toBeDefined();
    expect(entry.translation).toBeDefined();
    expect(entry.tafsir_summary).toBeDefined();
    expect(Array.isArray(entry.themes)).toBe(true);
    expect(Array.isArray(entry.related_ayahs)).toBe(true);
  });

  test('returns null for unknown ayah', () => {
    const entry = getTafsir('999:999');
    expect(entry).toBeNull();
  });

  test('buildAyahText returns formatted text', () => {
    const entry = getTafsir('13:28');
    const text = buildAyahText(entry);
    expect(text).toContain('أَلَا');
    expect(text).toContain('hearts');
  });

  test('buildAyahText returns null for null input', () => {
    expect(buildAyahText(null)).toBeNull();
  });

  test('getKnownAyahRefs returns multiple refs', () => {
    const refs = getKnownAyahRefs();
    expect(refs.length).toBeGreaterThan(5);
    expect(refs).toContain('1:1');
    expect(refs).toContain('13:28');
    expect(refs).toContain('94:5');
  });
});
