import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, GptModel } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { useSettings } from '../hooks/useSettings';
import { useCallRecords } from '../hooks/useCallRecords';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { clearAll, calls } = useCallRecords();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.openaiApiKey);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiKey = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSettings({ openaiApiKey: apiKeyInput.trim() });
      Alert.alert('Saved', 'API key saved securely.');
    } catch {
      Alert.alert('Error', 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  }, [apiKeyInput, updateSettings]);

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
          setApiKeyInput('');
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
        <SettingsSection title="OpenAI Configuration" icon="key-outline">
          <View style={styles.apiKeyContainer}>
            <Text style={styles.apiKeyLabel}>API Key</Text>
            <Text style={styles.apiKeyDesc}>
              Required for transcription and summarization. Your key is stored securely on device.
            </Text>
            <View style={styles.apiKeyInputRow}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder="sk-..."
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!apiKeyVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setApiKeyVisible(v => !v)}
              >
                <Ionicons
                  name={apiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.apiKeyActions}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
              >
                <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                <Text style={styles.linkButtonText}>Get API Key</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveApiKey}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Key'}</Text>
              </TouchableOpacity>
            </View>
          </View>

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
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
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
  apiKeyContainer: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  apiKeyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  apiKeyDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: SPACING.sm,
  },
  apiKeyInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  apiKeyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
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
});
