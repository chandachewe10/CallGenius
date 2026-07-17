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
  openaiApiKey: string;
  whisperModel: WhisperModel;
  gptModel: GptModel;
  autoRecord: boolean;
  autoTranscribe: boolean;
  language: string;
  storageLimit: number;
  notificationsEnabled: boolean;
}

export type WhisperModel = 'whisper-1';
export type GptModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';

export type RootStackParamList = {
  Home: undefined;
  Recording: { callId?: string };
  CallDetail: { callId: string };
  Settings: undefined;
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
