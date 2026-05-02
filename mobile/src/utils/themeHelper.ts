import { ThemeTag } from '../types';

export function getThemeColor(theme: ThemeTag): string {
  const map: Record<ThemeTag, string> = {
    Mercy: '#e74c3c',
    Patience: '#3498db',
    Light: '#f39c12',
    Faith: '#9b59b6',
    Guidance: '#1abc9c',
    Gratitude: '#e67e22',
    Forgiveness: '#2ecc71',
    Hope: '#f1c40f',
    Knowledge: '#3498db',
    Love: '#e91e63',
    Strength: '#e74c3c',
    Peace: '#00bcd4',
  };
  return map[theme] || '#8b949e';
}

export function getThemeEmoji(theme: ThemeTag): string {
  const map: Record<ThemeTag, string> = {
    Mercy: '🌸',
    Patience: '🌊',
    Light: '✨',
    Faith: '💎',
    Guidance: '🧭',
    Gratitude: '🙏',
    Forgiveness: '🌿',
    Hope: '🌅',
    Knowledge: '📖',
    Love: '❤️',
    Strength: '🏔️',
    Peace: '🕊️',
  };
  return map[theme] || '🌱';
}
