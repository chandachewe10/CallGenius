import { Audio } from 'expo-av';
import { File, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { RecordingState } from '../types';
import { RECORDING_OPTIONS } from '../constants';

type MeteringCallback = (metering: number) => void;
type StateCallback = (state: RecordingState) => void;

class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private onMetering: MeteringCallback | null = null;
  private onStateChange: StateCallback | null = null;
  private startTime: number = 0;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private currentDuration: number = 0;
  private currentUri: string | null = null;

  setMeteringCallback(cb: MeteringCallback) {
    this.onMetering = cb;
  }

  setStateCallback(cb: StateCallback) {
    this.onStateChange = cb;
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async checkPermissions(): Promise<boolean> {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: RECORDING_OPTIONS.android,
          ios: RECORDING_OPTIONS.ios,
          web: RECORDING_OPTIONS.web,
          isMeteringEnabled: true,
        },
        this.handleRecordingStatus.bind(this),
        100
      );

      this.recording = recording;
      this.startTime = Date.now();
      this.currentDuration = 0;
      this.currentUri = null;

      this.startDurationTracking();
      this.notifyState();

      return null;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  private handleRecordingStatus(status: Audio.RecordingStatus) {
    if (status.isRecording && status.metering !== undefined) {
      const normalizedMetering = this.normalizeMetering(status.metering);
      this.onMetering?.(normalizedMetering);
    }
  }

  private normalizeMetering(metering: number): number {
    const minDb = -60;
    const maxDb = 0;
    const clamped = Math.max(minDb, Math.min(maxDb, metering));
    return (clamped - minDb) / (maxDb - minDb);
  }

  private startDurationTracking() {
    this.durationInterval = setInterval(() => {
      this.currentDuration = Math.floor((Date.now() - this.startTime) / 1000);
      this.notifyState();
    }, 1000);
  }

  private stopDurationTracking() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private notifyState() {
    this.onStateChange?.({
      isRecording: this.recording !== null,
      duration: this.currentDuration,
      uri: this.currentUri,
      metering: 0,
    });
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;

    try {
      this.stopDurationTracking();
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.currentUri = uri ?? null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });

      this.notifyState();
      return uri ?? null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      this.notifyState();
      return null;
    }
  }

  async pauseRecording(): Promise<void> {
    if (!this.recording) return;
    try {
      await this.recording.pauseAsync();
      this.stopDurationTracking();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  async resumeRecording(): Promise<void> {
    if (!this.recording) return;
    try {
      await this.recording.startAsync();
      this.startDurationTracking();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  async saveRecordingToDocuments(tempUri: string, filename: string): Promise<string> {
    const recordingsDir = new Directory(Paths.document, 'recordings');
    if (!recordingsDir.exists) {
      recordingsDir.create({ intermediates: true });
    }

    const destFile = new File(recordingsDir, filename);
    const sourceFile = new File(tempUri);

    await sourceFile.copy(destFile);
    return destFile.uri;
  }

  async deleteRecording(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }

  async getRecordingInfo(uri: string): Promise<{ size: number; exists: boolean }> {
    try {
      const file = new File(uri);
      return { size: file.size, exists: file.exists };
    } catch {
      return { size: 0, exists: false };
    }
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  getDuration(): number {
    return this.currentDuration;
  }

  cleanup() {
    this.stopDurationTracking();
    if (this.recording) {
      this.recording.stopAndUnloadAsync().catch(() => {});
      this.recording = null;
    }
  }
}

export const audioRecorderService = new AudioRecorderService();
