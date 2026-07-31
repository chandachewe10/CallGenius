import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, AdminApiKey, AdminSettings, UserSubscription } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { adminService } from '../services/adminService';
import { hasOpenAiApiKey, hasLencoSecretKey, hasSupabaseConfig } from '../config/env';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;
};

type ApiKeyService = AdminApiKey['service'];

interface ApiKeyEntry {
  service: ApiKeyService;
  label: string;
  description: string;
  icon: string;
  placeholder: string;
}

const API_KEY_ENTRIES: ApiKeyEntry[] = [
  {
    service: 'lenco_secret',
    label: 'Lenco Secret Key',
    description: 'Fallback if EXPO_PUBLIC_LENCO_SECRET_KEY is not set in .env. Used for mobile money collections API.',
    icon: 'key-outline',
    placeholder: 'your-lenco-secret-key',
  },
];

export function AdminDashboardScreen({ navigation }: Props) {
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [subscriptions, setSubscriptions] = useState<Array<{ userId: string; sub: UserSubscription; phone?: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addingKey, setAddingKey] = useState<ApiKeyService | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [supabaseAdminConnected, setSupabaseAdminConnected] = useState(false);

  const load = useCallback(async () => {
    const [settings, subs, isCloudAdmin] = await Promise.all([
      adminService.getAdminSettings(),
      adminService.getAllSubscriptions(),
      adminService.isSupabaseAdminConnected(),
    ]);
    setAdminSettings(settings);
    setSubscriptions(subs);
    setSupabaseAdminConnected(isCloudAdmin);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    adminService.isSupabaseAdminConnected().then(isAdmin => {
      if (!isAdmin) {
        navigation.replace('AdminLogin');
      }
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'End admin session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          if (hasSupabaseConfig()) {
            await adminService.signOutSupabaseAdmin();
          } else {
            adminService.logout();
          }
          navigation.replace('Settings');
        },
      },
    ]);
  };

  const handleAddKey = async (service: ApiKeyService) => {
    if (!keyInput.trim()) {
      Alert.alert('Empty Key', 'Please enter a valid API key.');
      return;
    }
    try {
      await adminService.setApiKey(service, keyInput.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setKeyInput('');
      setAddingKey(null);
      await load();
      Alert.alert('Key Saved', 'The API key has been saved securely. It cannot be viewed again.');
    } catch {
      Alert.alert('Error', 'Failed to save API key.');
    }
  };

  const handleRemoveKey = (service: ApiKeyService, label: string) => {
    Alert.alert(
      `Remove ${label}?`,
      'This will permanently delete the stored key. A new key must be added before the service can be used again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await adminService.removeApiKey(service);
            await load();
          },
        },
      ]
    );
  };

  const handleConfirmPayment = async (reference: string) => {
    Alert.alert('Confirm Payment', `Manually confirm payment ${reference}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await adminService.confirmSubscription(reference);
          await load();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleRevokePayment = async (reference: string) => {
    Alert.alert('Revoke Subscription', `Revoke subscription ${reference}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          await adminService.revokeSubscription(reference);
          await load();
        },
      },
    ]);
  };

  const getKeyHint = (service: ApiKeyService): string | null => {
    const key = adminSettings?.apiKeys.find(k => k.service === service);
    return key?.hint ?? null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>CallGenius Management</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Section title="API Keys" icon="key-outline" subtitle="OpenAI and Lenco secret keys can be configured in .env. Admin keys are write-only fallbacks.">
          <View style={styles.apiKeyCard}>
            <View style={styles.apiKeyHeader}>
              <View style={styles.apiKeyIconBg}>
                <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.apiKeyInfo}>
                <Text style={styles.apiKeyLabel}>OpenAI API Key</Text>
                <Text style={styles.apiKeyDesc}>
                  Set EXPO_PUBLIC_OPENAI_API_KEY in the project .env file before building or starting Expo.
                </Text>
              </View>
            </View>
            <View style={styles.keyStatusRow}>
              <View style={styles.keySet}>
                <Ionicons
                  name={hasOpenAiApiKey() ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={16}
                  color={hasOpenAiApiKey() ? COLORS.accent : COLORS.warning}
                />
                <Text style={styles.keyHint}>
                  {hasOpenAiApiKey() ? 'Configured in .env' : 'Missing from .env'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.apiKeyCard}>
            <View style={styles.apiKeyHeader}>
              <View style={styles.apiKeyIconBg}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.apiKeyInfo}>
                <Text style={styles.apiKeyLabel}>Lenco Secret Key</Text>
                <Text style={styles.apiKeyDesc}>
                  Used for mobile money collections. Set EXPO_PUBLIC_LENCO_SECRET_KEY in .env, or add it below as a fallback.
                </Text>
              </View>
            </View>
            <View style={styles.keyStatusRow}>
              <View style={styles.keySet}>
                <Ionicons
                  name={hasLencoSecretKey() ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={16}
                  color={hasLencoSecretKey() ? COLORS.accent : COLORS.warning}
                />
                <Text style={styles.keyHint}>
                  {hasLencoSecretKey() ? 'Configured in .env' : 'Using admin key or missing'}
                </Text>
              </View>
            </View>
          </View>

          {API_KEY_ENTRIES.map(entry => {
            const hint = getKeyHint(entry.service);
            const hasKey = !!hint;
            const isAdding = addingKey === entry.service;

            return (
              <View key={entry.service} style={styles.apiKeyCard}>
                <View style={styles.apiKeyHeader}>
                  <View style={styles.apiKeyIconBg}>
                    <Ionicons name={entry.icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.apiKeyInfo}>
                    <Text style={styles.apiKeyLabel}>{entry.label}</Text>
                    <Text style={styles.apiKeyDesc}>{entry.description}</Text>
                  </View>
                </View>

                {hasKey ? (
                  <View style={styles.keyStatusRow}>
                    <View style={styles.keySet}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                      <Text style={styles.keyHint}>{hint}</Text>
                    </View>
                    <View style={styles.keyActions}>
                      <TouchableOpacity
                        style={styles.replaceBtn}
                        onPress={() => {
                          setAddingKey(entry.service);
                          setKeyInput('');
                        }}
                      >
                        <Text style={styles.replaceBtnText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveKey(entry.service, entry.label)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.keyNotSet}>
                    <View style={styles.keyNotSetIndicator}>
                      <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
                      <Text style={styles.keyNotSetText}>Not configured</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addKeyBtn}
                      onPress={() => {
                        setAddingKey(entry.service);
                        setKeyInput('');
                      }}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.addKeyBtnText}>Add Key</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isAdding && (
                  <View style={styles.keyInputSection}>
                    <Text style={styles.keyInputNote}>
                      ⚠️ This key will be stored in the secure keychain and cannot be retrieved once saved.
                    </Text>
                    <View style={styles.keyInputRow}>
                      <TextInput
                        style={styles.keyInput}
                        placeholder={entry.placeholder}
                        placeholderTextColor={COLORS.textTertiary}
                        value={keyInput}
                        onChangeText={setKeyInput}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                      />
                    </View>
                    <View style={styles.keyInputActions}>
                      <TouchableOpacity
                        style={styles.cancelKeyBtn}
                        onPress={() => {
                          setAddingKey(null);
                          setKeyInput('');
                        }}
                      >
                        <Text style={styles.cancelKeyBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveKeyBtn}
                        onPress={() => handleAddKey(entry.service)}
                      >
                        <Ionicons name="save-outline" size={16} color={COLORS.white} />
                        <Text style={styles.saveKeyBtnText}>Save Securely</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Section>

        {hasSupabaseConfig() && (
          <Section
            title="Supabase Cloud"
            icon="cloud-outline"
            subtitle="Signed in with your Supabase admin account."
          >
            <View style={styles.apiKeyCard}>
              <View style={styles.keyStatusRow}>
                <View style={styles.keySet}>
                  <Ionicons
                    name={supabaseAdminConnected ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={16}
                    color={supabaseAdminConnected ? COLORS.accent : COLORS.warning}
                  />
                  <Text style={styles.keyHint}>
                    {supabaseAdminConnected
                      ? 'Connected — viewing all cloud subscriptions'
                      : 'Not connected'}
                  </Text>
                </View>
              </View>
            </View>
          </Section>
        )}

        <Section
          title="Subscriptions"
          icon="card-outline"
          subtitle={`${subscriptions.length} total subscription${subscriptions.length !== 1 ? 's' : ''}`}
        >
          {subscriptions.length === 0 ? (
            <View style={styles.emptySubscriptions}>
              <Ionicons name="card-outline" size={32} color={COLORS.textTertiary} />
              <Text style={styles.emptySubText}>No subscriptions yet</Text>
              <Text style={styles.emptySubDesc}>Users who subscribe will appear here for payment confirmation.</Text>
            </View>
          ) : (
            subscriptions.map(({ userId, sub, phone }, i) => (
              <View key={i} style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <View>
                    <Text style={styles.subPlan}>{sub.plan?.toUpperCase()} Plan</Text>
                    <Text style={styles.subRef}>Ref: {sub.reference ?? 'N/A'}</Text>
                    {phone && <Text style={styles.subDetail}>Phone: {phone}</Text>}
                  </View>
                  <View style={[
                    styles.subStatusBadge,
                    {
                      backgroundColor:
                        sub.status === 'active' ? COLORS.accentLight
                          : sub.status === 'pending' ? COLORS.warningLight
                          : COLORS.dangerLight,
                    },
                  ]}>
                    <Text style={[
                      styles.subStatusText,
                      {
                        color:
                          sub.status === 'active' ? COLORS.accent
                            : sub.status === 'pending' ? COLORS.warning
                            : COLORS.danger,
                      },
                    ]}>
                      {sub.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.subDetails}>
                  <Text style={styles.subDetail}>Amount: K{sub.amount ?? 0}</Text>
                  {sub.lencoDepositId && (
                    <Text style={styles.subDetail}>Lenco ID: {sub.lencoDepositId}</Text>
                  )}
                </View>

                {sub.status === 'pending' && sub.reference && (
                  <View style={styles.subActions}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => handleConfirmPayment(sub.reference!)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
                      <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleRevokePayment(sub.reference!)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                      <Text style={styles.revokeBtnText}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {sub.status === 'active' && sub.reference && (
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => handleRevokePayment(sub.reference!)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.revokeBtnText}>Revoke Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </Section>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.securityNoteText}>
            Session auto-expires after 15 minutes of inactivity. All API keys are stored in the
            device's encrypted secure enclave — they cannot be extracted or viewed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon as any} size={16} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  logoutButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  section: {},
  sectionHeader: { marginBottom: SPACING.xs, paddingHorizontal: SPACING.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionSubtitle: { fontSize: 12, color: COLORS.textTertiary, marginTop: 3 },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  apiKeyCard: {
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  apiKeyHeader: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  apiKeyIconBg: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  apiKeyInfo: { flex: 1 },
  apiKeyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  apiKeyDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  keyStatusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  keySet: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyHint: { fontSize: 13, fontFamily: 'monospace', color: COLORS.textSecondary },
  keyActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  replaceBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary,
  },
  replaceBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
  keyNotSet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keyNotSetIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyNotSetText: { fontSize: 12, color: COLORS.warning },
  addKeyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
    backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm,
  },
  addKeyBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  keyInputSection: {
    marginTop: SPACING.sm, backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.sm,
  },
  keyInputNote: { fontSize: 11, color: COLORS.warning, lineHeight: 16 },
  keyInputRow: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  keyInput: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2,
    fontSize: 13, color: COLORS.text, fontFamily: 'monospace',
  },
  keyInputActions: { flexDirection: 'row', gap: SPACING.xs },
  cancelKeyBtn: {
    flex: 1, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelKeyBtnText: { fontSize: 13, color: COLORS.textSecondary },
  saveKeyBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.sm,
  },
  saveKeyBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  emptySubscriptions: {
    alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm,
  },
  emptySubText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubDesc: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 },
  subCard: {
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.xs,
  },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subPlan: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  subRef: { fontSize: 11, color: COLORS.textTertiary, fontFamily: 'monospace' },
  subStatusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
  },
  subStatusText: { fontSize: 10, fontWeight: '700' },
  subDetails: { gap: 2 },
  subDetail: { fontSize: 12, color: COLORS.textSecondary },
  subActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.accentLight, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  revokeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.dangerLight, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  revokeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: SPACING.sm, padding: SPACING.sm,
  },
  securityNoteText: { flex: 1, fontSize: 11, color: COLORS.textTertiary, lineHeight: 16 },
});
