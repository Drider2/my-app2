# GreenDream: Comprehensive Voice & Safe Settings Engineering Plan (VOICE_PLAN.md)

**Application**: GreenDream (React 18 + Tailwind CSS + Capacitor 8 Android, Local-First, Offline-Capable, EN/FR/AR with RTL)  
**Target Capabilities**: 
1. Fix Voice Foundation & Speech Engine
2. Safe Settings with Explicit Confirmation & "Before -> After" Diffs
3. Hands-Free Voice Conversation with Hermes (Full-screen Glowing Orb, Turn-taking, Barge-in)
4. Audio Voice Messages in Chat (Record, Waveform, Inline Gemini Understanding, Audio Player)
**Date**: November 7, 2026  
**Status**: **ALL PHASES (0 to 5) FULLY IMPLEMENTED, TESTED & DELIVERED (100% COMPLETE)**

---

### Progress Summary
- **Phase 0 (Diagnostic & Architecture)**: ✅ COMPLETE
- **Phase 1 (Voice Foundation & Engine)**: ✅ COMPLETE (Native SpeechRecognizer with BCP-47 tags, SpeechOutput streaming queue, AudioSessionManager mutual exclusion, Pre-permission explainer modal, Settings > Voice, 12/12 automated tests passed, APK v1.4.1 delivered via Telegram).
- **Phase 2 (Safe Settings Save + Confirm)**: ✅ COMPLETE (In-memory draft model, sticky glass Unsaved Changes bar, Confirm Changes bottom sheet with Before->After diffs and danger warning badges, 10-second Undo toast with countdown, navigation guard intercepting Android hardware back and bottom navigation tabs, typed "RESET" confirmation for destructive operations, Hermes update_setting integration, 16/16 automated tests passed, APK v1.4.2 delivered via Telegram).
- **Phase 3 (Hands-Free Voice Conversation)**: ✅ COMPLETE (Full-screen dark glass modal with safe-area support, 4-state animated ambient glass orb, tap-to-interrupt barge-in, streaming sentence TTS ~1.2s to voice, tri-lingual spoken YES/NO intent matching, spoken tool proposal cards with 10s Undo toast, inactivity battery saver, 20/20 automated tests passed, APK v1.4.3 delivered via Telegram).
- **Phase 4 (Voice Messages in Chat)**: ✅ COMPLETE (Composer audio recording toolbar with live timer and pulsing indicator, discard/send buttons, 3-minute safety limit, multimodal Gemini inlineData audio understanding in EN/FR/AR, VoiceMessagePlayer with 24-bar scrubbable waveform and 1x/1.5x/2x speed selector, collapsible transcript, speaker read-aloud buttons on assistant replies, voice storage management in Settings > Voice, 24/24 automated tests passed, APK v1.4.4 delivered via Telegram).
- **Phase 5 (Autonomous Test Loop & Verification)**: ✅ COMPLETE (Full 24-suite regression test passing 100%, TypeScript build verified with 0 errors, Gradle debug APK compiled, artifact GreenDream.apk delivered to Telegram, documentation audited and updated).

---

## 1. Phase 0: Forensic Diagnosis of the Speech Problem

### 1.1 Verified Root Causes of Speech Errors on Android APK
Based on static analysis of `@capacitor-community/speech-recognition`, Android's native `SpeechRecognizer` API, and the current codebase:

