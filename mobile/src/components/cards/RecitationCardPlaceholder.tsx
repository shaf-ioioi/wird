import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const RecitationCardPlaceholder: React.FC = () => {

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily Recitation</Text>
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderArabic}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
          <Text style={styles.placeholderSubtext}>
            Complete your daily recitation to grow your streak
          </Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => {}}
        >
          <Text style={styles.completeButtonText}>Complete Recitation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderArabic: {
    fontSize: 24,
    color: '#f0f6fc',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#8b949e',
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '700',
  },
});
