import { File, Directory, Paths } from 'expo-file-system';
import { TranscriptionResult, WhisperModel } from '../types';

interface WhisperResponse {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
  duration?: number;
}

class TranscriptionService {
  async transcribeAudio(
    audioUri: string,
    apiKey: string,
    model: WhisperModel = 'whisper-1',
    language: string = 'en'
  ): Promise<TranscriptionResult> {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const file = new File(audioUri);
    if (!file.exists) {
      throw new Error('Audio file not found');
    }

    const formData = new FormData();

    formData.append('file', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);

    formData.append('model', model);
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Transcription failed: ${response.status} - ${errorBody}`);
    }

    const data: WhisperResponse = await response.json();

    return {
      text: data.text,
      segments: (data.segments ?? []).map(seg => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
        speaker: undefined,
      })),
      language: data.language,
      duration: data.duration,
    };
  }

  async transcribeFromBase64(
    base64Audio: string,
    _mimeType: string,
    apiKey: string,
    model: WhisperModel = 'whisper-1',
    language: string = 'en'
  ): Promise<TranscriptionResult> {
    const tempFile = new File(Paths.cache, `temp_audio_${Date.now()}.m4a`);
    tempFile.write(base64Audio);

    try {
      return await this.transcribeAudio(tempFile.uri, apiKey, model, language);
    } finally {
      try {
        if (tempFile.exists) tempFile.delete();
      } catch {}
    }
  }
}

export const transcriptionService = new TranscriptionService();