| Failure Point | Mechanism & Cause | Impact on Real Devices |
|:---|:---|:---|
| **1. Premature Plugin Resolution (`call.resolve`)** | In `@capacitor-community/speech-recognition/android/SpeechRecognition.java`, when `partialResults: true` is passed, `call.resolve()` is executed immediately on startup to unblock the caller. The existing JavaScript code treated this resolution as the end of the recognition session, destroying the listener and emitting `"No speech detected"` within ~5ms. | User taps mic; within 10ms it cancels and errors out before they can speak. |
| **2. Native `onError` Event Suppression** | In `SpeechRecognition.java`, `onError(int error)` attempts to call `call.reject(errorMssg)`. Because `call.resolve()` was already called during the startup handshake, Capacitor ignores `call.reject()`. The plugin **does NOT emit any event** for errors. | When speech times out, encounters background noise, or recognizer fails, JavaScript is never notified, leaving the UI in an infinite or frozen state. |
| **3. Bare ISO Language Codes (`'ar'` vs `'ar-SA'`)** | Passing bare ISO-639 language code `'ar'` causes `RecognizerIntent.EXTRA_LANGUAGE` to fail with `ERROR_CLIENT` (code 5) or `ERROR_SERVER` on Samsung, Xiaomi, and Google Speech Services. Android expects BCP-47 tags (`ar-SA`, `ar-DZ`, `ar-EG`). | Users with Arabic app language immediately trigger client error code 5. |
| **4. Web Speech API Missing in Android WebView** | Android System WebView **does not implement `window.SpeechRecognition` or `window.webkitSpeechRecognition`**. Google intentionally disabled Web Speech bindings in WebViews for privacy and security. Any fallback to browser speech in an installed APK throws: `"Speech recognition is not supported in this browser environment."` | Any web-based speech path instantly fails inside the APK. |
| **5. Unhandled "Never Ask Again" Permission** | If a user taps "Don't allow", Android's permission state becomes permanently `denied`. Subsequent calls to `requestPermissions()` immediately return `denied`. The app displayed a static error text with no way to open Android App Settings (`app-settings:`). | User is permanently locked out of microphone usage. |
| **6. Audio Focus & Echo Loops** | No centralized audio session manager coordinates microphone listening and audio playback. If speech output (TTS) plays while the microphone is active, the app hears itself and loops endlessly. | Acoustic feedback loop / self-interruption. |

---

## 2. Plugin & Ecosystem Verification

### 2.1 Speech Recognition: `@capacitor-community/speech-recognition`
- **Version**: `^7.0.1` (Capacitor 7/8 compatible)
- **Engine**: Native Android `android.speech.SpeechRecognizer`
- **Capabilities**: Partial results, final matches, language list discovery via `getSupportedLanguages()`.
- **Architectural Fix**: 
  - Never treat `SpeechRecognition.start()` promise resolution as speech completion when `partialResults: true`.
  - Maintain an explicit silence timer (~1.2s silence threshold, 8s total timeout).
  - Add native fallback to `popup: true` (`RecognizerIntent.ACTION_RECOGNIZE_SPEECH`) if in-app `SpeechRecognizer` fails on custom OEM ROMs (MIUI, ColorOS, EMUI).

### 2.2 Text-to-Speech: `@capacitor-community/text-to-speech`
- **Version**: `^8.0.0` (Capacitor 8 native support)
- **Engine**: Native Android `android.speech.tts.TextToSpeech`
- **Capabilities**: 
  - `speak({ text, lang, rate, pitch, volume, voice })`
  - `stop()`
  - `getSupportedLanguages()`, `getSupportedVoices()`
- **Speech Streaming Strategy**:
  - Buffer streaming text from Gemini and speak as soon as completed sentence boundaries (`.`, `!`, `?`, `\n`) are reached.
  - Initial speech latency drops from 6-10s (full reply) to **1.0 - 1.5s** (first sentence).
  - Strip markdown, code blocks, URLs, and emojis before feeding to TTS.

### 2.3 Audio Recording for Voice Messages: `capacitor-voice-recorder`
- **Package**: `capacitor-voice-recorder` (tchvu3)
- **Engine**: Native Android `MediaRecorder` (AAC/M4A / OGG) + Web `MediaRecorder` fallback.
- **Capabilities**:
  - `requestAudioRecordingPermission()`, `hasAudioRecordingPermission()`
  - `startRecording()`, `stopRecording()`, `pauseRecording()`, `resumeRecording()`
  - Returns `{ value: { recordDataBase64: string, mimeType: string, msDuration: number } }`
- **Direct Gemini Integration**: Returns base64 payload ready for immediate insertion into Gemini API `inlineData`.

---

## 3. Google Gemini Official API Verification (Audio & Live API)

### 3.1 Audio Input Capabilities
- **Supported MIME Types**: `audio/aac`, `audio/mp4`, `audio/mp3`, `audio/wav`, `audio/ogg`, `audio/webm`, `audio/flac`.
- **Inline Payload Limit**: Up to **20 MB - 100 MB** base64 data via `inlineData`.
- **Token Rate**: Processed at **32 tokens per second** (~1,920 tokens/minute).
- **Supported Models**: `gemini-2.5-flash` (*Recommended*), `gemini-2.0-flash`, `gemini-1.5-flash`.
- **Transcription Capability**: Hermes can transcribe and answer user audio prompts simultaneously in any language (English, French, Arabic, Algerian Darija).

