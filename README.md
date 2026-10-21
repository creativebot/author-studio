# Author Studio: System Architecture

Author Studio is a voice-first non-fiction writing environment designed for iterative development of original theory and practice with Gemini.

## Directory Structure
- `backend/`: FastAPI / Node API server handling Gemini calls, audio processing, structure graph, and debug snapshot persistence.
  - `debug_snapshots/`: Persistent JSON logs of any unexpected behavior or errors for instant Antigravity inspection.
- `app/`: Cross-platform React Native / Expo client (runs as Web App on desktop/mobile and compiles to Android APK).
  - `components/`: Voice canvas, Sounding Board chat, Diff reviewer, Outline manager, Snapshot trigger.
  - `services/`: Audio recording & chunking, API client, Local state cache.
