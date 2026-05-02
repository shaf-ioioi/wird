import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { UserProgression, CardType } from '../types';
import { getProgression, isCardUnlocked } from '../services/progressionService';
import { completeWordGardenSession } from '../services/wordGardenService';
import { submitSessionCompletion } from '../services/api';
import { WordGardenCard } from '../components/cards/WordGardenCard';
import { RecitationCardPlaceholder } from '../components/cards/RecitationCardPlaceholder';

export const HomeScreen: React.FC = () => {
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProgression();
    }, [])
  );

  async function loadProgression() {
    const prog = await getProgression();
    setProgression(prog);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadProgression();
    setRefreshing(false);
  }

  async function handleWordGardenComplete() {
    try {
      const payload = await completeWordGardenSession();
      await submitSessionCompletion(payload);

      Alert.alert(
        'Word Planted!',
        'This word is now growing in your Word Garden. Keep collecting to see your garden bloom!',
        [{ text: 'Alhamdulillah', style: 'default' }]
      );

      await loadProgression();
    } catch (error) {
      Alert.alert('Something went wrong', 'Could not save your word. Please try again.');
    }
  }

  if (!progression) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your Wird...</Text>
      </View>
    );
  }

  const showWordGarden = isCardUnlocked(progression, 'word_garden');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f1c40f" />
      }
    >
      <View style={styles.streakSection}>
        <Text style={styles.streakNumber}>{progression.dayStreak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        {progression.dayStreak > 0 && progression.dayStreak < 7 && (
          <Text style={styles.streakHint}>
            {7 - progression.dayStreak} more day{7 - progression.dayStreak !== 1 ? 's' : ''} until Word Garden unlocks
          </Text>
        )}
      </View>

      <View style={styles.cardsSection}>
        <Text style={styles.sectionTitle}>Today's Wird</Text>

        <RecitationCardPlaceholder />

        {showWordGarden && (
          <WordGardenCard
            onComplete={handleWordGardenComplete}
            isActive={true}
          />
        )}

        {!showWordGarden && (
          <View style={styles.lockedCard}>
            <View style={styles.lockedOverlay}>
              <Text style={styles.lockedEmoji}>🔒</Text>
              <Text style={styles.lockedTitle}>Word Garden</Text>
              <Text style={styles.lockedSubtitle}>
                Unlocks at 7-day streak
              </Text>
              <Text style={styles.lockedProgress}>
                {progression.dayStreak}/7 days
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min((progression.dayStreak / 7) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b949e',
    fontSize: 16,
  },
  streakSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#f1c40f',
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  streakHint: {
    fontSize: 13,
    color: '#0f3460',
    marginTop: 8,
    backgroundColor: '#0f346015',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '500',
  },
  cardsSection: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f6fc',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  lockedCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  lockedOverlay: {
    padding: 24,
    alignItems: 'center',
    opacity: 0.7,
  },
  lockedEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0f6fc',
    marginBottom: 4,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: '#8b949e',
    marginBottom: 16,
  },
  lockedProgress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1c40f',
    marginBottom: 8,
  },
  progressBarBg: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#21262d',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#f1c40f',
  },
});
