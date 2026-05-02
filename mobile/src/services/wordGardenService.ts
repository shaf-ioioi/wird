import AsyncStorage from '@react-native-async-storage/async-storage';
import { WordGardenEntry, SessionCompletePayload } from '../types';
import { getDailyWord } from './wordService';
import { recordSession } from './progressionService';

const GARDEN_ENTRIES_KEY = 'wird_word_garden_entries';
const TODAY_WORD_KEY = 'wird_today_word_completed';

export async function getGardenEntries(): Promise<WordGardenEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(GARDEN_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveGardenEntries(entries: WordGardenEntry[]): Promise<void> {
  await AsyncStorage.setItem(GARDEN_ENTRIES_KEY, JSON.stringify(entries));
}

export async function isTodayWordCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TODAY_WORD_KEY);
    const today = new Date().toISOString().split('T')[0];
    return val === today;
  } catch {
    return false;
  }
}

async function markTodayWordCompleted(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await AsyncStorage.setItem(TODAY_WORD_KEY, today);
}

export async function collectDailyWord(): Promise<WordGardenEntry> {
  const seedWord = getDailyWord();
  const alreadyCompleted = await isTodayWordCompleted();

  if (alreadyCompleted) {
    const entries = await getGardenEntries();
    const existing = entries.find((e) => e.seedWordId === seedWord.id);
    if (existing) return existing;
  }

  const entry: WordGardenEntry = {
    id: `wge_${Date.now()}`,
    userId: 'local_user',
    seedWordId: seedWord.id,
    arabic: seedWord.arabic,
    transliteration: seedWord.transliteration,
    meaning: seedWord.meaning,
    theme: seedWord.theme,
    exampleAyah: seedWord.exampleAyah,
    collectedAt: new Date().toISOString(),
    masteryLevel: 0,
    nextReviewDate: null,
  };

  const entries = await getGardenEntries();
  const exists = entries.find((e) => e.seedWordId === seedWord.id);
  if (!exists) {
    entries.push(entry);
    await saveGardenEntries(entries);
  }

  await markTodayWordCompleted();
  return entry;
}

export async function completeWordGardenSession(): Promise<SessionCompletePayload> {
  const entry = await collectDailyWord();
  await recordSession();

  const payload: SessionCompletePayload = {
    userId: 'local_user',
    sessionDate: new Date().toISOString().split('T')[0],
    completedCards: ['word_garden'],
    wordGardenEntry: {
      seedWordId: entry.seedWordId,
    },
  };

  return payload;
}
