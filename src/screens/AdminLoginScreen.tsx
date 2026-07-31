import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { adminService } from '../services/adminService';
import { hasSupabaseConfig } from '../config/env';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdminLogin'>;
};

const PIN_LENGTH = 6;

export function AdminLoginScreen({ navigation }: Props) {
  const useSupabaseAuth = hasSupabaseConfig();
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isLoading, setIsLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (useSupabaseAuth) {
      adminService.isSupabaseAdminConnected().then(isAdmin => {
        if (isAdmin) {
          navigation.replace('AdminDashboard');
          return;
        }
        setIsSetup(true);
      });
      return;
    }

    adminService.isAdminConfigured().then(setIsSetup);
  }, [navigation, useSupabaseAuth]);

  const shake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSupabaseSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing credentials', 'Enter your Supabase admin email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminService.signInSupabaseAdmin(email.trim(), password);
      if (!result.ok) {
        Alert.alert('Sign-in failed', result.error ?? 'Unable to sign in.');
        return;
      }
      navigation.replace('AdminDashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);

    if (isSetup === false) {
      if (step === 'enter') {
        setPin(digits);
        if (digits.length === PIN_LENGTH) {
          setStep('confirm');
          setConfirmPin('');
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } else {
        setConfirmPin(digits);
        if (digits.length === PIN_LENGTH) {
          handleSetupPin(pin, digits);
        }
      }
    } else {
      setPin(digits);
      if (digits.length === PIN_LENGTH) {
        handleVerifyPin(digits);
      }
    }
  };

  const handleSetupPin = async (p1: string, p2: string) => {
    if (p1 !== p2) {
      shake();
      Alert.alert('PINs do not match', 'Please try again.');
      setStep('enter');
      setPin('');
      setConfirmPin('');
      return;
    }
    setIsLoading(true);
    try {
      await adminService.setupAdmin(p1);
      setIsSetup(true);
      navigation.replace('AdminDashboard');
    } catch {
      Alert.alert('Error', 'Failed to set up admin PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (enteredPin: string) => {
    setIsLoading(true);
    try {
      const valid = await adminService.verifyPin(enteredPin);
      if (valid) {
        navigation.replace('AdminDashboard');
      } else {
        shake();
        setPin('');
        Alert.alert('Incorrect PIN', 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Verification failed.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSetup === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (useSupabaseAuth) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Admin Sign In</Text>
            <Text style={styles.subtitle}>
              
            </Text>

            <View style={styles.form}>
              <TextInput
                style={styles.textInput}
                placeholder="Admin email"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleSupabaseSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>


          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const currentPin = step === 'confirm' ? confirmPin : pin;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>
            {isSetup ? 'Admin Access' : 'Set Up Admin PIN'}
          </Text>

          <Text style={styles.subtitle}>
            {isSetup
              ? 'Enter your admin PIN to access the dashboard.'
              : step === 'enter'
              ? 'Create a 6-digit PIN to secure the admin panel.'
              : 'Confirm your PIN to complete setup.'}
          </Text>

          <Animated.View
            style={[styles.pinContainer, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < currentPin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </Animated.View>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={currentPin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            secureTextEntry
            autoFocus
            editable={!isLoading}
          />

          <TouchableOpacity onPress={() => inputRef.current?.focus()} style={styles.tapHint}>
            <Ionicons name="keypad-outline" size={16} color={COLORS.textTertiary} />
            <Text style={styles.tapHintText}>Tap to enter PIN</Text>
          </TouchableOpacity>

          {!isSetup && step === 'confirm' && (
            <TouchableOpacity
              onPress={() => {
                setStep('enter');
                setPin('');
                setConfirmPin('');
              }}
              style={styles.startOverButton}
            >
              <Text style={styles.startOverText}>← Start over</Text>
            </TouchableOpacity>
          )}

          <View style={styles.securityNote}>
            <Ionicons name="lock-closed-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.securityNoteText}>
              This PIN is stored securely in the device's encrypted keychain.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 26, fontWeight: '800', color: COLORS.text,
    marginBottom: SPACING.sm, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 21, marginBottom: SPACING.xl,
  },
  form: {
    width: '100%',
    gap: SPACING.md,
  },
  textInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pinContainer: {
    flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md,
  },
  pinDot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  hiddenInput: {
    position: 'absolute', opacity: 0, width: 1, height: 1,
  },
  tapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tapHintText: { fontSize: 13, color: COLORS.textTertiary },
  startOverButton: { marginTop: SPACING.sm },
  startOverText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: SPACING.xl, paddingHorizontal: SPACING.sm,
  },
  securityNoteText: {
    flex: 1, fontSize: 11, color: COLORS.textTertiary, lineHeight: 16,
  },
});