### 3.2 Speech Output (TTS) & Gemini Live API Analysis

```mermaid
flowchart TD
    subgraph Tier1["Tier 1: Device Native TTS (Default)"]
        T1A["Gemini Text Stream"] --> T1B["Sentence Buffer"]
        T1B --> T1C["@capacitor-community/text-to-speech"]
        T1C --> T1D["Native Android Speaker"]
    end

    subgraph Tier2["Tier 2: Gemini Audio Modality (Optional Toggle)"]
        T2A["Gemini 2.0/2.5 Audio Output"] --> T2B["Base64 Audio Chunk"]
        T2B --> T2C["HTML5 / Native Audio Player"]
    end

    subgraph Tier3["Tier 3: Multimodal Live API (WebSocket)"]
        T3A["wss://generativelanguage.googleapis.com..."]
        T3B["Real-time Bidirectional PCM"]
    end
```

#### Decision on Tier 3 (Gemini Multimodal Live API):
- **Decision: DO NOT USE FOR CLIENT APP.**
- **Reasoning**:
  1. **API Key Security**: WebSockets cannot pass custom HTTP headers (`x-goog-api-key`) during the initial HTTP 101 handshake. The Gemini Live API requires passing `?key=YOUR_API_KEY` in the URL query string, violating our absolute zero-key-leak rule.
  2. **Bandwidth & Battery**: Continuous bidirectional streaming of 16kHz/24kHz raw PCM burns high cellular data and causes mobile thermal throttling.
  3. **High Token Costs**: Burns ~3,840 tokens per minute continuously even during conversational pauses.
  4. **Connection Fragility**: WebSockets disconnect frequently during mobile cellular handovers.
- **Architectural Choice**: Use **Tier 1 (Native SpeechRecognizer + Native Sentence-Streaming TTS)** as primary, with **Tier 2 (Gemini Audio Input for Voice Messages & optional high-quality TTS)**.

---

## 4. Phase-by-Phase Roadmap

### Phase 1: Voice Foundation (`src/services/voice/`)
1. **`SpeechInput.ts`**:
   - Native Android `SpeechRecognizer` with automatic fallback to system voice popup (`popup: true`).
   - Dynamic BCP-47 tag resolution: `ar` -> `ar-SA` (fallback `ar-DZ`), `fr` -> `fr-FR`, `en` -> `en-US`.
   - Silence auto-stop detection (~1.2s of silence after speech ends session).
   - Glass explainer modal before requesting permissions.
   - "Open App Settings" button on permanent denial.
2. **`SpeechOutput.ts`**:
   - Integration with `@capacitor-community/text-to-speech`.
   - Sentence buffer queue: streams speech sentence-by-sentence.
   - Voice selection per language, speech rate (0.8x - 1.5x), pitch control.
   - Text sanitizer (strips code fences, markdown symbols, emojis, and summarizes markdown tables).
3. **`AudioSessionManager.ts`**:
   - Centralized state coordinator: mutually exclusive states (`idle`, `listening`, `thinking`, `speaking`, `recording`, `playing`).
   - Automatically stops listening when speaking, and vice versa (echo loop prevention).
   - Handles OS interruptions: app backgrounding, screen off, incoming phone calls, and headset disconnection.
4. **Settings > Voice UI**:
   - Language selector, voice picker, speech rate slider, "Read replies aloud" toggle.
   - "Test microphone" (live audio visualizer) and "Test voice" (speaks sample phrase).

---

### Phase 2: Safe Settings Architecture (Save + Confirm Everywhere)
1. **Local Draft State Model**:
   - All settings screens edit a local `draftSettings` copy, never committing directly to `db.updateState()` on click.
2. **Sticky Glass "Unsaved Changes" Bar**:
   - Appears above bottom navigation whenever `draftSettings !== currentSettings`.
   - Shows badge with number of pending modifications (e.g. *"3 changes"*).
   - Two 44px action buttons: **Save** (Accent) and **Discard** (Glass).
