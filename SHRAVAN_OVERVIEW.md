# Shravan App Codebase Overview

Shravan is an AI voice-interactive reading platform for children, designed with a focus on Indian cultural grounding and accessibility. It uses AI to track reading progress in real-time and trigger contextual audio effects to enhance the storytelling experience.

## Architecture

The project follows a monorepo structure with a clear separation between the backend and frontend.

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (via Motor for async operations)
- **Core Components:**
    - `server.py`: Contains the entire API logic, including authentication, story management, speech processing, and analytics.
    - **Authentication:** Uses JWT for session management and a mocked OTP system (code `123456`) for verification.
    - **Story Engine:**
        - Parses PDFs using PyMuPDF (`fitz`).
        - Uses LLM (via `emergentintegrations`) for enhancing stories (generating titles, synopses, and extracting audio events).
        - Heuristic fallback for extracting audio events based on keywords.
    - **Speech Processing:**
        - Integrates with OpenAI's Whisper-1 (via Emergent integrations) for audio transcription.
        - Custom matching logic (`speech_match`) that scores transcript similarity, position, and confidence to determine when to advance the story or trigger audio effects.
    - **Analytics:** Tracks reading sessions, duration, words read, and streaks.

### Frontend
- **Framework:** Expo / React Native (TypeScript)
- **Navigation:** `expo-router` with a tab-based layout for students and a dedicated dashboard for teachers.
- **State Management:** `zustand` for authentication and user state.
- **Key Screens:**
    - `Library`: Browse seeded and uploaded stories.
    - `Reader`: The core experience where children read aloud. It handles audio recording in chunks and communicates with the backend for real-time feedback.
    - `Teacher Dashboard`: Allows teachers to manage classes, students, and assignments.
    - `Upload`: Interface for uploading PDFs or creating stories from text.
- **Styling:** Follows a strict 8px grid and a custom "Indian folk-art" aesthetic (no gradients, shadows, or western cartoon tropes).

## Key Features

1.  **AI-Interactive Reading:** Real-time feedback and audio effects (animals, nature, music, etc.) triggered by the child's voice.
2.  **Multilingual Support:** Split sentences logic supports Indian punctuation and characters.
3.  **Educational Tools:** Teacher portal for class management and assignment tracking.
4.  **Story Customization:** Ability to upload PDFs or paste text to generate interactive stories via LLM.
5.  **Gamification:** Streaks and progress tracking to encourage daily reading.
6.  **Subscription Model:** Tiered access (stubbed Razorpay integration) with free story limits.

## Design Philosophy

The app adheres to a specific set of design guidelines:
- **Palette:** Warm, flat colors (Terracotta, Cream, Green) inspired by Indian aesthetics.
- **Typography:** Poppins for headings, Nunito for body text.
- **UI:** No glassmorphism, blur, or shadows. Uses solid color blocks and borders for hierarchy.
- **Accessibility:** Large touch targets (min 44pt) and child-friendly hit areas.

## Development & Testing
- **Backend Tests:** Pytest suite in `backend/tests/` covering auth, stories, speech matching, and sessions.
- **Design Guidelines:** Documented in `design_guidelines.json`.
- **Environment:** Backend configuration via `.env`, frontend via `react-native-dotenv`.
