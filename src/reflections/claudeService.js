'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 15_000;

const SYSTEM_PERSONA =
  'You are a Quran reflection companion. Your role is to help Muslims deepen their ' +
  'connection with the Quran through thoughtful, personalised reflection prompts and ' +
  'insights rooted in classical tafsir. Be warm, spiritually grounded, and concise. ' +
  'Do not issue rulings (fatwas). Respond in the language the user writes in.';

function buildAyahContext(ayahRef, ayahText, tafsirSummary) {
  let ctx = `## Ayah: ${ayahRef}\n\n${ayahText}`;
  if (tafsirSummary) {
    ctx += `\n\n## Classical Tafsir Summary\n${tafsirSummary}`;
  }
  return ctx;
}

function buildPersonalisationSuffix(recentReflections) {
  if (!recentReflections || recentReflections.length === 0) return '';
  const snippets = recentReflections
    .map((r, i) => `${i + 1}. "${r.response_text.slice(0, 120)}"`)
    .join('\n');
  return `\n\n## Recent reflections from this person\n${snippets}`;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TimeoutError')), ms)
    ),
  ]);
}

async function generateReflectionPrompt({ ayahRef, ayahText, tafsirSummary, recentReflections = [] }) {
  const client = new Anthropic();
  const cachedContext = buildAyahContext(ayahRef, ayahText, tafsirSummary);
  const suffix = buildPersonalisationSuffix(recentReflections);

  const systemBlocks = [
    { type: 'text', text: SYSTEM_PERSONA },
    { type: 'text', text: cachedContext, cache_control: { type: 'ephemeral' } },
  ];

  const userContent = `Generate a single, open-ended reflection prompt for this ayah.${suffix}\n\nReturn only the prompt text — no preamble, no numbering.`;

  try {
    const response = await withTimeout(
      client.messages.create({
        model: MODEL,
        max_tokens: 150,
        system: systemBlocks,
        messages: [{ role: 'user', content: userContent }],
        betas: ['prompt-caching-2024-07-31'],
      }),
      TIMEOUT_MS
    );
    const prompt = response.content[0]?.text?.trim();
    const cached = (response.usage?.cache_read_input_tokens ?? 0) > 0;
    return { prompt, cached, fallback: false };
  } catch {
    return {
      prompt: 'How does this ayah speak to your heart in this moment of your life?',
      cached: false,
      fallback: true,
    };
  }
}

async function generateTafsirConnection({ ayahRef, ayahText, tafsirSummary, responseText, relatedAyahs = [] }) {
  const client = new Anthropic();
  const cachedContext = buildAyahContext(ayahRef, ayahText, tafsirSummary);

  const systemBlocks = [
    { type: 'text', text: SYSTEM_PERSONA },
    { type: 'text', text: cachedContext, cache_control: { type: 'ephemeral' } },
  ];

  const relatedHint =
    relatedAyahs.length > 0
      ? `\n\nRelated ayahs to consider: ${relatedAyahs.join(', ')}`
      : '';

  const userContent =
    `The person wrote this reflection:\n"${responseText}"\n\n` +
    `Write 2–3 sentences connecting their reflection to classical tafsir insights on this ayah.${relatedHint}\n` +
    `Also suggest one related ayah reference (surah:ayah format). ` +
    `Return JSON: { "tafsir_connection": "...", "related_ayah": "X:Y" }`;

  try {
    const response = await withTimeout(
      client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: systemBlocks,
        messages: [{ role: 'user', content: userContent }],
        betas: ['prompt-caching-2024-07-31'],
      }),
      TIMEOUT_MS
    );
    const raw = response.content[0]?.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tafsirConnection: parsed.tafsir_connection || raw,
        relatedAyah: parsed.related_ayah || null,
        fallback: false,
      };
    }
    return { tafsirConnection: raw, relatedAyah: null, fallback: false };
  } catch {
    return {
      tafsirConnection: 'This ayah invites us to reflect on our relationship with Allah and the wisdom embedded in divine guidance.',
      relatedAyah: null,
      fallback: true,
    };
  }
}

module.exports = { generateReflectionPrompt, generateTafsirConnection };
