import { useEffect } from 'react';
import { autoCallRecordingService } from '../services/autoCallRecordingService';

export function useAutoCallRecording(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      autoCallRecordingService.stop();
      return;
    }

    autoCallRecordingService.start();

    return () => {
      autoCallRecordingService.stop();
    };
  }, [enabled]);
}
