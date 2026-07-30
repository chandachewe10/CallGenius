import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, CallRecord, CallDirection } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useCallRecords } from '../hooks/useCallRecords';
import { useSettings } from '../hooks/useSettings';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { RecordButton } from '../components/RecordButton';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { audioRecorderService } from '../services/audioRecorderService';
import { storageService } from '../services/storageService';
import { processCallRecording } from '../services/recordingProcessorService';
import { autoCallRecordingService } from '../services/autoCallRecordingService';
import { hasOpenAiApiKey } from '../config/env';
import { generateId, formatDuration } from '../utils';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recording'>;
  route: RouteProp<RootStackParamList, 'Recording'>;
};

type ProcessingStep = 'idle' | 'saving' | 'transcribing' | 'summarizing' | 'done';

const STEP_MESSAGES: Record<ProcessingStep, { message: string; sub: string }> = {
  idle: { message: '', sub: '' },
  saving: { message: 'Saving Recording', sub: 'Preparing audio for analysis...' },
  transcribing: { message: 'Transcribing Audio', sub: 'Using OpenAI Whisper...' },
  summarizing: { message: 'Generating Summary', sub: 'Analyzing with GPT-4...' },
  done: { message: 'Complete!', sub: '' },
};

export function RecordingScreen({ navigation, route }: Props) {
  const { settings } = useSettings();
  const { updateCall } = useCallRecords();
  const {
    isRecording,
    isPaused,
    duration,
    metering,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error: recordingError,
  } = useAudioRecorder();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [direction, setDirection] = useState<CallDirection>('outgoing');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (recordingError) {
      Alert.alert('Recording Error', recordingError);
    }
  }, [recordingError]);

  const handleStartRecording = useCallback(async () => {
    if (!hasOpenAiApiKey()) {
      Alert.alert(
        'OpenAI Key Missing',
        'Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file to enable transcription.',
        [
          { text: 'Record Anyway', onPress: () => beginRecording() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    await beginRecording();
  }, []);

  const beginRecording = async () => {
    if (autoCallRecordingService.hasActiveRecording()) {
      Alert.alert(
        'Call Recording Active',
        'An automatic phone call recording is in progress. Stop the call first or wait until it ends.'
      );
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startRecording();

      const id = generateId();
      callIdRef.current = id;
      setCurrentCallId(id);

      const newCall: CallRecord = {
        id,
        phoneNumber: phoneNumber || undefined,
        contactName: contactName || undefined,
        direction,
        startTime: Date.now(),
        status: 'recording',
        createdAt: Date.now(),
      };

      await storageService.saveCall(newCall);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const uri = await stopRecording();
      if (!uri || !callIdRef.current) return;

      const callId = callIdRef.current;
      const endTime = Date.now();
      const recordingDuration = duration;

      setProcessingStep('saving');

      const filename = `recording_${callId}.m4a`;
      const savedUri = await audioRecorderService.saveRecordingToDocuments(uri, filename);

      const call = await storageService.getCallById(callId);
      if (!call) return;

      const updatedCall: CallRecord = {
        ...call,
        endTime,
        duration: recordingDuration,
        audioUri: savedUri,
        status: hasOpenAiApiKey() && settings.autoTranscribe ? 'processing' : 'completed',
      };
      await storageService.saveCall(updatedCall);
      await updateCall(updatedCall);

      if (hasOpenAiApiKey() && settings.autoTranscribe) {
        await processManualRecording(updatedCall, savedUri);
      } else {
        setProcessingStep('idle');
        navigation.navigate('CallDetail', { callId });
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      setProcessingStep('idle');
      Alert.alert('Error', 'Recording stopped but processing failed.');
    }
  }, [stopRecording, duration, settings, updateCall, navigation]);

  const processManualRecording = async (call: CallRecord, audioUri: string) => {
    const callId = call.id;

    try {
      setProcessingStep('transcribing');
      const processedCall = await processCallRecording(call, audioUri, settings);
      await updateCall(processedCall);

      setProcessingStep('done');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setProcessingStep('idle');
        navigation.navigate('CallDetail', { callId });
      }, 800);
    } catch (err) {
      console.error('Processing error:', err);
      const errorCall: CallRecord = { ...call, status: 'failed' };
      await storageService.saveCall(errorCall);
      await updateCall(errorCall);
      setProcessingStep('idle');

      Alert.alert(
        'Processing Error',
        err instanceof Error ? err.message : 'Failed to process recording',
        [
          { text: 'View Recording', onPress: () => navigation.navigate('CallDetail', { callId }) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const handlePauseResume = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  const isProcessing = processingStep !== 'idle';
  const stepInfo = STEP_MESSAGES[processingStep];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LoadingOverlay
        visible={isProcessing}
        message={stepInfo.message}
        subMessage={stepInfo.sub}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Recording</Text>
            <View style={{ width: 40 }} />
          </View>

          {!isRecording && (
            <View style={styles.inputSection}>
              <View style={styles.directionToggle}>
                {(['outgoing', 'incoming'] as CallDirection[]).map(dir => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.directionButton,
                      direction === dir && styles.directionButtonActive,
                    ]}
                    onPress={() => setDirection(dir)}
                  >
                    <Ionicons
                      name={dir === 'outgoing' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                      size={16}
                      color={direction === dir ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.directionText,
                        direction === dir && styles.directionTextActive,
                      ]}
                    >
                      {dir === 'outgoing' ? 'Outgoing' : 'Incoming'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contact Name (optional)"
                    placeholderTextColor={COLORS.textTertiary}
                    value={contactName}
                    onChangeText={setContactName}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={18} color={COLORS.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number (optional)"
                    placeholderTextColor={COLORS.textTertiary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          )}

          <View style={styles.recordingSection}>
            {isRecording && (
              <View style={styles.recordingInfo}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{isPaused ? 'PAUSED' : 'LIVE'}</Text>
                </View>
                <Text style={styles.timerText}>{formatDuration(duration)}</Text>
              </View>
            )}

            <View style={styles.waveformContainer}>
              <WaveformVisualizer
                metering={isPaused ? 0 : metering}
                isRecording={isRecording && !isPaused}
                barCount={24}
                height={80}
                color={isPaused ? COLORS.warning : COLORS.recording}
              />
            </View>

            <View style={styles.controlsRow}>
              {isRecording && (
                <TouchableOpacity
                  style={styles.secondaryControl}
                  onPress={handlePauseResume}
                >
                  <View style={styles.secondaryControlInner}>
                    <Ionicons
                      name={isPaused ? 'play' : 'pause'}
                      size={24}
                      color={COLORS.text}
                    />
                  </View>
                  <Text style={styles.secondaryControlLabel}>
                    {isPaused ? 'Resume' : 'Pause'}
                  </Text>
                </TouchableOpacity>
              )}

              <RecordButton
                isRecording={isRecording}
                isPaused={isPaused}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                size={84}
              />

              {isRecording && (
                <TouchableOpacity
                  style={styles.secondaryControl}
                  onPress={handleStopRecording}
                >
                  <View style={[styles.secondaryControlInner, { backgroundColor: COLORS.dangerLight }]}>
                    <Ionicons name="stop" size={22} color={COLORS.danger} />
                  </View>
                  <Text style={[styles.secondaryControlLabel, { color: COLORS.danger }]}>
                    Stop
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.hint}>
              {isRecording
                ? isPaused
                  ? 'Tap Resume to continue recording'
                  : 'Tap the button to stop recording'
                : 'Tap the button to start a manual recording (meetings, notes, etc.)'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Phone calls are recorded automatically when connected. Use manual recording here for
              meetings and other audio.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
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
  inputSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    gap: 4,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  directionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  directionTextActive: {
    color: COLORS.white,
  },
  inputGroup: {
    gap: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 4,
  },
  recordingSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.lg,
  },
  recordingInfo: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.recording,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.recording,
    letterSpacing: 1.5,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    color: COLORS.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.sm,
  },
  secondaryControl: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  secondaryControlInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryControlLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 20,
  },
});
