# AetherVoice AI - Client-Side Voice Chatbot

AetherVoice is a premium, client-side web application voice chatbot powered by **Groq** APIs. It provides a natural conversation experience with extremely low transcription and generation latencies.

## Features

- **Voice-First Input**: Speak naturally by clicking the microphone button or pressing/holding the **Spacebar**.
- **Low-Latency LLM Response**: Powered by Groq Chat Completions (Llama 3.3 / Mixtral models).
- **Text-to-Speech (TTS) Feedback**: Assistant replies are read aloud instantly using the browser's built-in `SpeechSynthesis` API.
- **Secure Key Management**: Your Groq API key is stored locally in your browser's `localStorage` and sent directly to Groq. No backend proxy, no key logs.
- **Robust Fallback UI**: Graceful transition to text chat if microphone permissions are denied or voice devices fail.
- **Premium Dark Aesthetics**: Styled with a beautiful responsive glassmorphism dark theme with hover and active micro-animations.

## Installation & Setup

1. Clone or download this project.
2. Open a terminal in the root of the project directory.
3. Start a local HTTP server to host the static HTML files:
   ```bash
   # Using Python
   python -m http-server 8080

   # Or using Node.js (if npm is installed)
   npx http-server -p 8080
   ```
4. Open your web browser and navigate to `http://localhost:8080`.

## Configurations

1. Click on the **Gear Icon** in the top-right corner to open the Settings Panel.
2. Enter your **Groq API Key** (starts with `gsk_`).
3. Select your preferred **LLM Model** and **Speech Synthesis Voice**.
4. Click **Save Configuration**.

## Keyboard Shortcuts

- **Hold Spacebar**: Record speech while holding, release to stop recording and submit.
- **Spacebar (Click toggle)**: If focus is not inside an input box, press Spacebar to toggle recording start/stop.
- **Enter**: Submits text input when keyboard fallback is active.
