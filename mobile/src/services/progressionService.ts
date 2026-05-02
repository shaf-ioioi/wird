import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgression, CardType } from '../types';

const PROGRESSION_KEY = 'wird_user_progression';
const DEFAULT_UNLOCK_THRESHOLDS: Record<string, number> = {
  recitation: 0,
  word_garden: 7,
  reflection: 14,
};

const DEFAULT_PROGRESSION: UserProgression = {
  userId: 'local_user',
  dayStreak: 0,
  unlockedCards: ['recitation'],
  totalSessions: 0,
  unlockThresholds: DEFAULT_UNLOCK_THRESHOLDS,
};

export async function getProgression(): Promise<UserProgression> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return DEFAULT_PROGRESSION;
  } catch {
    return DEFAULT_PROGRESSION;
  }
}

export async function setProgression(progression: UserProgression): Promise<void> {
  await AsyncStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
}

export async function recordSession(): Promise<UserProgression> {
  const progression = await getProgression();
  const today = new Date().toISOString().split('T')[0];

  const lastSessionDate = await getLastSessionDate();
  if (lastSessionDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastSessionDate === yesterdayStr) {
      progression.dayStreak += 1;
    } else {
      progression.dayStreak = 1;
    }
  }

  progression.totalSessions += 1;
  progression.unlockedCards = recalculateUnlocks(progression.dayStreak, progression.unlockThresholds);

  await AsyncStorage.setItem('wird_last_session_date', today);
  await setProgression(progression);

  return progression;
}

export async function getLastSessionDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('wird_last_session_date');
  } catch {
    return null;
  }
}

function recalculateUnlocks(dayStreak: number, thresholds: Record<string, number>): CardType[] {
  const unlocked: CardType[] = [];
  for (const [card, threshold] of Object.entries(thresholds)) {
    if (dayStreak >= threshold) {
      unlocked.push(card as CardType);
    }
  }
  return unlocked;
}

export function isCardUnlocked(progression: UserProgression, cardType: CardType): boolean {
  const threshold = progression.unlockThresholds[cardType] ?? Infinity;
  return progression.dayStreak >= threshold;
}

export async function fastForwardDays(days: number): Promise<UserProgression> {
  const progression = await getProgression();
  progression.dayStreak += days;
  progression.unlockedCards = recalculateUnlocks(progression.dayStreak, progression.unlockThresholds);
  await setProgression(progression);
  return progression;
}
