/**
 * Safe WebView wrapper — falls back gracefully in Expo Go (where react-native-webview
 * is not linked) so the rest of the app remains fully testable.
 * In a native/EAS build the real WebView is used.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';

let WebView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
} catch {}

interface SafeWebViewProps {
  source: { html: string } | { uri: string };
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  style?: any;
  fallbackTitle?: string;
  fallbackMessage?: string;
  fallbackUrl?: string;
}

export function SafeWebView({
  source,
  onMessage,
  javaScriptEnabled,
  domStorageEnabled,
  style,
  fallbackTitle = 'Opens in Browser',
  fallbackMessage = 'This feature requires a full native build. Tap below to open in your browser.',
  fallbackUrl,
}: SafeWebViewProps) {
  if (WebView) {
    return (
      <WebView
        source={source}
        onMessage={onMessage}
        javaScriptEnabled={javaScriptEnabled}
        domStorageEnabled={domStorageEnabled}
        style={style}
      />
    );
  }

  const url = fallbackUrl ?? ('uri' in source ? source.uri : undefined);

  return (
    <View style={[styles.fallback, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="globe-outline" size={40} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{fallbackTitle}</Text>
      <Text style={styles.message}>{fallbackMessage}</Text>
      {url && (
        <TouchableOpacity style={styles.openButton} onPress={() => Linking.openURL(url)}>
          <Ionicons name="open-outline" size={16} color={COLORS.white} />
          <Text style={styles.openButtonText}>Open in Browser</Text>
        </TouchableOpacity>
      )}
      <View style={styles.expoBadge}>
        <Ionicons name="information-circle-outline" size={14} color={COLORS.textTertiary} />
        <Text style={styles.expoBadgeText}>
          Running in Expo Go — native features limited
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  openButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  expoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  expoBadgeText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});
