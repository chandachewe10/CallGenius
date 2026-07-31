# CallRecorderPro

A cross-platform mobile application for recording, transcribing, and analyzing customer support phone calls using OpenAI Whisper and GPT-4.

## Features

- **Call Recording** — Automatically records phone calls when they connect; manual recording remains available for meetings
- **AI Transcription** — Uses OpenAI Whisper to convert audio to text with timestamps
- **Smart Summaries** — GPT-4 powered summaries with customer issue detection, resolution status, sentiment analysis, action items, and agent performance insights
- **Call Management** — Browse, search, and manage call history
- **Shared API Key** — OpenAI key configured once in `.env` for all app users
- **Cross-Platform** — iOS and Android support via Expo

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) + TypeScript |
| Audio | `expo-av` |
| Transcription | OpenAI Whisper API (`whisper-1`) |
| Summarization | OpenAI GPT-4o / GPT-4o-mini |
| Navigation | React Navigation v7 (Native Stack) |
| Storage | AsyncStorage + Supabase (optional) |
| Config | `.env` (`EXPO_PUBLIC_OPENAI_API_KEY`) |
| File System | expo-file-system (v2 API) |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app on your device **or** EAS Build for production
- Node.js 18+
- Expo Go app on your device **or** EAS Build for production
- OpenAI API key — get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Installation

```bash
cd CallRecorderPro
npm install
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_OPENAI_API_KEY
npx expo start
```

Scan the QR code with Expo Go to run on your device.

### Configuration

1. Copy `.env.example` to `.env`
2. Set `EXPO_PUBLIC_OPENAI_API_KEY` to your OpenAI API key
3. Restart Expo after changing `.env`: `npx expo start -c`
4. Phone calls are **auto-recorded by default** when they connect (requires a dev/production build with call detection on Android)
5. Use the microphone FAB on Home for **manual recordings** (meetings, notes, etc.)
6. Adjust auto-record, transcription, and GPT model preferences in **Settings**

## Architecture

```
src/
├── types/          # TypeScript interfaces for CallRecord, Summary, Settings, etc.
├── constants/      # Colors, spacing, OpenAI prompts, recording options
├── services/
│   ├── audioRecorderService.ts    # expo-av recording lifecycle management
│   ├── autoCallRecordingService.ts # Background phone call auto-recording
│   ├── recordingProcessorService.ts # Shared transcribe + summarize pipeline
│   ├── callDetectionService.ts    # Native call state detection (Android)
│   ├── transcriptionService.ts    # Whisper API integration
│   ├── summaryService.ts          # GPT-4 customer support analysis
│   └── storageService.ts          # Persistent storage (AsyncStorage)
├── config/
│   └── env.ts                     # Reads EXPO_PUBLIC_OPENAI_API_KEY from .env
├── hooks/
│   ├── useAutoCallRecording.ts    # Enables background auto-recording
│   ├── useAudioRecorder.ts        # Recording state + metering hook
│   ├── useCallRecords.ts          # Call list CRUD hook
│   └── useSettings.ts             # App settings hook
├── screens/
│   ├── HomeScreen.tsx             # Call list with stats and FAB
│   ├── RecordingScreen.tsx        # Active recording UI with waveform
│   ├── CallDetailScreen.tsx       # Summary, transcript, and details tabs
│   └── SettingsScreen.tsx         # Model, auto-record, and preferences
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

Create a `.env` file in the project root (see `.env.example`):

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key-here
EXPO_PUBLIC_LENCO_SECRET_KEY=your-lenco-secret-key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_OPENAI_API_KEY` | Whisper transcription + GPT summaries |
| `EXPO_PUBLIC_LENCO_SECRET_KEY` | Lenco mobile money collections API (Bearer token) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (optional — enables cloud subscriptions) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `EXPO_PUBLIC_LENCO_API_BASE_URL` | Optional — defaults to `https://api.lenco.co/access/v2` |

Do not commit `.env` to git.

> **Note:** `EXPO_PUBLIC_` variables are bundled into the app. For production, rotate keys and monitor usage.

## Payments (Lenco Mobile Money)

Subscriptions are paid via the **Lenco collections API**:

```
POST https://api.lenco.co/access/v2/collections/mobile-money
Authorization: Bearer {LENCO_SECRET_KEY}
```

1. User selects a plan
2. Chooses **Airtel** or **MTN** and enters their phone number
3. App sends the collection request — user approves the prompt on their phone
4. Subscription activates on success (or stays pending until confirmed)

## Supabase (Cloud Backend)

When `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set:

1. Each app install signs in anonymously and syncs subscriptions/payments to Supabase
2. Admin can sign in with a Supabase admin account in **Admin Dashboard → Supabase Cloud**
3. Confirm or revoke payments from any device

### Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in **SQL Editor**
3. Enable **Anonymous sign-ins**: Authentication → Providers → Anonymous
4. Create an admin user (Authentication → Users → Add user)
5. Run `supabase/make-admin.sql` to grant admin access
6. Run `supabase/restore-subscription.sql` so users can restore on a new device
7. Add URL and anon key to `.env`, then restart Expo: `npx expo start -c`

### Admin access

Settings → **Admin Panel** → sign in with your Supabase admin email and password (the account you created in step 4). No per-device PIN is required when Supabase is configured.

### Lost device / new phone

Users can open **Subscription → Restore Subscription** and enter the mobile money phone number used to pay. The active subscription is linked to that number in Supabase and moved to the new device.

## Legal Notice

Recording phone calls without the consent of all parties may be illegal in your jurisdiction. This application is intended for professional customer support environments where call recording disclosure is made to callers. Always comply with local laws regarding call recording.
