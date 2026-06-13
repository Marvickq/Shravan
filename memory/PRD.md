# Shravan PRD (MVP)

## Vision
Shravan is an AI-powered voice-interactive reading platform for Indian children. The child reads aloud — the app listens and triggers immersive audio events (animal calls, weather, music, festivals) at the right moment in the story. This is NOT an audiobook; reading is always child-driven.

## MVP Scope (this build)
- Parent mobile app (React Native Expo SDK 54)
- JWT email/password authentication with **mocked OTP** (code `123456`)
- Seeded sample stories (Brave Tiger of Sundarbans, Diwali Lamps for Meena, Elephant and the River)
- PDF upload → PyMuPDF text extraction → LLM (Claude Sonnet via Emergent universal key) story segmentation and audio-event detection
- Manual text → story conversion as fallback
- Real-time speech tracking: expo-audio records 4s chunks → OpenAI Whisper transcription → MatchScore = TextSimilarity*0.5 + PositionScore*0.3 + Confidence*0.2; trigger event when score ≥ 0.75
- Confidence-based reader behaviour (advance / continue / pause) per spec
- Reading analytics: minutes, words, streak, last-7-day chart, stories finished
- Family-scoped content (per-user visibility, plus system-seeded public stories)
- Light + dark mode, Indian folk-art flat aesthetic from `/app/design_guidelines.json`

## Deferred (NOT in this build)
- School + Admin portals (mobile app focuses on Parent role)
- Razorpay billing, WhatsApp/Interakt, Firebase FCM push
- AWS S3 storage, AWS SNS OTP (mocked), ClickHouse, Typesense
- WatermelonDB offline sync (basic AsyncStorage hydration only)
- Azure Speech SDK (replaced with OpenAI Whisper)
- TODO: Audio asset library for actual sound playback during events
  (currently shown as a visual chip — pending sound asset CDN)

## Architecture
- **Frontend**: Expo Router file-based routes, Zustand auth store, AsyncStorage persistence, expo-audio for mic, expo-document-picker for PDF
- **Backend**: FastAPI + Motor (MongoDB), PyMuPDF, emergentintegrations (Claude), OpenAI SDK pointed at Emergent endpoint (Whisper)
- **Auth**: bcrypt + JWT (HS256, 30d expiry)

## Key API endpoints (all prefixed `/api`)
- `POST /auth/signup`, `/auth/verify-otp`, `/auth/login`, `GET /auth/me`
- `GET /stories`, `GET /stories/{id}`, `POST /stories/upload-pdf`, `POST /stories/create-from-text`
- `POST /speech/transcribe` (multipart audio), `POST /speech/match`
- `POST /sessions/progress`, `GET /sessions/analytics`
- `GET /children`, `POST /children`

## Acceptance against original spec (status)
1. Parent uploads PDF → ✅ (PyMuPDF + LLM)
2. PDF becomes structured JSON → ✅ (sentences + audio_events)
3. Child reads aloud → ✅ (mic recording loop)
4. Speech identifies sentence → ✅ (similarity + position + confidence)
5. Audio events trigger → ✅ (visual chip; real audio assets = TODO)
6. Progress saves locally and remotely → ✅ (remote MongoDB)
7. Offline mode → ⚠️ partial (AsyncStorage cache only)
8. Parent analytics update → ✅
9. School analytics → ❌ deferred
10. Payments → ❌ deferred
11. Notifications → ❌ deferred
12. RBAC restrictions → ✅ (family-scoped via owner_user_id)
13. Uploaded books private → ✅
14. Production deploy → use Emergent "Publish" button
