'use strict';

const https = require('https');
const http = require('http');

const BASE_URL = process.env.QURAN_MCP_BASE_URL || '';

function request(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method: 'GET', ...options }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function semanticSearch(query, { limit = 5, excludeRef = null } = {}) {
  if (!BASE_URL) return [];
  try {
    const url = new URL('/search', BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit + (excludeRef ? 1 : 0)));
    const data = await request(url.toString());
    const results = data?.results ?? data ?? [];
    return results
      .filter((r) => r.ayah_ref !== excludeRef)
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function getAyahText(ayahRef) {
  if (!BASE_URL) return null;
  try {
    const url = new URL(`/ayah/${ayahRef}`, BASE_URL);
    const data = await request(url.toString());
    return data?.text ?? null;
  } catch {
    return null;
  }
}

module.exports = { semanticSearch, getAyahText };
