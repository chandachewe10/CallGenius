import { AppSettings } from '../types';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  secondary: '#7C3AED',
  secondaryLight: '#EDE9FE',
  accent: '#059669',
  accentLight: '#D1FAE5',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  recording: '#EF4444',
  recordingPulse: '#FCA5A5',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
  positive: '#059669',
  neutral: '#D97706',
  negative: '#DC2626',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const STORAGE_KEYS = {
  CALLS: '@CallRecorderPro:calls',
  SETTINGS: '@CallRecorderPro:settings',
  API_KEY: '@CallRecorderPro:openai_api_key',
};

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: '',
  whisperModel: 'whisper-1',
  gptModel: 'gpt-4o-mini',
  autoRecord: false,
  autoTranscribe: true,
  language: 'en',
  storageLimit: 500,
  notificationsEnabled: true,
};

export const CUSTOMER_SUPPORT_SYSTEM_PROMPT = `You are an expert customer support call analyzer. Analyze the following call transcription and provide a comprehensive summary in JSON format.

The call is between a customer support agent and a customer. Identify which parts are from the agent and which are from the customer based on context.

Provide your response in the following JSON structure:
{
  "overview": "A 2-3 sentence overview of the entire call",
  "customerIssue": "Clear description of the main issue or request the customer had",
  "resolutionStatus": "resolved|pending|escalated|unresolved",
  "keyPoints": ["Array of 3-6 key points discussed during the call"],
  "actionItems": ["Array of follow-up actions required, if any"],
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0 to 1.0 (where 0 is very negative, 0.5 is neutral, 1.0 is very positive),
  "customerSatisfaction": "Brief assessment of customer satisfaction level",
  "tags": ["relevant tags like: billing, technical-support, refund, complaint, inquiry, etc."],
  "agentPerformance": "Brief assessment of the agent's performance and professionalism"
}

Be concise but comprehensive. Focus on actionable insights that would help a customer support manager review this interaction.`;

export const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: 2,
    audioEncoder: 3,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'aac' as const,
    audioQuality: 127,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
  isMeteringEnabled: true,
};

export const BACKGROUND_TASK_NAME = 'call-recorder-background-task';

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

export const RESOLUTION_LABELS: Record<string, string> = {
  resolved: 'Resolved',
  pending: 'Pending',
  escalated: 'Escalated',
  unresolved: 'Unresolved',
};

export const RESOLUTION_COLORS: Record<string, string> = {
  resolved: COLORS.accent,
  pending: COLORS.warning,
  escalated: COLORS.secondary,
  unresolved: COLORS.danger,
};
