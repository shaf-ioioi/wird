import { SEED_WORDS } from '../data/seedWords';
import { SeedWord } from '../types';

export function getDailyWord(dayOffset: number = 0): SeedWord {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + dayOffset);

  const daysSinceEpoch = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));
  const wordIndex = daysSinceEpoch % SEED_WORDS.length;

  return SEED_WORDS[wordIndex];
}

export function getWordById(id: string): SeedWord | undefined {
  return SEED_WORDS.find((w) => w.id === id);
}

export function getAllWords(): SeedWord[] {
  return SEED_WORDS;
}
