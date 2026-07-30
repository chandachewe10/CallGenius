import { AppSettings, CallRecord } from '../types';
import { getOpenAiApiKey, hasOpenAiApiKey } from '../config/env';
import { transcriptionService } from './transcriptionService';
import { summaryService } from './summaryService';
import { storageService } from './storageService';

export async function processCallRecording(
  call: CallRecord,
  audioUri: string,
  settings: AppSettings
): Promise<CallRecord> {
  const apiKey = getOpenAiApiKey();

  if (!hasOpenAiApiKey() || !settings.autoTranscribe) {
    const completedCall: CallRecord = {
      ...call,
      audioUri,
      status: 'completed',
    };
    await storageService.saveCall(completedCall);
    return completedCall;
  }

  let updatedCall: CallRecord = {
    ...call,
    audioUri,
    status: 'processing',
  };
  await storageService.saveCall(updatedCall);

  try {
    const transcription = await transcriptionService.transcribeAudio(
      audioUri,
      apiKey,
      settings.whisperModel,
      settings.language
    );

    updatedCall = {
      ...updatedCall,
      transcription,
      status: 'processing',
    };
    await storageService.saveCall(updatedCall);

    const summary = await summaryService.generateSummary(
      transcription,
      apiKey,
      settings.gptModel,
      undefined,
      settings.useCase
    );

    updatedCall = {
      ...updatedCall,
      summary,
      status: 'completed',
    };
    await storageService.saveCall(updatedCall);
    return updatedCall;
  } catch (error) {
    console.error('Failed to process recording:', error);
    const failedCall: CallRecord = {
      ...updatedCall,
      status: 'failed',
    };
    await storageService.saveCall(failedCall);
    return failedCall;
  }
}
