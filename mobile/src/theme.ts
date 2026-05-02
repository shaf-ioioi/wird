export const Colors = {
  primary: '#1a1a2e',
  primaryLight: '#16213e',
  secondary: '#0f3460',
  accent: '#e94560',
  accentGreen: '#2ecc71',
  accentGold: '#f1c40f',

  background: '#0d1117',
  backgroundCard: '#161b22',
  backgroundElevated: '#21262d',

  text: '#f0f6fc',
  textSecondary: '#8b949e',
  textMuted: '#484f58',

  border: '#30363d',

  themeMercy: '#e74c3c',
  themePatience: '#3498db',
  themeLight: '#f39c12',
  themeFaith: '#9b59b6',
  themeGuidance: '#1abc9c',
  themeGratitude: '#e67e22',
  themeForgiveness: '#2ecc71',
  themeHope: '#f1c40f',
  themeKnowledge: '#3498db',
  themeLove: '#e91e63',
  themeStrength: '#e74c3c',
  themePeace: '#00bcd4',
};

export const Typography = {
  headingLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  headingMedium: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  headingSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  arabicLarge: {
    fontSize: 36,
    fontWeight: '600' as const,
    lineHeight: 52,
  },
  arabicMedium: {
    fontSize: 24,
    fontWeight: '500' as const,
    lineHeight: 36,
  },
  arabicAyah: {
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 32,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const THEME_COLORS: Record<string, string> = {
  Mercy: Colors.themeMercy,
  Patience: Colors.themePatience,
  Light: Colors.themeLight,
  Faith: Colors.themeFaith,
  Guidance: Colors.themeGuidance,
  Gratitude: Colors.themeGratitude,
  Forgiveness: Colors.themeForgiveness,
  Hope: Colors.themeHope,
  Knowledge: Colors.themeKnowledge,
  Love: Colors.themeLove,
  Strength: Colors.themeStrength,
  Peace: Colors.themePeace,
};
