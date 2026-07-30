import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, CallRecord } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, RESOLUTION_COLORS, RESOLUTION_LABELS } from '../constants';
import { useCallRecords } from '../hooks/useCallRecords';
import { useSettings } from '../hooks/useSettings';
import { SentimentBadge } from '../components/SentimentBadge';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { transcriptionService } from '../services/transcriptionService';
import { summaryService } from '../services/summaryService';
import { storageService } from '../services/storageService';
import { formatDuration, formatTimestamp, formatTime } from '../utils';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CallDetail'>;
  route: RouteProp<RootStackParamList, 'CallDetail'>;
};

type ActiveTab = 'summary' | 'transcript' | 'details';

export function CallDetailScreen({ navigation, route }: Props) {
  const { callId } = route.params;
  const { getCall, updateCall, deleteCall } = useCallRecords();
  const { settings } = useSettings();

  const [call, setCall] = useState<CallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingSubMessage, setProcessingSubMessage] = useState('');

  useEffect(() => {
    const found = getCall(callId);
    if (found) setCall(found);
  }, [callId, getCall]);

  const handleReprocess = useCallback(async () => {
    if (!call?.audioUri) {
      Alert.alert('No Audio', 'No audio file found for this recording.');
      return;
    }
    if (!settings.openaiApiKey) {
      Alert.alert('API Key Required', 'Please add your OpenAI API key in Settings.');
      return;
    }

    Alert.alert('Reprocess Recording', 'This will re-transcribe and re-summarize the call. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: async () => {
          setIsProcessing(true);
          try {
            setProcessingMessage('Transcribing Audio');
            setProcessingSubMessage('Using OpenAI Whisper...');
            const transcription = await transcriptionService.transcribeAudio(
              call.audioUri!,
              settings.openaiApiKey,
              settings.whisperModel,
              settings.language
            );

            setProcessingMessage('Generating Summary');
            setProcessingSubMessage('Analyzing with GPT...');
            const summary = await summaryService.generateSummary(
              transcription,
              settings.openaiApiKey,
              settings.gptModel,
              undefined,
              settings.useCase
            );

            const updated: CallRecord = {
              ...call,
              transcription,
              summary,
              status: 'completed',
            };
            await storageService.saveCall(updated);
            await updateCall(updated);
            setCall(updated);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Processing failed');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  }, [call, settings, updateCall]);

  const handleShare = useCallback(async () => {
    if (!call) return;
    const content = buildShareContent(call);
    await Share.share({ message: content, title: 'Call Summary' });
  }, [call]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Recording', 'This will permanently delete this recording.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCall(callId);
          navigation.goBack();
        },
      },
    ]);
  }, [callId, deleteCall, navigation]);

  if (!call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Call not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = call.contactName ?? call.phoneNumber ?? 'Unknown Caller';
  const initials = displayName.charAt(0).toUpperCase();
  const resolutionColor = call.summary
    ? RESOLUTION_COLORS[call.summary.resolutionStatus]
    : COLORS.textTertiary;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LoadingOverlay
        visible={isProcessing}
        message={processingMessage}
        subMessage={processingSubMessage}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.callHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callerName}>{displayName}</Text>
          <View style={styles.callMeta}>
            <Ionicons
              name={call.direction === 'incoming' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.callMetaText}>
              {call.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
            </Text>
            <Text style={styles.callMetaSeparator}>•</Text>
            <Text style={styles.callMetaText}>{formatTimestamp(call.createdAt)}</Text>
          </View>
          {call.duration !== undefined && (
            <Text style={styles.duration}>{formatDuration(call.duration)}</Text>
          )}
        </View>
        {call.summary && (
          <SentimentBadge sentiment={call.summary.sentiment} score={call.summary.sentimentScore} />
        )}
      </View>

      {call.summary && (
        <View style={styles.resolutionBanner}>
          <View style={[styles.resolutionDot, { backgroundColor: resolutionColor }]} />
          <Text style={[styles.resolutionText, { color: resolutionColor }]}>
            {RESOLUTION_LABELS[call.summary.resolutionStatus]}
          </Text>
          {call.summary.tags.slice(0, 3).map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tabBar}>
        {(['summary', 'transcript', 'details'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'summary' && <SummaryTab call={call} onReprocess={handleReprocess} />}
        {activeTab === 'transcript' && <TranscriptTab call={call} onReprocess={handleReprocess} />}
        {activeTab === 'details' && <DetailsTab call={call} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTab({ call, onReprocess }: { call: CallRecord; onReprocess: () => void }) {
  if (!call.summary) {
    return (
      <View style={styles.emptyTab}>
        {call.status === 'failed' && (
          <>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
            <Text style={styles.emptyTitle}>Processing Failed</Text>
            <Text style={styles.emptyDesc}>The AI analysis could not be completed.</Text>
          </>
        )}
        {call.status !== 'failed' && (
          <>
            <Ionicons name="hourglass-outline" size={48} color={COLORS.warning} />
            <Text style={styles.emptyTitle}>No Summary Yet</Text>
            <Text style={styles.emptyDesc}>
              {call.audioUri ? 'Tap below to generate a summary.' : 'No audio recording available.'}
            </Text>
          </>
        )}
        {call.audioUri && (
          <TouchableOpacity style={styles.reprocessButton} onPress={onReprocess}>
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.reprocessButtonText}>Analyze Call</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const { summary } = call;

  return (
    <View style={styles.tabContent}>
      <SummaryCard title="Overview" icon="document-text-outline">
        <Text style={styles.overviewText}>{summary.overview}</Text>
      </SummaryCard>

      <SummaryCard title="Customer Issue" icon="alert-circle-outline" accentColor={COLORS.warning}>
        <Text style={styles.bodyText}>{summary.customerIssue}</Text>
      </SummaryCard>

      {summary.keyPoints.length > 0 && (
        <SummaryCard title="Key Points" icon="list-outline" accentColor={COLORS.primary}>
          {summary.keyPoints.map((point, i) => (
            <View key={i} style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </SummaryCard>
      )}

      {summary.actionItems.length > 0 && (
        <SummaryCard title="Action Items" icon="checkmark-circle-outline" accentColor={COLORS.accent}>
          {summary.actionItems.map((item, i) => (
            <View key={i} style={styles.actionItem}>
              <Ionicons name="checkbox-outline" size={16} color={COLORS.accent} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </SummaryCard>
      )}

      {summary.customerSatisfaction && (
        <SummaryCard title="Customer Satisfaction" icon="happy-outline" accentColor={COLORS.secondary}>
          <Text style={styles.bodyText}>{summary.customerSatisfaction}</Text>
        </SummaryCard>
      )}

      {summary.agentPerformance && (
        <SummaryCard title="Agent Performance" icon="person-outline">
          <Text style={styles.bodyText}>{summary.agentPerformance}</Text>
        </SummaryCard>
      )}

      <TouchableOpacity style={styles.reprocessButtonSecondary} onPress={onReprocess}>
        <Ionicons name="refresh" size={16} color={COLORS.primary} />
        <Text style={styles.reprocessButtonSecondaryText}>Re-analyze</Text>
      </TouchableOpacity>
    </View>
  );
}

function SummaryCard({
  title,
  icon,
  accentColor = COLORS.text,
  children,
}: {
  title: string;
  icon: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: accentColor + '15' }]}>
          <Ionicons name={icon as any} size={16} color={accentColor} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function TranscriptTab({ call, onReprocess }: { call: CallRecord; onReprocess: () => void }) {
  if (!call.transcription) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="mic-off-outline" size={48} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>No Transcription</Text>
        <Text style={styles.emptyDesc}>
          {call.audioUri
            ? 'Tap below to transcribe this recording.'
            : 'No audio file available to transcribe.'}
        </Text>
        {call.audioUri && (
          <TouchableOpacity style={styles.reprocessButton} onPress={onReprocess}>
            <Ionicons name="mic-outline" size={16} color={COLORS.white} />
            <Text style={styles.reprocessButtonText}>Transcribe</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const { transcription } = call;

  return (
    <View style={styles.tabContent}>
      {transcription.language && (
        <View style={styles.transcriptMeta}>
          <Ionicons name="globe-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.transcriptMetaText}>
            Language: {transcription.language.toUpperCase()}
          </Text>
          {transcription.duration && (
            <>
              <Text style={styles.transcriptMetaSep}>•</Text>
              <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.transcriptMetaText}>
                {formatDuration(Math.floor(transcription.duration))}
              </Text>
            </>
          )}
        </View>
      )}

      {transcription.segments && transcription.segments.length > 0 ? (
        <View style={styles.segmentsContainer}>
          {transcription.segments.map(seg => (
            <View key={seg.id} style={styles.segment}>
              <Text style={styles.segmentTimestamp}>
                [{formatTime(seg.start * 1000)}]
              </Text>
              <Text style={styles.segmentText}>{seg.text}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.transcriptFullText}>{transcription.text}</Text>
        </View>
      )}
    </View>
  );
}

function DetailsTab({ call }: { call: CallRecord }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <DetailRow icon="call-outline" label="Phone Number" value={call.phoneNumber ?? 'N/A'} />
        <DetailRow icon="person-outline" label="Contact Name" value={call.contactName ?? 'N/A'} />
        <DetailRow
          icon={call.direction === 'incoming' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
          label="Direction"
          value={call.direction.charAt(0).toUpperCase() + call.direction.slice(1)}
        />
        <DetailRow
          icon="time-outline"
          label="Duration"
          value={call.duration !== undefined ? formatDuration(call.duration) : 'N/A'}
        />
        <DetailRow
          icon="calendar-outline"
          label="Date & Time"
          value={formatTimestamp(call.createdAt)}
        />
        <DetailRow
          icon="checkmark-circle-outline"
          label="Status"
          value={call.status.charAt(0).toUpperCase() + call.status.slice(1)}
          isLast
        />
      </View>

      {call.audioUri && (
        <View style={styles.card}>
          <Text style={styles.detailSectionTitle}>Audio File</Text>
          <Text style={styles.audioPath} numberOfLines={2}>
            {call.audioUri}
          </Text>
        </View>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={styles.detailRowLeft}>
        <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function buildShareContent(call: CallRecord): string {
  const lines = [
    `📞 Call Summary`,
    `Date: ${formatTimestamp(call.createdAt)}`,
    `Contact: ${call.contactName ?? call.phoneNumber ?? 'Unknown'}`,
    `Duration: ${call.duration ? formatDuration(call.duration) : 'N/A'}`,
    '',
  ];

  if (call.summary) {
    lines.push(`📋 Overview: ${call.summary.overview}`, '');
    lines.push(`❓ Customer Issue: ${call.summary.customerIssue}`, '');
    lines.push(`✅ Resolution: ${call.summary.resolutionStatus.toUpperCase()}`, '');

    if (call.summary.keyPoints.length > 0) {
      lines.push('📌 Key Points:');
      call.summary.keyPoints.forEach(p => lines.push(`  • ${p}`));
      lines.push('');
    }

    if (call.summary.actionItems.length > 0) {
      lines.push('☑️ Action Items:');
      call.summary.actionItems.forEach(a => lines.push(`  • ${a}`));
      lines.push('');
    }

    lines.push(`😊 Sentiment: ${call.summary.sentiment.toUpperCase()} (${Math.round(call.summary.sentimentScore * 100)}%)`);
  }

  if (call.transcription) {
    lines.push('', '📝 Transcript:', call.transcription.text);
  }

  return lines.join('\n');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  notFoundText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  backLink: {
    color: COLORS.primary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
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
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  callInfo: {
    flex: 1,
    gap: 3,
  },
  callerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  callMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  callMetaSeparator: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  duration: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resolutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  resolutionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resolutionText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    gap: 2,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: SPACING.xs,
  },
  overviewText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  reprocessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  reprocessButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  reprocessButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  reprocessButtonSecondaryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  transcriptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  transcriptMetaText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  transcriptMetaSep: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  segmentsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  segment: {
    gap: 4,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  segmentTimestamp: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  segmentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  transcriptFullText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  audioPath: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
