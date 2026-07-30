import { AppSettings, CallDirection, CallRecord } from '../types';
import { callDetectionService, CallEvent } from './callDetectionService';
import { audioRecorderService } from './audioRecorderService';
import { storageService } from './storageService';
import { processCallRecording } from './recordingProcessorService';
import { generateId } from '../utils';

class AutoCallRecordingService {
  private activeCallId: string | null = null;
  private settings: AppSettings | null = null;
  private isEnabled = false;
  private isProcessingStop = false;

  async start(): Promise<void> {
    if (this.isEnabled) return;

    this.settings = await storageService.getSettings();
    if (!this.settings.autoRecord) return;

    callDetectionService.setCallEventCallback(this.handleCallEvent.bind(this));
    const started = await callDetectionService.start();
    if (!started) {
      console.warn('Auto call recording unavailable: native call detection not linked');
      return;
    }

    this.isEnabled = true;
  }

  stop(): void {
    if (!this.isEnabled) return;

    callDetectionService.stop();
    callDetectionService.setCallEventCallback(() => {});
    this.isEnabled = false;
    this.activeCallId = null;
  }

  isRunning(): boolean {
    return this.isEnabled && callDetectionService.isListening();
  }

  hasActiveRecording(): boolean {
    return this.activeCallId !== null && audioRecorderService.isRecording();
  }

  private async handleCallEvent(event: CallEvent, direction: CallDirection): Promise<void> {
    this.settings = await storageService.getSettings();
    if (!this.settings.autoRecord) return;

    if (event.state === 'Connected') {
      await this.startCallRecording(event.phoneNumber, direction);
      return;
    }

    if (event.state === 'Disconnected') {
      await this.stopCallRecording();
    }
  }

  private async startCallRecording(
    phoneNumber: string | undefined,
    direction: CallDirection
  ): Promise<void> {
    if (this.activeCallId || audioRecorderService.isRecording() || this.isProcessingStop) {
      return;
    }

    try {
      const id = generateId();
      this.activeCallId = id;

      const call: CallRecord = {
        id,
        phoneNumber,
        direction,
        startTime: Date.now(),
        status: 'recording',
        createdAt: Date.now(),
      };

      await storageService.saveCall(call);
      await audioRecorderService.startRecording();
    } catch (error) {
      console.warn('Failed to start auto call recording:', error);
      this.activeCallId = null;
    }
  }

  private async stopCallRecording(): Promise<void> {
    if (!this.activeCallId || this.isProcessingStop) return;

    this.isProcessingStop = true;
    const callId = this.activeCallId;
    this.activeCallId = null;

    try {
      const uri = await audioRecorderService.stopRecording();
      if (!uri) return;

      const call = await storageService.getCallById(callId);
      if (!call) return;

      const settings = this.settings ?? (await storageService.getSettings());
      const endTime = Date.now();
      const duration = audioRecorderService.getDuration();
      const filename = `recording_${callId}.m4a`;
      const savedUri = await audioRecorderService.saveRecordingToDocuments(uri, filename);

      const updatedCall: CallRecord = {
        ...call,
        endTime,
        duration,
        audioUri: savedUri,
        status: 'processing',
      };
      await storageService.saveCall(updatedCall);

      if (settings.autoTranscribe) {
        await processCallRecording(updatedCall, savedUri, settings);
      } else {
        await storageService.saveCall({
          ...updatedCall,
          status: 'completed',
        });
      }
    } catch (error) {
      console.warn('Failed to stop auto call recording:', error);
    } finally {
      this.isProcessingStop = false;
    }
  }
}

export const autoCallRecordingService = new AutoCallRecordingService();
