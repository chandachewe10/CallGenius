import { useState, useCallback, useRef, useEffect } from 'react';
import { RecordingState } from '../types';
import { audioRecorderService } from '../services/audioRecorderService';

interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  metering: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  hasPermission: boolean;
  checkPermissions: () => Promise<boolean>;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    uri: null,
    metering: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [metering, setMetering] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meteringValues = useRef<number[]>([]);

  useEffect(() => {
    audioRecorderService.setStateCallback(setRecordingState);
    audioRecorderService.setMeteringCallback((value) => {
      meteringValues.current.push(value);
      if (meteringValues.current.length > 5) meteringValues.current.shift();
      const avg = meteringValues.current.reduce((a, b) => a + b, 0) / meteringValues.current.length;
      setMetering(avg);
    });

    checkPermissions();

    return () => {
      audioRecorderService.cleanup();
    };
  }, []);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await audioRecorderService.checkPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsPaused(false);
      meteringValues.current = [];
      await audioRecorderService.startRecording();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const uri = await audioRecorderService.stopRecording();
      setIsPaused(false);
      setMetering(0);
      meteringValues.current = [];
      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      return null;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    await audioRecorderService.pauseRecording();
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(async () => {
    await audioRecorderService.resumeRecording();
    setIsPaused(false);
  }, []);

  return {
    recordingState,
    isRecording: recordingState.isRecording,
    isPaused,
    duration: recordingState.duration,
    metering,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    hasPermission,
    checkPermissions,
    error,
  };
}
