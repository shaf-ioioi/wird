export type CardType = 'recitation' | 'word_garden' | 'reflection';

export type ThemeTag =
  | 'Mercy'
  | 'Patience'
  | 'Light'
  | 'Faith'
  | 'Guidance'
  | 'Gratitude'
  | 'Forgiveness'
  | 'Hope'
  | 'Knowledge'
  | 'Love'
  | 'Strength'
  | 'Peace';

export interface SeedWord {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  rootLetters: string;
  theme: ThemeTag;
  exampleAyah: {
    surahNumber: number;
    ayahNumber: number;
    arabic: string;
    translation: string;
  };
}

export interface WordGardenEntry {
  id: string;
  userId: string;
  seedWordId: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  theme: ThemeTag;
  exampleAyah: {
    surahNumber: number;
    ayahNumber: number;
    arabic: string;
    translation: string;
  };
  collectedAt: string;
  masteryLevel: number;
  nextReviewDate: string | null;
}

export interface UserProgression {
  userId: string;
  dayStreak: number;
  unlockedCards: CardType[];
  totalSessions: number;
  unlockThresholds: Record<string, number>;
}

export interface SessionCompletePayload {
  userId: string;
  sessionDate: string;
  completedCards: CardType[];
  wordGardenEntry?: {
    seedWordId: string;
  };
}

export interface DailyWord {
  seedWord: SeedWord;
  isCompleted: boolean;
  collectedAt: string | null;
}

export type NavigationParamList = {
  Home: undefined;
  WordGarden: undefined;
  Recitation: undefined;
};
