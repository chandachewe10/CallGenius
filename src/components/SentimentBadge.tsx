import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SentimentType } from '../types';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants';

interface SentimentBadgeProps {
  sentiment: SentimentType;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SENTIMENT_CONFIG = {
  positive: {
    icon: 'happy-outline' as const,
    color: COLORS.positive,
    bg: COLORS.accentLight,
    label: 'Positive',
  },
  neutral: {
    icon: 'remove-outline' as const,
    color: COLORS.warning,
    bg: COLORS.warningLight,
    label: 'Neutral',
  },
  negative: {
    icon: 'sad-outline' as const,
    color: COLORS.negative,
    bg: COLORS.dangerLight,
    label: 'Negative',
  },
};

export function SentimentBadge({ sentiment, score, size = 'md' }: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[sentiment];
  const isLarge = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[styles.container, { backgroundColor: config.bg }, isSm && styles.containerSm]}>
      <Ionicons name={config.icon} size={isLarge ? 18 : isSm ? 12 : 14} color={config.color} />
      <Text style={[styles.label, { color: config.color }, isLarge && styles.labelLg, isSm && styles.labelSm]}>
        {config.label}
      </Text>
      {score !== undefined && !isSm && (
        <Text style={[styles.score, { color: config.color }]}>
          {Math.round(score * 100)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  containerSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelLg: {
    fontSize: 15,
  },
  labelSm: {
    fontSize: 11,
  },
  score: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
});
