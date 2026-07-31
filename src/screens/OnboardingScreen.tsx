import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UseCase } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, USE_CASE_CONFIG } from '../constants';
import { useSettings } from '../hooks/useSettings';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

const USE_CASES: UseCase[] = ['customer_support', 'meeting_minutes', 'call_summaries'];

export function OnboardingScreen({ navigation }: Props) {
  const { updateSettings } = useSettings();
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [step, setStep] = useState<'welcome' | 'usecase'>('welcome');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = (nextStep: 'welcome' | 'usecase') => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleContinue = async () => {
    if (!selectedUseCase) return;
    await updateSettings({ useCase: selectedUseCase, onboardingComplete: true });
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {step === 'welcome' ? (
          <WelcomeStep onNext={() => transitionTo('usecase')} />
        ) : (
          <UseCaseStep
            selected={selectedUseCase}
            onSelect={setSelectedUseCase}
            onContinue={handleContinue}
            onBack={() => transitionTo('welcome')}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Ionicons name="mic" size={48} color={COLORS.white} />
        </View>
        <View style={styles.aiPill}>
          <Ionicons name="sparkles" size={12} color={COLORS.secondary} />

        </View>
      </View>

      <View style={styles.heroText}>
        <Text style={styles.appName}>CallGenius</Text>
        <Text style={styles.tagline}>Record. Transcribe. Understand.</Text>
      </View>

      <Text style={styles.welcomeDesc}>
        Turn every phone call into structured insights using CallGenius transcription and
        intelligent summaries tailored to how you work.
      </Text>

      <View style={styles.featureList}>
        {[
          { icon: 'mic-outline', text: 'High-quality call recording' },
          { icon: 'text-outline', text: 'Accurate speech-to-text via Whisper' },
          { icon: 'sparkles-outline', text: 'Intelligent AI summaries' },
          { icon: 'shield-checkmark-outline', text: 'Your data stays on your device' },
        ].map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

function UseCaseStep({
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  selected: UseCase | null;
  onSelect: (uc: UseCase) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>How will you use CallGenius?</Text>
        <Text style={styles.stepSubtitle}>
          We'll tailor CallGenius to your specific needs.
          You can change this anytime in Settings.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.useCaseList}>
        {USE_CASES.map(uc => {
          const config = USE_CASE_CONFIG[uc];
          const isSelected = selected === uc;
          return (
            <TouchableOpacity
              key={uc}
              style={[styles.useCaseCard, isSelected && styles.useCaseCardSelected]}
              onPress={() => onSelect(uc)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.useCaseIconBg,
                  { backgroundColor: config.color + '18' },
                  isSelected && { backgroundColor: config.color + '30' },
                ]}
              >
                <Ionicons name={config.icon as any} size={28} color={config.color} />
              </View>

              <View style={styles.useCaseInfo}>
                <Text
                  style={[styles.useCaseName, isSelected && { color: config.color }]}
                >
                  {config.label}
                </Text>
                <Text style={styles.useCaseDesc}>{config.description}</Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  isSelected && { borderColor: config.color },
                ]}
              >
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: config.color }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, !selected && styles.primaryButtonDisabled]}
        onPress={onContinue}
        disabled={!selected}
      >
        <Text style={styles.primaryButtonText}>
          {selected ? `Start with ${USE_CASE_CONFIG[selected].label}` : 'Select a use case'}
        </Text>
        {selected && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  aiPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  heroText: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 4,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  welcomeDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  featureList: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 'auto',
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowColor: 'transparent',
    elevation: 0,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  stepHeader: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  useCaseList: {
    flex: 1,
  },
  useCaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  useCaseCardSelected: {
    borderColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  useCaseIconBg: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  useCaseInfo: {
    flex: 1,
    gap: 4,
  },
  useCaseName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  useCaseDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
