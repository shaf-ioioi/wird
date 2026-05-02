import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SeedWord } from '../../types';
import { getDailyWord } from '../../services/wordService';
import { isTodayWordCompleted } from '../../services/wordGardenService';
import { getThemeColor, getThemeEmoji } from '../../utils/themeHelper';

interface Props {
  onComplete: () => void;
  isActive: boolean;
}

export const WordGardenCard: React.FC<Props> = ({ onComplete, isActive }) => {
  const [dailyWord, setDailyWord] = useState<SeedWord | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAyah, setShowAyah] = useState(false);
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadDailyWord();
  }, []);

  async function loadDailyWord() {
    const word = getDailyWord();
    setDailyWord(word);
    const completed = await isTodayWordCompleted();
    setIsCompleted(completed);
  }

  useEffect(() => {
    if (isCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isCompleted]);

  if (!dailyWord) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#f1c40f" />
      </View>
    );
  }

  const themeColor = getThemeColor(dailyWord.theme);
  const themeEmoji = getThemeEmoji(dailyWord.theme);

  const glowInterpolate = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(241, 196, 15, 0)', 'rgba(241, 196, 15, 0.3)'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        isCompleted && { shadowColor: '#f1c40f', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
        isCompleted && { backgroundColor: glowInterpolate },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.themeBadge, { backgroundColor: themeColor + '20' }]}>
          <Text style={styles.themeEmoji}>{themeEmoji}</Text>
          <Text style={[styles.themeText, { color: themeColor }]}>{dailyWord.theme}</Text>
        </View>

        <Text style={styles.cardLabel}>Word Garden</Text>

        <View style={styles.wordSection}>
          <Text style={styles.arabicWord}>{dailyWord.arabic}</Text>
          <Text style={styles.transliteration}>{dailyWord.transliteration}</Text>
          <Text style={styles.rootLetters}>Root: {dailyWord.rootLetters}</Text>
        </View>

        <View style={styles.meaningSection}>
          <Text style={styles.meaningLabel}>Meaning</Text>
          <Text style={styles.meaningText}>{dailyWord.meaning}</Text>
        </View>

        {!showAyah ? (
          <TouchableOpacity
            style={styles.showAyahButton}
            onPress={() => setShowAyah(true)}
          >
            <Text style={styles.showAyahButtonText}>Reveal Example Ayah</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ayahSection}>
            <Text style={styles.ayahReference}>
              {dailyWord.exampleAyah.surahNumber}:{dailyWord.exampleAyah.ayahNumber}
            </Text>
            <Text style={styles.ayahArabic}>{dailyWord.exampleAyah.arabic}</Text>
            <Text style={styles.ayahTranslation}>{dailyWord.exampleAyah.translation}</Text>
          </View>
        )}

        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedEmoji}>🌱</Text>
            <Text style={styles.completedText}>Word planted in your garden!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: themeColor }]}
            onPress={onComplete}
          >
            <Text style={styles.completeButtonText}>Plant in My Garden</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  themeEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  wordSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  arabicWord: {
    fontSize: 40,
    fontWeight: '600',
    color: '#f0f6fc',
    lineHeight: 56,
    textAlign: 'center',
  },
  transliteration: {
    fontSize: 18,
    fontWeight: '500',
    color: '#f1c40f',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rootLetters: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 4,
    fontWeight: '500',
  },
  meaningSection: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  meaningLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  meaningText: {
    fontSize: 15,
    color: '#f0f6fc',
    lineHeight: 22,
  },
  showAyahButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  showAyahButtonText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '500',
  },
  ayahSection: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  ayahReference: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b949e',
    marginBottom: 8,
  },
  ayahArabic: {
    fontSize: 20,
    color: '#f0f6fc',
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  ayahTranslation: {
    fontSize: 14,
    color: '#8b949e',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2ecc7115',
    borderWidth: 1,
    borderColor: '#2ecc7130',
  },
  completedEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  completedText: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: '600',
  },
});
