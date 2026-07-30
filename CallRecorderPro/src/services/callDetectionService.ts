import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { CallDirection } from '../types';

export type CallEvent = {
  state: 'Dialing' | 'Incoming' | 'Connected' | 'Disconnected' | 'Missed';
  phoneNumber?: string;
};

type CallEventCallback = (event: CallEvent, direction: CallDirection) => void;

class CallDetectionService {
  private callDetection: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private subscription: any = null;
  private onCallEvent: CallEventCallback | null = null;
  private isActive: boolean = false;

  setCallEventCallback(cb: CallEventCallback) {
    this.onCallEvent = cb;
  }

  async start(): Promise<boolean> {
    if (this.isActive) return true;

    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return false;
    }

    try {
      // Dynamically import to handle environments where native module may not be linked
      const CallDetection = NativeModules.RNCallDetection;
      if (!CallDetection) {
        console.warn('CallDetection native module not available');
        return false;
      }

      this.callDetection = CallDetection;
      this.eventEmitter = new NativeEventEmitter(CallDetection);

      this.subscription = this.eventEmitter.addListener(
        'CallDetected',
        this.handleCallEvent.bind(this)
      );

      await CallDetection.startListener();
      this.isActive = true;
      return true;
    } catch (error) {
      console.warn('Failed to start call detection:', error);
      return false;
    }
  }

  stop() {
    if (!this.isActive) return;
    try {
      this.subscription?.remove();
      this.callDetection?.stopListener?.();
      this.subscription = null;
      this.callDetection = null;
      this.eventEmitter = null;
      this.isActive = false;
    } catch (error) {
      console.warn('Failed to stop call detection:', error);
    }
  }

  private handleCallEvent(data: { state: string; phoneNumber?: string }) {
    const state = data.state as CallEvent['state'];
    const direction: CallDirection =
      state === 'Incoming' || state === 'Missed' ? 'incoming' : 'outgoing';

    this.onCallEvent?.({ state, phoneNumber: data.phoneNumber }, direction);
  }

  isListening(): boolean {
    return this.isActive;
  }
}

export const callDetectionService = new CallDetectionService();
