'use strict';

const path = require('path');
const CACHE = require(path.join(__dirname, '../../data/tafsir_cache.json'));

const index = {};
for (const entry of CACHE) {
  index[entry.ayah_ref] = entry;
}

function getTafsir(ayahRef) {
  return index[ayahRef] || null;
}

function buildAyahText(entry) {
  if (!entry) return null;
  return `${entry.arabic}\n\n${entry.translation}`;
}

function getKnownAyahRefs() {
  return Object.keys(index);
}

module.exports = { getTafsir, buildAyahText, getKnownAyahRefs };
