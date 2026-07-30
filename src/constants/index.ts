import { AppSettings, UseCase, SubscriptionPlan } from '../types';

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
  ADMIN_SETTINGS: '@CallRecorderPro:admin_settings',
  SUBSCRIPTION: '@CallRecorderPro:subscription',
  // SecureStore only allows alphanumeric, ".", "-", "_"
  LENCO_PUBLIC_KEY: 'CallRecorderPro.lenco_public_key',
  LENCO_SECRET_KEY: 'CallRecorderPro.lenco_secret_key',
  ADMIN_PIN: 'CallRecorderPro.admin_pin_hash',
};

export const DEFAULT_SETTINGS: AppSettings = {
  whisperModel: 'whisper-1',
  gptModel: 'gpt-4o-mini',
  autoRecord: true,
  autoTranscribe: true,
  language: 'en',
  storageLimit: 500,
  notificationsEnabled: true,
  useCase: 'customer_support',
  onboardingComplete: false,
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

export const MEETING_MINUTES_SYSTEM_PROMPT = `You are an expert meeting analyst. Analyze the following meeting transcription and generate structured meeting minutes in JSON format.

Provide your response in the following JSON structure:
{
  "overview": "A 2-3 sentence summary of what the meeting was about and its main outcomes",
  "customerIssue": "The main objective or agenda of the meeting",
  "resolutionStatus": "resolved|pending|escalated|unresolved",
  "keyPoints": ["Key discussion points, decisions made, and agreements reached (5-8 points)"],
  "actionItems": ["Specific action items with owner and deadline if mentioned, e.g. 'John to send report by Friday'"],
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0 to 1.0 (based on overall meeting tone and productivity),
  "customerSatisfaction": "Assessment of meeting outcomes and participant satisfaction",
  "tags": ["relevant tags like: planning, review, strategy, project-update, budget, hiring, etc."],
  "agentPerformance": "Assessment of the meeting facilitator's effectiveness"
}

Focus on decisions made, action items assigned, and next steps. Be precise about who is responsible for each action item.`;

export const CALL_SUMMARIES_SYSTEM_PROMPT = `You are an expert call analyst. Analyze the following phone call transcription and provide a comprehensive summary in JSON format.

Provide your response in the following JSON structure:
{
  "overview": "A 2-3 sentence overview of the call and its main purpose",
  "customerIssue": "The primary reason for the call and what was discussed",
  "resolutionStatus": "resolved|pending|escalated|unresolved",
  "keyPoints": ["Key topics and information exchanged during the call (4-7 points)"],
  "actionItems": ["Any follow-up actions or next steps mentioned"],
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0 to 1.0 (overall call tone assessment),
  "customerSatisfaction": "Assessment of how both parties felt at the end of the call",
  "tags": ["relevant category tags like: sales, follow-up, inquiry, negotiation, personal, business, etc."],
  "agentPerformance": "Assessment of communication quality and effectiveness"
}

Provide a balanced, objective analysis of the conversation. Highlight the most important information exchanged.`;

export const USE_CASE_PROMPTS: Record<UseCase, string> = {
  customer_support: CUSTOMER_SUPPORT_SYSTEM_PROMPT,
  meeting_minutes: MEETING_MINUTES_SYSTEM_PROMPT,
  call_summaries: CALL_SUMMARIES_SYSTEM_PROMPT,
};

export const USE_CASE_CONFIG: Record<UseCase, {
  label: string;
  description: string;
  icon: string;
  color: string;
  summaryLabel: string;
  issueLabel: string;
  agentLabel: string;
}> = {
  customer_support: {
    label: 'Customer Support',
    description: 'Analyze support calls for issue resolution, agent performance, CSAT scoring and follow-up actions.',
    icon: 'headset-outline',
    color: '#2563EB',
    summaryLabel: 'Support Summary',
    issueLabel: 'Customer Issue',
    agentLabel: 'Agent Performance',
  },
  meeting_minutes: {
    label: 'Meeting Minutes',
    description: 'Convert meeting recordings into structured minutes with decisions, action items and attendee notes.',
    icon: 'people-outline',
    color: '#7C3AED',
    summaryLabel: 'Meeting Minutes',
    issueLabel: 'Meeting Objective',
    agentLabel: 'Facilitator Assessment',
  },
  call_summaries: {
    label: 'Call Summaries',
    description: 'Generate concise summaries of any phone call with key topics, decisions and next steps.',
    icon: 'call-outline',
    color: '#059669',
    summaryLabel: 'Call Summary',
    issueLabel: 'Call Purpose',
    agentLabel: 'Communication Quality',
  },
};

export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  period: string;
  recordings: number | 'unlimited';
  features: string[];
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'ZMW',
    period: 'forever',
    recordings: 5,
    features: ['5 recordings/month', 'Basic transcription', 'Simple summary', '7-day history'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    currency: 'ZMW',
    period: 'month',
    recordings: 50,
    features: ['50 recordings/month', 'Full Whisper transcription', 'AI summary + sentiment', '30-day history', 'Export summaries'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 249,
    currency: 'ZMW',
    period: 'month',
    recordings: 200,
    features: ['200 recordings/month', 'Priority transcription', 'Advanced AI analysis', 'Unlimited history', 'All use cases', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 599,
    currency: 'ZMW',
    period: 'month',
    recordings: 'unlimited',
    features: ['Unlimited recordings', 'Custom AI prompts', 'Team management', 'API access', 'Dedicated support', 'SLA guarantee'],
  },
];

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
