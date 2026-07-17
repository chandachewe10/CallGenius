import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallRecord } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, RESOLUTION_COLORS } from '../constants';
import { formatDuration, formatTime, getInitials, truncateText } from '../utils';

interface CallCardProps {
  call: CallRecord;
  onPress: () => void;
  onDelete?: () => void;
}

export function CallCard({ call, onPress, onDelete }: CallCardProps) {
  const displayName = call.contactName ?? call.phoneNumber ?? 'Unknown Caller';
  const initials = getInitials(displayName);
  const duration = call.duration ? formatDuration(call.duration) : '--:--';
  const time = formatTime(call.createdAt);

  const statusIcon = getStatusIcon(call.status);
  const directionIcon = call.direction === 'incoming' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';

  const resolutionColor = call.summary
    ? RESOLUTION_COLORS[call.summary.resolutionStatus] ?? COLORS.textTertiary
    : COLORS.textTertiary;

  const sentimentColor = call.summary
    ? getSentimentColor(call.summary.sentiment)
    : COLORS.textTertiary;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={[styles.directionBadge, { backgroundColor: call.direction === 'incoming' ? COLORS.accentLight : COLORS.primaryLight }]}>
          <Ionicons
            name={directionIcon as any}
            size={10}
            color={call.direction === 'incoming' ? COLORS.accent : COLORS.primary}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {truncateText(displayName, 22)}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
            <Text style={styles.metaText}>{duration}</Text>
          </View>
          {call.summary && (
            <>
              <View style={[styles.badge, { backgroundColor: resolutionColor + '20' }]}>
                <Text style={[styles.badgeText, { color: resolutionColor }]}>
                  {call.summary.resolutionStatus}
                </Text>
              </View>
              <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
            </>
          )}
        </View>

        {call.summary?.overview && (
          <Text style={styles.preview} numberOfLines={1}>
            {truncateText(call.summary.overview, 60)}
          </Text>
        )}

        {call.status === 'processing' && (
          <Text style={styles.processingText}>Processing...</Text>
        )}
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.statusDot, { backgroundColor: statusIcon.color }]} />
        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getStatusIcon(status: CallRecord['status']) {
  switch (status) {
    case 'recording':
      return { name: 'radio-button-on', color: COLORS.recording };
    case 'processing':
      return { name: 'hourglass-outline', color: COLORS.warning };
    case 'completed':
      return { name: 'checkmark-circle', color: COLORS.accent };
    case 'failed':
      return { name: 'alert-circle', color: COLORS.danger };
    default:
      return { name: 'help-circle', color: COLORS.textTertiary };
  }
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return COLORS.positive;
    case 'negative':
      return COLORS.negative;
    default:
      return COLORS.neutral;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  directionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.xs,
  },
  time: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sentimentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginLeft: 2,
  },
  preview: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  processingText: {
    fontSize: 12,
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 2,
  },
});
