import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, SubscriptionPlan, UserSubscription } from '../types';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanConfig,
} from '../constants';
import { subscriptionService } from '../services/subscriptionService';
import { adminService } from '../services/adminService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Subscription'>;
};

export function SubscriptionScreen({ navigation }: Props) {
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [lencoKey, setLencoKey] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sub, key] = await Promise.all([
      subscriptionService.getSubscription(),
      adminService.getLencoPublicKey(),
    ]);
    setCurrentSub(sub);
    setLencoKey(key);
  };

  const handleSelectPlan = async (plan: SubscriptionPlanConfig) => {
    if (plan.id === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan. Upgrade to unlock more features.');
      return;
    }

    if (!lencoKey) {
      Alert.alert(
        'Payment Not Available',
        'The payment gateway is not configured yet. Please contact the administrator.',
      );
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(plan.id);
    const ref = `crp-${plan.id}-${Date.now()}`;
    setPaymentRef(ref);
    setShowPayment(true);
  };

  const getPaymentHtml = (plan: SubscriptionPlanConfig): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <script src="https://pay.lenco.co/js/v1/inline.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { color: #0F172A; font-size: 22px; margin-bottom: 8px; }
    .price { color: #2563EB; font-size: 36px; font-weight: 800; margin: 12px 0 4px; }
    .period { color: #64748B; font-size: 14px; margin-bottom: 20px; }
    .btn {
      background: #2563EB;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 32px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
    }
    .btn:active { opacity: 0.85; }
    .info { color: #94A3B8; font-size: 12px; margin-top: 16px; line-height: 1.5; }
    #status { margin-top: 16px; padding: 12px; border-radius: 8px; display: none; font-size: 14px; }
    .success { background: #D1FAE5; color: #059669; }
    .error { background: #FEE2E2; color: #DC2626; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💳</div>
    <h2>CallGenius ${plan.name}</h2>
    <div class="price">K${plan.price}</div>
    <div class="period">per ${plan.period}</div>
    <button class="btn" onclick="pay()">Pay with Lenco</button>
    <p class="info">Secure payment via Lenco. Supports Mobile Money & Card.</p>
    <div id="status"></div>
  </div>

  <script>
    function showStatus(msg, type) {
      const el = document.getElementById('status');
      el.textContent = msg;
      el.className = type;
      el.style.display = 'block';
    }

    function pay() {
      LencoPay.getPaid({
        key: "${lencoKey}",
        reference: "${paymentRef}",
        amount: ${plan.price * 100},
        currency: "ZMW",
        channels: ["card", "mobile-money"],
        customer: {
          firstName: "CallGenius",
          lastName: "User",
        },
        onSuccess: function(response) {
          showStatus('Payment successful! Activating your subscription...', 'success');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_success',
            data: response
          }));
        },
        onClose: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'payment_closed' }));
        },
        onConfirmationPending: function() {
          showStatus('Payment pending confirmation. Your subscription will be activated soon.', 'success');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'payment_pending' }));
        },
      });
    }

    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(pay, 500);
    });
  </script>
</body>
</html>`;
  };

  const handleWebViewMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'payment_success') {
        setShowPayment(false);
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
        if (!plan) return;

        await subscriptionService.activateSubscription(paymentRef, msg.data?.id);
        await loadData();

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Subscription Activated! 🎉',
          `Welcome to CallGenius ${plan.name}! Enjoy unlimited recordings and AI analysis.`,
          [{ text: 'Start Recording', onPress: () => navigation.goBack() }]
        );
      } else if (msg.type === 'payment_pending') {
        setShowPayment(false);
        if (selectedPlan) {
          const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
          await subscriptionService.createPendingSubscription(
            selectedPlan,
            paymentRef,
            plan?.price ?? 0
          );
          await loadData();
        }
        Alert.alert(
          'Payment Pending',
          'Your subscription will be activated once the payment is confirmed.',
          [{ text: 'OK' }]
        );
      } else if (msg.type === 'payment_closed') {
        setShowPayment(false);
      }
    } catch {}
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

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textTertiary} />
          <Text style={styles.disclaimerText}>
            Payments processed securely by Lenco. Cancel anytime. Subscriptions auto-renew monthly.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <SafeAreaView style={styles.webviewContainer}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity onPress={() => setShowPayment(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>Secure Payment</Text>
            <View style={styles.secureBadge}>
              <Ionicons name="lock-closed" size={12} color={COLORS.accent} />
              <Text style={styles.secureBadgeText}>Secure</Text>
            </View>
          </View>
          {selectedPlan && (() => {
            const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
            return plan ? (
              <WebView
                source={{ html: getPaymentHtml(plan) }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                style={styles.webview}
              />
            ) : null;
          })()}
        </SafeAreaView>
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
            {typeof plan.recordings === 'number'
              ? `${plan.recordings} rec`
              : 'Unlimited'}
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

      <View style={[
        styles.selectButton,
        plan.highlighted && { backgroundColor: COLORS.white },
        isCurrent && styles.currentButton,
      ]}>
        <Text style={[
          styles.selectButtonText,
          plan.highlighted && { color: COLORS.primary },
          isCurrent && { color: COLORS.accent },
        ]}>
          {isCurrent ? '✓ Current Plan' : plan.price === 0 ? 'Free Plan' : `Subscribe — K${plan.price}/mo`}
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  currentPlanCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  currentPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 6 },
  currentPlanLabel: { fontSize: 12, fontWeight: '600', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  currentPlanName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subStatusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  expiresText: { fontSize: 13, color: COLORS.textSecondary },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.sm,
  },
  planCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  planCardHighlighted: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  popularBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.secondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
  },
  popularText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  planName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  planNameHighlighted: { color: COLORS.white },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  planCurrency: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 2 },
  planPrice: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  planPeriod: { fontSize: 13, color: COLORS.textSecondary, paddingBottom: 4 },
  planBadge: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  planFeatures: { gap: 8, marginBottom: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  featureText: { fontSize: 13, color: COLORS.textSecondary },
  selectButton: {
    backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2, alignItems: 'center',
  },
  currentButton: { backgroundColor: COLORS.accentLight },
  selectButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs, marginTop: SPACING.sm,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: COLORS.textTertiary, lineHeight: 18 },
  webviewContainer: { flex: 1, backgroundColor: COLORS.background },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant, alignItems: 'center', justifyContent: 'center',
  },
  webviewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  secureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.accentLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
  },
  secureBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },
  webview: { flex: 1 },
});
