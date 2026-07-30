# CallRecorderPro

A cross-platform mobile application for recording, transcribing, and analyzing customer support phone calls using OpenAI Whisper and GPT-4.

## Features

- **Call Recording** — Records audio through the device microphone during phone calls
- **AI Transcription** — Uses OpenAI Whisper to convert audio to text with timestamps
- **Smart Summaries** — GPT-4 powered summaries with customer issue detection, resolution status, sentiment analysis, action items, and agent performance insights
- **Call Management** — Browse, search, and manage call history
- **Secure Storage** — API key stored in device's secure keychain
- **Cross-Platform** — iOS and Android support via Expo

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) + TypeScript |
| Audio | `expo-av` |
| Transcription | OpenAI Whisper API (`whisper-1`) |
| Summarization | OpenAI GPT-4o / GPT-4o-mini |
| Navigation | React Navigation v7 (Native Stack) |
| Storage | AsyncStorage + Expo SecureStore |
| File System | expo-file-system (v2 API) |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app on your device **or** EAS Build for production
- OpenAI API key — get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Installation

```bash
cd CallRecorderPro
npm install
npx expo start
```

Scan the QR code with Expo Go to run on your device.

### Configuration

1. Open the app and tap the **Settings** icon (top right)
2. Paste your OpenAI API key and tap **Save Key**
3. Select your preferred GPT model and transcription language
4. Return to Home and tap the microphone FAB to start recording

## Architecture

```
src/
├── types/          # TypeScript interfaces for CallRecord, Summary, Settings, etc.
├── constants/      # Colors, spacing, OpenAI prompts, recording options
├── services/
│   ├── audioRecorderService.ts    # expo-av recording lifecycle management
│   ├── callDetectionService.ts    # Native call state detection (Android)
│   ├── transcriptionService.ts    # Whisper API integration
│   ├── summaryService.ts          # GPT-4 customer support analysis
│   └── storageService.ts          # Persistent storage (AsyncStorage + SecureStore)
├── hooks/
│   ├── useAudioRecorder.ts        # Recording state + metering hook
│   ├── useCallRecords.ts          # Call list CRUD hook
│   └── useSettings.ts             # App settings hook
├── screens/
│   ├── HomeScreen.tsx             # Call list with stats and FAB
│   ├── RecordingScreen.tsx        # Active recording UI with waveform
│   ├── CallDetailScreen.tsx       # Summary, transcript, and details tabs
│   └── SettingsScreen.tsx         # API key, model, and preferences
└── components/
    ├── WaveformVisualizer.tsx     # Animated audio waveform
    ├── RecordButton.tsx           # Pulsing record/stop button
    ├── CallCard.tsx               # Call list item with sentiment indicator
    ├── SentimentBadge.tsx         # Positive/neutral/negative badge
    ├── EmptyState.tsx             # Empty list placeholder
    └── LoadingOverlay.tsx         # Processing modal with spinner
```

## AI Summary Output

Each analyzed call produces:

```json
{
  "overview": "Customer called regarding a billing discrepancy on their March invoice...",
  "customerIssue": "Overcharge of $24.99 on monthly subscription",
  "resolutionStatus": "resolved",
  "keyPoints": ["Agent identified incorrect promo code application", "Refund processed same-day"],
  "actionItems": ["Send email confirmation of refund within 24 hours"],
  "sentiment": "positive",
  "sentimentScore": 0.78,
  "customerSatisfaction": "Customer expressed satisfaction with quick resolution",
  "tags": ["billing", "refund", "subscription"],
  "agentPerformance": "Professional tone, resolved efficiently within 4 minutes"
}
```

## Platform Notes

### iOS
- Records the user's voice via microphone; background audio enabled via `UIBackgroundModes: audio, voip`
- App Store guidelines prohibit recording the other party without consent — display a disclosure to users
- CallKit integration for true inbound call detection requires an additional native module

### Android
- Requires `RECORD_AUDIO`, `READ_PHONE_STATE` permissions
- `react-native-call-detection` provides call state events for auto-start recording
- Background recording via foreground service in production builds

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas init

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Environment Variables

No environment variables are needed at build time. The OpenAI API key is entered by the user at runtime and stored in the device's secure keychain.

## Legal Notice

Recording phone calls without the consent of all parties may be illegal in your jurisdiction. This application is intended for professional customer support environments where call recording disclosure is made to callers. Always comply with local laws regarding call recording.
