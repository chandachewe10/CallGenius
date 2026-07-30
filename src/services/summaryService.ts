import { CallSummary, GptModel, TranscriptionResult, UseCase } from '../types';
import { USE_CASE_PROMPTS } from '../constants';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class SummaryService {
  async generateSummary(
    transcription: TranscriptionResult,
    apiKey: string,
    model: GptModel = 'gpt-4o-mini',
    additionalContext?: string,
    useCase: UseCase = 'customer_support'
  ): Promise<CallSummary> {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (!transcription.text || transcription.text.trim().length === 0) {
      throw new Error('Transcription is empty');
    }

    const transcriptText = this.formatTranscriptForAnalysis(transcription);

    const userMessage = `Please analyze this customer support call transcription and provide a comprehensive summary:

${transcriptText}

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Return the analysis as valid JSON only, with no additional text before or after.`;

    const systemPrompt = USE_CASE_PROMPTS[useCase];
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Summary generation failed: ${response.status} - ${errorBody}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as CallSummary;
    return this.validateAndNormalizeSummary(parsed);
  }

  private formatTranscriptForAnalysis(transcription: TranscriptionResult): string {
    if (transcription.segments && transcription.segments.length > 0) {
      return transcription.segments
        .map(seg => {
          const timestamp = this.formatTimestamp(seg.start);
          return `[${timestamp}] ${seg.text}`;
        })
        .join('\n');
    }
    return transcription.text;
  }

  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private validateAndNormalizeSummary(data: any): CallSummary {
    const validSentiments = ['positive', 'neutral', 'negative'];
    const validResolutions = ['resolved', 'pending', 'escalated', 'unresolved'];

    return {
      overview: data.overview ?? 'No overview available',
      customerIssue: data.customerIssue ?? 'Unknown issue',
      resolutionStatus: validResolutions.includes(data.resolutionStatus)
        ? data.resolutionStatus
        : 'unresolved',
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      sentiment: validSentiments.includes(data.sentiment) ? data.sentiment : 'neutral',
      sentimentScore: typeof data.sentimentScore === 'number'
        ? Math.max(0, Math.min(1, data.sentimentScore))
        : 0.5,
      customerSatisfaction: data.customerSatisfaction ?? undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
      agentPerformance: data.agentPerformance ?? undefined,
    };
  }

  async generateQuickInsight(transcriptionText: string, apiKey: string): Promise<string> {
    if (!apiKey || !transcriptionText) return '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a customer support analyst. Provide a single sentence quick insight about this call.',
          },
          { role: 'user', content: transcriptionText },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return '';
    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content ?? '';
  }
}

export const summaryService = new SummaryService();
