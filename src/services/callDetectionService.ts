import { Platform } from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import { CallDirection } from '../types';

export type CallEvent = {
  state: 'Dialing' | 'Incoming' | 'Connected' | 'Disconnected' | 'Missed';
  phoneNumber?: string;
};

type CallEventCallback = (event: CallEvent, direction: CallDirection) => void;

class CallDetectionService {
  private detector: CallDetectorManager | null = null;
  private onCallEvent: CallEventCallback | null = null;
  private isActive = false;
  private lastError: string | null = null;
  private pendingPhoneNumber: string | undefined;

  setCallEventCallback(cb: CallEventCallback) {
    this.onCallEvent = cb;
  }

  async start(): Promise<boolean> {
    if (this.isActive) return true;

    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      this.lastError = 'Call detection is only supported on Android and iOS.';
      return false;
    }

    try {
      this.detector = new CallDetectorManager(
        (event, phoneNumber) => {
          this.handleNativeEvent(String(event), phoneNumber ?? undefined);
        },
        Platform.OS === 'android',
        () => {
          this.lastError = 'Phone permission denied';
          console.warn('[CallDetection] READ_PHONE_STATE permission denied');
        },
        {
          title: 'Phone Permission',
          message:
            'CallGenius needs phone access to detect calls and auto-record them.',
        },
      );

      this.isActive = true;
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : 'Failed to start call detection';
      console.warn('[CallDetection] Failed to start:', this.lastError);
      return false;
    }
  }

  stop() {
    if (!this.isActive) return;

    try {
      this.detector?.dispose();
    } catch (error) {
      console.warn('[CallDetection] Failed to stop:', error);
    } finally {
      this.detector = null;
      this.isActive = false;
      this.pendingPhoneNumber = undefined;
    }
  }

  isListening(): boolean {
    return this.isActive;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  private handleNativeEvent(rawState: string, phoneNumber?: string) {
    if (rawState === 'Incoming' && phoneNumber) {
      this.pendingPhoneNumber = phoneNumber;
    }

    const state = this.normalizeState(rawState);
    if (!state) return;

    const resolvedPhone = phoneNumber ?? this.pendingPhoneNumber;
    const direction: CallDirection =
      rawState === 'Incoming' || rawState === 'Missed' ? 'incoming' : 'outgoing';

    this.onCallEvent?.({ state, phoneNumber: resolvedPhone }, direction);

    if (state === 'Disconnected' || state === 'Missed') {
      this.pendingPhoneNumber = undefined;
    }
  }

  private normalizeState(rawState: string): CallEvent['state'] | null {
    switch (rawState) {
      case 'Connected':
      case 'Offhook':
        return 'Connected';
      case 'Incoming':
        return 'Incoming';
      case 'Dialing':
        return 'Dialing';
      case 'Disconnected':
        return 'Disconnected';
      case 'Missed':
        return 'Missed';
      default:
        return null;
    }
  }
}

export const callDetectionService = new CallDetectionService();
