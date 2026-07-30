import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, CallRecord } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { useCallRecords } from '../hooks/useCallRecords';
import { useSettings } from '../hooks/useSettings';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export function HomeScreen({ navigation }: Props) {
  const { calls, isLoading, refreshCalls, deleteCall } = useCallRecords();
  const { settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshCalls();
    }, [refreshCalls])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCalls();
    setRefreshing(false);
  }, [refreshCalls]);

  const handleDeleteCall = useCallback((call: CallRecord) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete this call recording?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCall(call.id),
        },
      ]
    );
  }, [deleteCall]);

  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      call.contactName?.toLowerCase().includes(q) ||
      call.phoneNumber?.includes(q) ||
      call.summary?.overview?.toLowerCase().includes(q) ||
      call.transcription?.text?.toLowerCase().includes(q)
    );
  });

  const groupedCalls = filteredCalls.reduce((acc, call) => {
    const date = formatDate(call.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(call);
    return acc;
  }, {} as Record<string, CallRecord[]>);

  const sections = Object.entries(groupedCalls).map(([title, data]) => ({ title, data }));

  const completedCount = calls.filter(c => c.status === 'completed').length;
  const resolvedCount = calls.filter(c => c.summary?.resolutionStatus === 'resolved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Call Recorder</Text>
          <Text style={styles.subtitle}>Customer Support Intelligence</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {calls.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calls.length}</Text>
            <Text style={styles.statLabel}>Total Calls</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Analyzed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      {calls.length === 0 && !isLoading ? (
        <EmptyState
          icon="mic-outline"
          title="No Recordings Yet"
          description={
            settings.autoRecord
              ? 'Phone calls will be recorded automatically when they connect. Tap the mic button to manually record meetings or notes.'
              : 'Start recording your customer support calls to get AI-powered transcriptions and summaries.'
          }
          actionLabel="Manual Recording"
          onAction={() => navigation.navigate('Recording', {})}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <CallCard
              call={item}
              onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
              onDelete={() => handleDeleteCall(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Recording', {})}
        activeOpacity={0.85}
      >
        <View style={styles.fabInner}>
          <Ionicons name="mic" size={26} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listContent: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  fabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
