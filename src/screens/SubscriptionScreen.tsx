import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, UserSubscription } from '../types';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanConfig,
} from '../constants';
import { subscriptionService } from '../services/subscriptionService';
import { adminService } from '../services/adminService';
import {
  collectMobileMoney,
  createPaymentSession,
  getCollectionTransactionId,
  LENCO_OPERATORS,
  LencoMobileOperator,
  suggestOperatorFromPhone,
} from '../services/paymentService';
import { hasLencoSecretKey, hasSupabaseConfig } from '../config/env';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Subscription'>;
};

export function SubscriptionScreen({ navigation }: Props) {
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanConfig | null>(null);
  const [lencoSecretKey, setLencoSecretKey] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState<LencoMobileOperator>('airtel');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [restorePhone, setRestorePhone] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sub, secretKey] = await Promise.all([
      subscriptionService.getSubscription(),
      adminService.getLencoSecretKey(),
    ]);
    setCurrentSub(sub);
    setLencoSecretKey(secretKey);
  };

  const isPaymentConfigured = () => hasLencoSecretKey() || !!lencoSecretKey;

  const handleSelectPlan = async (plan: SubscriptionPlanConfig) => {
    if (plan.id === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan. Upgrade to unlock more features.');
      return;
    }

    if (!isPaymentConfigured()) {
      Alert.alert(
        'Payment Not Available',
        'Add EXPO_PUBLIC_LENCO_SECRET_KEY to your .env file to enable mobile money payments.',
      );
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const suggested = suggestOperatorFromPhone(value);
    if (suggested) setOperator(suggested);
  };

  const startPayment = async () => {
    if (!selectedPlan) return;

    const normalizedPhone = phone.trim();
    if (!normalizedPhone || normalizedPhone.length < 9) {
      Alert.alert('Phone Required', 'Enter your mobile money phone number (e.g. 0973750029).');
      return;
    }

    const secretKey = lencoSecretKey;
    if (!secretKey) {
      Alert.alert('Payment Not Available', 'Lenco secret key is not configured.');
      return;
    }

    setIsProcessing(true);

    try {
      const session = createPaymentSession(selectedPlan, normalizedPhone, operator);

      await subscriptionService.createPendingSubscription(
        selectedPlan.id,
        session.reference,
        session.amount,
        {
          operator: session.operator,
          phone: session.phone,
        },
      );

      const response = await collectMobileMoney(
        {
          operator: session.operator,
          phone: session.phone,
          amount: session.amount,
          reference: session.reference,
          bearer: 'customer',
        },
        secretKey,
      );

      const transactionId = getCollectionTransactionId(response);
      const sub = await subscriptionService.getSubscription();
      if (sub?.reference === session.reference) {
        if (transactionId) sub.lencoDepositId = transactionId;
        sub.status = 'pending';
        await subscriptionService.saveSubscription(sub);
      }

      setShowPaymentForm(false);
      await loadData();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Approve Payment',
        'A prompt has been sent to your phone. Please approve the payment to complete your subscription.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Unable to process payment. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreSubscription = async () => {
    const normalizedPhone = restorePhone.trim();
    if (!normalizedPhone || normalizedPhone.length < 9) {
      Alert.alert('Phone Required', 'Enter the mobile money number used when you subscribed.');
      return;
    }

    setIsRestoring(true);
    try {
      const restored = await subscriptionService.restoreByPhone(normalizedPhone);
      if (!restored) {
        Alert.alert(
          'No Subscription Found',
          'No active subscription was found for that phone number. Check the number or contact support.',
        );
        return;
      }

      setShowRestoreForm(false);
      setRestorePhone('');
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Subscription Restored',
        `Your ${restored.plan.toUpperCase()} plan is now active on this device.`,
      );
    } catch (error) {
      Alert.alert(
        'Restore Failed',
        error instanceof Error ? error.message : 'Unable to restore subscription.',
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const currentPlanConfig = SUBSCRIPTION_PLANS.find(p => p.id === (currentSub?.plan ?? 'free'));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {currentSub && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
            </View>
            <Text style={styles.currentPlanName}>{currentPlanConfig?.name ?? 'Free'}</Text>
            <View style={styles.subStatusRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      currentSub.status === 'active' ? COLORS.accentLight : COLORS.warningLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: currentSub.status === 'active' ? COLORS.accent : COLORS.warning },
                  ]}
                >
                  {currentSub.status.toUpperCase()}
                </Text>
              </View>
              {currentSub.expiresAt && currentSub.status === 'active' && (
                <Text style={styles.expiresText}>
                  {subscriptionService.getRemainingDays(currentSub)} days remaining
                </Text>
              )}
            </View>
          </View>
        )}

        {hasSupabaseConfig() && (
          <View style={styles.restoreCard}>
            <View style={styles.restoreHeader}>
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
              <Text style={styles.restoreTitle}>New phone or lost device?</Text>
            </View>
            <Text style={styles.restoreDesc}>
              Restore your subscription using the mobile money number you paid with. No account login needed.
            </Text>
            {!showRestoreForm ? (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => setShowRestoreForm(true)}
              >
                <Text style={styles.restoreButtonText}>Restore Subscription</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.restoreForm}>
                <TextInput
                  style={styles.restoreInput}
                  placeholder="e.g. 0973750029"
                  placeholderTextColor={COLORS.textTertiary}
                  value={restorePhone}
                  onChangeText={setRestorePhone}
                  keyboardType="phone-pad"
                  editable={!isRestoring}
                />
                <View style={styles.restoreActions}>
                  <TouchableOpacity
                    style={styles.restoreCancelBtn}
                    onPress={() => {
                      setShowRestoreForm(false);
                      setRestorePhone('');
                    }}
                    disabled={isRestoring}
                  >
                    <Text style={styles.restoreCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.restoreSubmitBtn}
                    onPress={handleRestoreSubscription}
                    disabled={isRestoring}
                  >
                    {isRestoring ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.restoreSubmitText}>Restore</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Choose a Plan</Text>

        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = currentSub?.plan === plan.id && currentSub.status === 'active';
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              onSelect={() => handleSelectPlan(plan)}
            />
          );
        })}
      </ScrollView>

      <Modal
        visible={showPaymentForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentForm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mobile Money Payment</Text>
            <Text style={styles.modalSubtitle}>
              Pay K{selectedPlan?.price ?? 0} for {selectedPlan?.name}. Choose your network and enter the paying number.
            </Text>

            <Text style={styles.fieldLabel}>Network</Text>
            <View style={styles.operatorRow}>
              {LENCO_OPERATORS.map(op => {
                const active = operator === op.id;
                return (
                  <TouchableOpacity
                    key={op.id}
                    style={[styles.operatorChip, active && styles.operatorChipActive]}
                    onPress={() => setOperator(op.id)}
                  >
                    <Text style={[styles.operatorChipText, active && styles.operatorChipTextActive]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="0973750029"
              placeholderTextColor={COLORS.textTertiary}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
              onPress={startPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Pay K{selectedPlan?.price ?? 0} with {operator === 'airtel' ? 'Airtel' : 'MTN'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowPaymentForm(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: SubscriptionPlanConfig;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {plan.highlighted && (
        <View style={styles.popularBadge}>
          <Ionicons name="star" size={10} color={COLORS.white} />
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, plan.highlighted && styles.planNameHighlighted]}>
            {plan.name}
          </Text>
          <View style={styles.planPriceRow}>
            {plan.price === 0 ? (
              <Text style={[styles.planPrice, plan.highlighted && { color: COLORS.white }]}>Free</Text>
            ) : (
              <>
                <Text style={[styles.planCurrency, plan.highlighted && { color: COLORS.white + 'CC' }]}>K</Text>
                <Text style={[styles.planPrice, plan.highlighted && { color: COLORS.white }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planPeriod, plan.highlighted && { color: COLORS.white + 'AA' }]}>
                  /{plan.period}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={[styles.planBadge, plan.highlighted && { backgroundColor: COLORS.white + '30' }]}>
          <Text style={[styles.planBadgeText, plan.highlighted && { color: COLORS.white }]}>
            {typeof plan.recordings === 'number' ? `${plan.recordings} rec` : 'Unlimited'}
          </Text>
        </View>
      </View>

      <View style={styles.planFeatures}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={plan.highlighted ? COLORS.white : COLORS.accent}
            />
            <Text style={[styles.featureText, plan.highlighted && { color: COLORS.white + 'EE' }]}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.selectButton,
          plan.highlighted && { backgroundColor: COLORS.white },
          isCurrent && styles.currentButton,
        ]}
      >
        <Text
          style={[
            styles.selectButtonText,
            plan.highlighted && { color: COLORS.primary },
            isCurrent && { color: COLORS.accent },
          ]}
        >
          {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Free Plan' : `Subscribe — K${plan.price}/mo`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  currentPlanCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  currentPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 6 },
  currentPlanLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPlanName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subStatusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  expiresText: { fontSize: 13, color: COLORS.textSecondary },
  restoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  restoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  restoreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  restoreDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  restoreButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  restoreForm: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  restoreInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    color: COLORS.text,
  },
  restoreActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  restoreCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restoreCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  restoreSubmitBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  restoreSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  gatewayCard: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  gatewayTextWrap: { flex: 1 },
  gatewayTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  gatewayDesc: { fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  gatewayStatus: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  planCardHighlighted: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  popularText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  planName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  planNameHighlighted: { color: COLORS.white },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  planCurrency: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 2 },
  planPrice: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  planPeriod: { fontSize: 13, color: COLORS.textSecondary, paddingBottom: 4 },
  planBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  planFeatures: { gap: 8, marginBottom: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  featureText: { fontSize: 13, color: COLORS.textSecondary },
  selectButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  currentButton: { backgroundColor: COLORS.accentLight },
  selectButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.xs,
  },
  operatorRow: { flexDirection: 'row', gap: SPACING.sm },
  operatorChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  operatorChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  operatorChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  operatorChipTextActive: { color: COLORS.primary },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', paddingVertical: SPACING.sm },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
