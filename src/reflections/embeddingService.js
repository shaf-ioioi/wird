'use strict';

const https = require('https');

const DIM = 1024;

async function generateEmbedding(text) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) return null;

  return new Promise((resolve) => {
    const body = JSON.stringify({ input: [text], model: 'voyage-3-lite' });
    const options = {
      hostname: 'api.voyageai.com',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const embedding = parsed?.data?.[0]?.embedding;
          resolve(Array.isArray(embedding) && embedding.length === DIM ? embedding : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function formatForPgVector(embedding) {
  if (!embedding) return null;
  return '[' + embedding.join(',') + ']';
}

module.exports = { generateEmbedding, formatForPgVector, DIM };
