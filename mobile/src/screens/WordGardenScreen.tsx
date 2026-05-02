import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WordGardenEntry, ThemeTag } from '../types';
import { getGardenEntries } from '../services/wordGardenService';
import { GardenFlower } from '../components/common/GardenFlower';
import { getThemeColor, getThemeEmoji } from '../utils/themeHelper';

const THEME_ORDER: ThemeTag[] = [
  'Mercy', 'Patience', 'Light', 'Faith', 'Guidance',
  'Gratitude', 'Forgiveness', 'Hope', 'Knowledge', 'Love',
  'Strength', 'Peace',
];

export const WordGardenScreen: React.FC = () => {
  const [entries, setEntries] = useState<WordGardenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeTag | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    setLoading(true);
    const gardenEntries = await getGardenEntries();
    setEntries(gardenEntries);
    setLoading(false);
  }

  const filteredEntries = selectedTheme
    ? entries.filter((e) => e.theme === selectedTheme)
    : entries;

  const groupedByTheme = THEME_ORDER.map((theme) => ({
    theme,
    entries: entries.filter((e) => e.theme === theme),
  })).filter((g) => g.entries.length > 0);

  function renderFlower({ item }: { item: WordGardenEntry }) {
    return <GardenFlower entry={item} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#f1c40f" size="large" />
        <Text style={styles.loadingText}>Growing your garden...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Word Garden</Text>
        <Text style={styles.subtitle}>
          {entries.length} {entries.length === 1 ? 'word' : 'words'} collected
        </Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>Your garden is waiting</Text>
          <Text style={styles.emptySubtitle}>
            Complete daily Word Garden sessions to plant words and watch your garden grow
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedTheme && styles.filterChipActive]}
              onPress={() => setSelectedTheme(null)}
            >
              <Text style={[styles.filterText, !selectedTheme && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {groupedByTheme.map(({ theme }) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.filterChip,
                  selectedTheme === theme && { backgroundColor: getThemeColor(theme) + '20', borderColor: getThemeColor(theme) },
                ]}
                onPress={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
              >
                <Text style={styles.filterEmoji}>{getThemeEmoji(theme)}</Text>
                <Text
                  style={[
                    styles.filterText,
                    selectedTheme === theme && { color: getThemeColor(theme) },
                  ]}
                >
                  {theme}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredEntries}
            renderItem={renderFlower}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {groupedByTheme.length > 0 && (
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Growth by Theme</Text>
          <View style={styles.statsRow}>
            {groupedByTheme.map(({ theme, entries: themeEntries }) => (
              <View key={theme} style={styles.statItem}>
                <Text style={styles.statEmoji}>{getThemeEmoji(theme)}</Text>
                <Text style={styles.statCount}>{themeEntries.length}</Text>
                <Text style={[styles.statTheme, { color: getThemeColor(theme) }]}>{theme}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b949e',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0f6fc',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 22,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  filterChipActive: {
    backgroundColor: '#f1c40f20',
    borderColor: '#f1c40f',
  },
  filterEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b949e',
  },
  filterTextActive: {
    color: '#f1c40f',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  statsSection: {
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    padding: 20,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#0d1117',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
  },
  statEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  statTheme: {
    fontSize: 10,
    fontWeight: '600',
  },
});
