import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WordGardenEntry, ThemeTag } from '../../types';
import { getThemeColor, getThemeEmoji } from '../../utils/themeHelper';

interface Props {
  entry: WordGardenEntry;
}

export const GardenFlower: React.FC<Props> = ({ entry }) => {
  const themeColor = getThemeColor(entry.theme);
  const themeEmoji = getThemeEmoji(entry.theme);

  return (
    <View style={[styles.container, { borderColor: themeColor + '40' }]}>
      <Text style={styles.flowerEmoji}>{themeEmoji}</Text>
      <Text style={styles.arabicWord}>{entry.arabic}</Text>
      <Text style={styles.transliteration}>{entry.transliteration}</Text>
      <View style={[styles.themeDot, { backgroundColor: themeColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    width: '47%',
    marginBottom: 12,
  },
  flowerEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  arabicWord: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f0f6fc',
    textAlign: 'center',
  },
  transliteration: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2,
    textAlign: 'center',
  },
  themeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
});