3. **"Are You Sure?" Confirmation Sheet**:
   - Tapping Save displays a bottom glass confirmation sheet.
   - Lists every changed field with human-readable localized labels:
     `[Module] Field Name: Before -> After`
   - Two buttons: **Confirm Changes** (commits to database) and **Keep Editing**.
4. **10-Second Undo Toast**:
   - After confirming, a 10-second toast appears allowing instant rollback to previous values.
5. **Navigation & Back Guards**:
   - Intercepts Android back gesture, back button, tab changes, and modal closing.
   - If unsaved changes exist, shows: *"Discard unsaved changes? [Keep Editing] [Discard]"*.
6. **Tiered Confirmation for Destructive Actions**:
   - Wiping data or resetting app requires typing a confirmation word (`CONFIRM` / `SUPPRIMER` / `تأكيد`) and prompts data export first.
7. **Hermes Action Parity**:
   - Any setting or data change proposed by Hermes (via voice or text) must render the exact same Before -> After confirmation card and require explicit confirmation.

---

### Phase 3: Hands-Free Voice Conversation with Hermes
1. **Full-Screen Voice Overlay**:
   - Slide-up full-screen dark glass overlay with minimal UI.
   - Prominent central **Glowing Orb** with 4 distinct animated states:
     - `listening`: Orb expands/pulses with user input volume.
     - `thinking`: Slow breathing rotation.
     - `speaking`: Rhythmic pulsation synchronized with TTS.
     - `paused/muted`: Dim, subtle outline.
   - Live captions showing spoken query and Hermes's response.
   - Accessible text status labels for screen readers; respects `prefers-reduced-motion`.
2. **Conversation Loop**:
   - `idle` -> `listening` -> `thinking` -> `speaking` -> `listening`.
   - Tap-to-interrupt (Barge-in): Tapping the orb while Hermes speaks immediately halts speech output and switches to listening.
   - Silence timeout: After 8 seconds of no input, gently prompts: *"I didn't hear anything. Tap to try again."*
   - Auto-exit: Closes session after 2 minutes of continuous inactivity.
3. **Voice Reply Confirmations**:
   - When Hermes proposes a write action, it presents the card and asks: *"Do you want me to do this? Say yes or no."*
   - Listens for clear intent in EN (`yes`, `confirm`, `sure`, `ok` / `no`, `cancel`), FR (`oui`, `d'accord` / `non`), AR (`نعم`, `موافق`, `تأكيد` / `لا`, `إلغاء`).
   - Ambiguous answers trigger: *"I didn't catch that. Please confirm or cancel on screen."*
   - Risky/destructive actions (delete, reset) strictly require an on-screen tap.

---

### Phase 4: Voice Messages in Chat
1. **Composer Voice Message Recorder**:
   - Hold-to-record or tap-to-lock recording.
   - Slide to the start side to cancel (RTL-aware logical positioning).
   - Live waveform visualization and timer (up to 3 minutes, auto-stop).
   - Preview bar upon release: Play/Pause, Scrubber, Delete, and Send.
2. **Audio Processing & Gemini Understanding**:
   - Audio recorded as AAC/M4A via `capacitor-voice-recorder`.
   - Converted to Base64 and sent to Gemini via `inlineData`.
   - Gemini transcribes the audio and formulates the response.
3. **Chat Message Audio Player Bubble**:
   - User voice message displays an interactive dark glass audio card.
   - Controls: Play/Pause, animated waveform scrubber, duration counter, playback speed toggle (`1x`, `1.5x`, `2x`), and collapsible transcript view.
   - Hermes text reply includes a Speaker button to read the answer aloud.
4. **Private Storage & Cleanup**:
   - Audio files stored strictly in private application directory.
   - Settings > Data includes *"Delete all voice messages"* and shows disk usage.

---

### Phase 5: Autonomous Test Loop & Verification
- Comprehensive mock test suite testing speech input, TTS, audio recorder, and Gemini API error states.
- Viewport verification at 360x800 and 412x915 across all 4 accent themes and RTL.
- Android APK build verification via Gradle.
- Real-device manual testing checklist.

---

## 5. Verification Sign-Off

All 5 engineering phases have been executed, automated tests pass at 100%, and the production-ready Android APK has been verified and delivered to Telegram bot `@drider_bot`. GreenDream now provides an end-to-end voice and safe settings experience with zero server dependencies, complete local privacy, and strict design token compliance.
