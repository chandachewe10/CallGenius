export type UseCase = 'customer_support' | 'meeting_minutes' | 'call_summaries';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled';

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  reference?: string;
  amount?: number;
  currency?: string;
  expiresAt?: number;
  createdAt: number;
  lencoDepositId?: string;
}

export interface AdminApiKey {
  id: string;
  name: string;
  service: 'openai' | 'lenco_public' | 'lenco_secret';
  hint: string;
  createdAt: number;
}

export interface AdminSettings {
  isAdminSetup: boolean;
  adminPinHash: string;
  apiKeys: AdminApiKey[];
  lencoPublicKeySet: boolean;
  openaiKeySet: boolean;
}

export type CallDirection = 'incoming' | 'outgoing' | 'unknown';
export type CallStatus = 'recording' | 'processing' | 'completed' | 'failed';
export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface CallRecord {
  id: string;
  phoneNumber?: string;
  contactName?: string;
  direction: CallDirection;
  startTime: number;
  endTime?: number;
  duration?: number;
  audioUri?: string;
  transcription?: TranscriptionResult;
  summary?: CallSummary;
  status: CallStatus;
  createdAt: number;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: 'agent' | 'customer';
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export interface CallSummary {
  overview: string;
  customerIssue: string;
  resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  keyPoints: string[];
  actionItems: string[];
  sentiment: SentimentType;
  sentimentScore: number;
  customerSatisfaction?: string;
  tags: string[];
  agentPerformance?: string;
}

export interface AppSettings {
  whisperModel: WhisperModel;
  gptModel: GptModel;
  autoRecord: boolean;
  autoTranscribe: boolean;
  language: string;
  storageLimit: number;
  notificationsEnabled: boolean;
  useCase: UseCase;
  onboardingComplete: boolean;
}

export type WhisperModel = 'whisper-1';
export type GptModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Recording: { callId?: string };
  CallDetail: { callId: string };
  Settings: undefined;
  Subscription: undefined;
  AdminLogin: undefined;
  AdminDashboard: undefined;
};

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  uri: string | null;
  metering: number;
}

export interface TranscriptionState {
  isLoading: boolean;
  error: string | null;
  result: TranscriptionResult | null;
}

export interface SummaryState {
  isLoading: boolean;
  error: string | null;
  result: CallSummary | null;
}
