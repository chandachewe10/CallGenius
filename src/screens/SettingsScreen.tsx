import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, GptModel, UseCase, UserSubscription } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, USE_CASE_CONFIG, SUBSCRIPTION_PLANS } from '../constants';
import { useSettings } from '../hooks/useSettings';
import { useCallRecords } from '../hooks/useCallRecords';
import { subscriptionService } from '../services/subscriptionService';
import { hasOpenAiApiKey } from '../config/env';
import { autoCallRecordingService } from '../services/autoCallRecordingService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { clearAll, calls } = useCallRecords();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    subscriptionService.getSubscription().then(setSubscription);
  }, []);

  const handleVersionTap = () => {
    versionTapCount.current += 1;
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    versionTapTimer.current = setTimeout(() => {
      versionTapCount.current = 0;
    }, 2000);

    if (versionTapCount.current >= 7) {
      versionTapCount.current = 0;
      navigation.navigate('AdminLogin');
    }
  };

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${calls.length} recordings, transcriptions, and summaries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            Alert.alert('Cleared', 'All recordings have been deleted.');
          },
        },
      ]
    );
  }, [calls.length, clearAll]);

  const handleResetSettings = useCallback(() => {
    Alert.alert('Reset Settings', 'Reset all settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetSettings();
          await autoCallRecordingService.start();
        },
      },
    ]);
  }, [resetSettings]);

  const GPT_MODELS: Array<{ value: GptModel; label: string; desc: string }> = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Faster, cost-effective' },
    { value: 'gpt-4o', label: 'GPT-4o', desc: 'Balanced quality & speed' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'Highest quality analysis' },
  ];

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'it', label: 'Italian' },
    { code: 'ja', label: 'Japanese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SettingsSection title="AI Configuration" icon="sparkles-outline">
          {/* <View style={styles.envStatusRow}>
            <View style={styles.settingsRowInfo}>
              <Text style={styles.settingsRowLabel}>OpenAI API Key</Text>
              <Text style={styles.settingsRowDesc}>
                Configured in .env as EXPO_PUBLIC_OPENAI_API_KEY for all users.
              </Text>
            </View>
            <View
              style={[
                styles.envStatusBadge,
                hasOpenAiApiKey() ? styles.envStatusConfigured : styles.envStatusMissing,
              ]}
            >
              <Text
                style={[
                  styles.envStatusText,
                  hasOpenAiApiKey() ? styles.envStatusTextConfigured : styles.envStatusTextMissing,
                ]}
              >
                {hasOpenAiApiKey() ? 'Configured' : 'Missing'}
              </Text>
            </View>
          </View> */}

          <SettingsPickerRow
            label="GPT Model"
            desc="Used for call summarization"
            value={settings.gptModel}
            options={GPT_MODELS.map(m => ({ value: m.value, label: m.label }))}
            onChange={v => updateSettings({ gptModel: v as GptModel })}
          />
        </SettingsSection>

        <SettingsSection title="Recording" icon="mic-outline">
          <SettingsSwitchRow
            label="Auto Record Phone Calls"
            desc="Automatically record when a phone call connects"
            value={settings.autoRecord}
            onChange={async v => {
              await updateSettings({ autoRecord: v });
              if (v) {
                await autoCallRecordingService.start();
              } else {
                autoCallRecordingService.stop();
              }
            }}
          />
          <SettingsSwitchRow
            label="Auto Transcribe"
            desc="Automatically transcribe after recording stops"
            value={settings.autoTranscribe}
            onChange={v => updateSettings({ autoTranscribe: v })}
          />
          <SettingsPickerRow
            label="Language"
            desc="Primary language for transcription"
            value={settings.language}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
            onChange={v => updateSettings({ language: v })}
          />
        </SettingsSection>

        <SettingsSection title="Use Case" icon="options-outline">
          <View style={styles.useCaseGrid}>
            {(['customer_support', 'meeting_minutes', 'call_summaries'] as UseCase[]).map(uc => {
              const config = USE_CASE_CONFIG[uc];
              const isActive = settings.useCase === uc;
              return (
                <TouchableOpacity
                  key={uc}
                  style={[styles.useCaseTile, isActive && { borderColor: config.color, backgroundColor: config.color + '10' }]}
                  onPress={() => updateSettings({ useCase: uc })}
                >
                  <Ionicons name={config.icon as any} size={22} color={isActive ? config.color : COLORS.textSecondary} />
                  <Text style={[styles.useCaseTileText, isActive && { color: config.color }]}>
                    {config.label}
                  </Text>
                  {isActive && <View style={[styles.useCaseCheck, { backgroundColor: config.color }]}>
                    <Ionicons name="checkmark" size={10} color={COLORS.white} />
                  </View>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.useCaseHint}>
            {USE_CASE_CONFIG[settings.useCase].description}
          </Text>
        </SettingsSection>

        <SettingsSection title="Subscription" icon="card-outline">
          {subscription ? (
            <View style={styles.subRow}>
              <View>
                <Text style={styles.subPlanName}>
                  {SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan)?.name ?? 'Free'} Plan
                </Text>
                <Text style={[styles.subStatus, {
                  color: subscription.status === 'active' ? COLORS.accent : COLORS.warning,
                }]}>
                  {subscription.status.toUpperCase()}
                  {subscription.status === 'active' && subscription.expiresAt
                    ? ` · ${subscriptionService.getRemainingDays(subscription)} days left`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate('Subscription')}
              >
                <Text style={styles.upgradeBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeFullBtn}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Ionicons name="star-outline" size={16} color={COLORS.primary} />
              <Text style={styles.upgradeFullBtnText}>View Plans & Upgrade</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </SettingsSection>

        <SettingsSection title="Notifications" icon="notifications-outline">
          <SettingsSwitchRow
            label="Enable Notifications"
            desc="Get notified when processing completes"
            value={settings.notificationsEnabled}
            onChange={v => updateSettings({ notificationsEnabled: v })}
          />
        </SettingsSection>

        <SettingsSection title="Data & Storage" icon="server-outline">
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Total Recordings</Text>
            <Text style={styles.dataValue}>{calls.length}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Analyzed Calls</Text>
            <Text style={styles.dataValue}>
              {calls.filter(c => c.status === 'completed').length}
            </Text>
          </View>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={styles.dangerButtonText}>Clear All Recordings</Text>
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title="About" icon="information-circle-outline">
          <TouchableOpacity style={styles.aboutRow} onPress={handleVersionTap} activeOpacity={1}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </TouchableOpacity>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>AI Models</Text>
            <Text style={styles.aboutValue}>Whisper + GPT-4</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>iOS & Android</Text>
          </View>
        </SettingsSection>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsSwitchRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowInfo}>
        <Text style={styles.settingsRowLabel}>{label}</Text>
        <Text style={styles.settingsRowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

function SettingsPickerRow({
  label,
  desc,
  value,
  options,
  onChange,
}: {
  label: string;
  desc: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.pickerSection}>
      <TouchableOpacity style={styles.settingsRow} onPress={() => setExpanded(e => !e)}>
        <View style={styles.settingsRowInfo}>
          <Text style={styles.settingsRowLabel}>{label}</Text>
          <Text style={styles.settingsRowDesc}>{desc}</Text>
        </View>
        <View style={styles.pickerValue}>
          <Text style={styles.pickerValueText}>{selected?.label ?? value}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.textTertiary}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.pickerOptions}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.pickerOption,
                opt.value === value && styles.pickerOptionSelected,
              ]}
              onPress={() => {
                onChange(opt.value);
                setExpanded(false);
              }}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  opt.value === value && styles.pickerOptionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
              {opt.value === value && (
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  content: {
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  envStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  envStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  envStatusConfigured: {
    backgroundColor: COLORS.accentLight,
  },
  envStatusMissing: {
    backgroundColor: COLORS.warningLight,
  },
  envStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  envStatusTextConfigured: {
    color: COLORS.accent,
  },
  envStatusTextMissing: {
    color: COLORS.warning,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingsRowInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingsRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingsRowDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pickerSection: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerValueText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  pickerOptions: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dataLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
  },
  dangerButtonText: {
    fontSize: 15,
    color: COLORS.danger,
    fontWeight: '500',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  aboutLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  resetButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  useCaseGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.sm,
    flexWrap: 'wrap',
  },
  useCaseTile: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 5,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
  },
  useCaseTileText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  useCaseCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useCaseHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    lineHeight: 18,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  subPlanName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  subStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  upgradeBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  upgradeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  upgradeFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  upgradeFullBtnText: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.primary },
});
