"""
Shravan Backend - AI Voice-Interactive Reading Platform
FastAPI + MongoDB
"""
import os
import json
import re
import uuid
import base64
import logging
import asyncio
import tempfile
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, List, Optional

import bcrypt
import jwt
import fitz  # PyMuPDF
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

# ----------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("shravan")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 30  # 30 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Shravan API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ----------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = "parent"  # parent | school | admin


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class OtpVerifyBody(BaseModel):
    email: EmailStr
    code: str


class ChildCreate(BaseModel):
    name: str
    age: int
    avatar_seed: Optional[str] = None


class AudioEvent(BaseModel):
    id: str
    sentence_index: int
    event_type: str  # animal|bird|weather|nature|music|festival|emotion|horror|character_voice
    keyword: str
    label: str  # human readable, e.g. "Tiger roar"


class StorySentence(BaseModel):
    index: int
    text: str


class Story(BaseModel):
    id: str
    title: str
    synopsis: str
    cover_color: str
    sentences: List[StorySentence]
    audio_events: List[AudioEvent]
    owner_user_id: Optional[str] = None  # None = system seed
    visibility: str = "private"  # private | family | school | system
    created_at: str
    word_count: int
    estimated_minutes: int


class SpeechMatchBody(BaseModel):
    story_id: str
    sentence_index: int
    transcript: str
    confidence: float = 0.85


class ReadingProgressBody(BaseModel):
    story_id: str
    child_id: Optional[str] = None
    sentences_completed: int
    duration_seconds: int
    words_read: int
    finished: bool = False


# ----------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ----------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------
@api.post("/auth/signup")
async def signup(body: SignupBody):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "role": body.role,
        "password": hash_password(body.password),
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    # OTP is MOCKED — always "123456"
    return {
        "user_id": user_id,
        "email": body.email.lower(),
        "otp_sent": True,
        "mock_otp": "123456",
    }


@api.post("/auth/verify-otp")
async def verify_otp(body: OtpVerifyBody):
    if body.code != "123456":
        raise HTTPException(400, "Invalid OTP")
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"verified": True}}
    )
    user.pop("password", None)
    user["verified"] = True
    return {"token": make_token(user["id"]), "user": user}


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    user.pop("_id", None)
    user.pop("password", None)
    return {"token": make_token(user["id"]), "user": user}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ----------------------------------------------------------------------
# Children
# ----------------------------------------------------------------------
@api.get("/children")
async def list_children(user=Depends(current_user)):
    cursor = db.children.find({"parent_id": user["id"]}, {"_id": 0})
    return await cursor.to_list(100)


@api.post("/children")
async def create_child(body: ChildCreate, user=Depends(current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "parent_id": user["id"],
        "name": body.name,
        "age": body.age,
        "avatar_seed": body.avatar_seed or body.name,
        "level": 1,
        "streak_days": 0,
        "stories_completed": 0,
        "total_minutes_read": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.children.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------
# Story parsing helpers
# ----------------------------------------------------------------------
SAMPLE_AUDIO_LIBRARY = {
    "animal": ["tiger", "lion", "elephant", "monkey", "cow", "dog", "cat", "horse"],
    "bird": ["peacock", "parrot", "crow", "sparrow", "owl", "cuckoo"],
    "weather": ["rain", "thunder", "storm", "wind", "snow"],
    "nature": ["river", "ocean", "forest", "waterfall", "leaves"],
    "music": ["flute", "drum", "tabla", "song", "music", "dance"],
    "festival": ["diwali", "holi", "eid", "pongal", "festival", "fireworks"],
    "emotion": ["laugh", "cry", "shout", "whisper", "scream"],
    "horror": ["ghost", "haunt", "scream", "dark"],
    "character_voice": ["said", "shouted", "whispered", "asked"],
}

# CDN audio URLs for each event type (CC0 / royalty free hotlinks).
# These can be swapped freely; the player gracefully handles failures.
EVENT_AUDIO_URLS: dict[str, str] = {
    "animal": "https://cdn.pixabay.com/download/audio/2022/03/24/audio_d0c6ff1ecf.mp3",
    "bird": "https://cdn.pixabay.com/download/audio/2022/02/15/audio_5d34cae3f3.mp3",
    "weather": "https://cdn.pixabay.com/download/audio/2022/03/10/audio_9f532e7c1f.mp3",
    "nature": "https://cdn.pixabay.com/download/audio/2022/10/30/audio_4f2c6c8de9.mp3",
    "music": "https://cdn.pixabay.com/download/audio/2023/01/06/audio_da4ec19b67.mp3",
    "festival": "https://cdn.pixabay.com/download/audio/2022/10/16/audio_d1718bb6f6.mp3",
    "emotion": "https://cdn.pixabay.com/download/audio/2022/03/24/audio_07b2818b8d.mp3",
    "horror": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_d9d6e2a0e3.mp3",
    "character_voice": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749aa75.mp3",
}


def split_sentences(text: str) -> List[str]:
    # Simple sentence splitter that respects Indian punctuation.
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[\.!?])\s+(?=[A-Z\u0900-\u097F])", text)
    return [p.strip() for p in parts if len(p.strip()) > 2]


def heuristic_audio_events(sentences: List[str]) -> List[dict]:
    events = []
    for idx, s in enumerate(sentences):
        s_low = s.lower()
        for event_type, keywords in SAMPLE_AUDIO_LIBRARY.items():
            for kw in keywords:
                if re.search(rf"\b{kw}\b", s_low):
                    events.append(
                        {
                            "id": str(uuid.uuid4()),
                            "sentence_index": idx,
                            "event_type": event_type,
                            "keyword": kw,
                            "label": f"{kw.title()} {event_type}",
                            "audio_url": EVENT_AUDIO_URLS.get(event_type),
                        }
                    )
                    break
    return events


async def llm_enhance_story(raw_text: str, sentences: List[str]) -> dict:
    """Try LLM-based title/synopsis/event extraction; fall back gracefully."""
    fallback = {
        "title": sentences[0][:60] if sentences else "Untitled Story",
        "synopsis": " ".join(sentences[:2])[:200] if sentences else "",
        "audio_events": heuristic_audio_events(sentences),
    }
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"story-{uuid.uuid4()}",
            system_message=(
                "You are a children's story editor for an Indian reading app. "
                "Given a story, return strict JSON with keys: title (string, max 60 chars), "
                "synopsis (string, max 220 chars), audio_events (array of objects with "
                "sentence_index:int, event_type:one of "
                "[animal,bird,weather,nature,music,festival,emotion,horror,character_voice], "
                "keyword:string, label:string). "
                "Only include events that are clearly implied by the sentence text. "
                "Return ONLY raw JSON, no markdown."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")
        numbered = "\n".join(f"[{i}] {s}" for i, s in enumerate(sentences[:60]))
        msg = UserMessage(text=f"Sentences:\n{numbered}")
        resp = await chat.send_message(msg)
        text = resp if isinstance(resp, str) else str(resp)
        text = re.sub(r"```(?:json)?", "", text).strip("` \n")
        data = json.loads(text)
        for ev in data.get("audio_events", []):
            ev["id"] = str(uuid.uuid4())
            ev["audio_url"] = EVENT_AUDIO_URLS.get(ev.get("event_type", ""))
        return {
            "title": data.get("title") or fallback["title"],
            "synopsis": data.get("synopsis") or fallback["synopsis"],
            "audio_events": data.get("audio_events") or fallback["audio_events"],
        }
    except Exception as e:
        logger.warning("LLM enhance failed: %s", e)
        return fallback


def color_palette_pick(seed: str) -> str:
    colors = ["#D85A30", "#BA7517", "#3B6D11", "#4A6E78", "#8C3A1F", "#2A2A28"]
    return colors[sum(ord(c) for c in seed) % len(colors)]


# ----------------------------------------------------------------------
# Story endpoints
# ----------------------------------------------------------------------
async def visible_stories_query(user: dict) -> dict:
    return {
        "$or": [
            {"visibility": "system"},
            {"owner_user_id": user["id"]},
        ]
    }


@api.get("/stories")
async def list_stories(user=Depends(current_user)):
    cursor = db.stories.find(await visible_stories_query(user), {"_id": 0})
    items = await cursor.to_list(200)
    # Strip sentences from list view for size; keep counts
    out = []
    for s in items:
        out.append(
            {
                **{k: v for k, v in s.items() if k != "sentences"},
                "sentence_count": len(s.get("sentences", [])),
            }
        )
    return out


@api.get("/stories/{story_id}")
async def get_story(story_id: str, user=Depends(current_user)):
    story = await db.stories.find_one(
        {"id": story_id, **(await visible_stories_query(user))}, {"_id": 0}
    )
    if not story:
        raise HTTPException(404, "Story not found")
    return story


@api.post("/stories/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user=Depends(current_user),
):
    content = await file.read()
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        raw_text = "\n".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        raise HTTPException(400, f"Could not read PDF: {e}")

    sentences = split_sentences(raw_text)
    if len(sentences) < 2:
        raise HTTPException(400, "Could not extract readable text from this PDF")

    enhance = await llm_enhance_story(raw_text, sentences)
    story_id = str(uuid.uuid4())
    story = {
        "id": story_id,
        "title": enhance["title"],
        "synopsis": enhance["synopsis"],
        "cover_color": color_palette_pick(story_id),
        "sentences": [{"index": i, "text": s} for i, s in enumerate(sentences)],
        "audio_events": enhance["audio_events"],
        "owner_user_id": user["id"],
        "visibility": "private",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "word_count": sum(len(s.split()) for s in sentences),
        "estimated_minutes": max(1, sum(len(s.split()) for s in sentences) // 120),
        "source": "pdf",
    }
    await db.stories.insert_one(story)
    story.pop("_id", None)
    return story


@api.post("/stories/create-from-text")
async def create_from_text(payload: dict, user=Depends(current_user)):
    title = payload.get("title", "My Story")
    body = payload.get("text", "")
    sentences = split_sentences(body)
    if len(sentences) < 2:
        raise HTTPException(400, "Please provide a longer story")
    enhance = await llm_enhance_story(body, sentences)
    story_id = str(uuid.uuid4())
    story = {
        "id": story_id,
        "title": title or enhance["title"],
        "synopsis": enhance["synopsis"],
        "cover_color": color_palette_pick(story_id),
        "sentences": [{"index": i, "text": s} for i, s in enumerate(sentences)],
        "audio_events": enhance["audio_events"],
        "owner_user_id": user["id"],
        "visibility": "private",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "word_count": sum(len(s.split()) for s in sentences),
        "estimated_minutes": max(1, sum(len(s.split()) for s in sentences) // 120),
        "source": "manual",
    }
    await db.stories.insert_one(story)
    story.pop("_id", None)
    return story


# ----------------------------------------------------------------------
# Speech tracking
# ----------------------------------------------------------------------
def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", s.lower()).strip()


def text_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


@api.post("/speech/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    user=Depends(current_user),
):
    """Use OpenAI Whisper-1 via Emergent universal key."""
    audio_bytes = await file.read()
    transcript = ""
    confidence = 0.7
    try:
        # Use openai-compatible interface via litellm under emergentintegrations.
        # The emergentintegrations library doesn't expose whisper directly,
        # so we use the OpenAI SDK pointing at the integrations endpoint.
        from openai import OpenAI

        oai = OpenAI(
            api_key=EMERGENT_LLM_KEY,
            base_url="https://integrations.emergentagent.com/llm",
        )
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        with open(tmp_path, "rb") as af:
            result = oai.audio.transcriptions.create(
                model="whisper-1",
                file=af,
            )
        transcript = (getattr(result, "text", "") or "").strip()
        confidence = 0.9 if transcript else 0.0
        os.unlink(tmp_path)
    except Exception as e:
        logger.warning("Whisper transcription failed: %s", e)
        # Allow the client to keep going via mocked transcript fallback.
        transcript = ""
        confidence = 0.0
    return {"transcript": transcript, "confidence": confidence}


@api.post("/speech/match")
async def speech_match(body: SpeechMatchBody, user=Depends(current_user)):
    """Score whether the child has read the expected sentence.

    MatchScore = TextSimilarity*0.5 + PositionScore*0.3 + ConfidenceScore*0.2
    Trigger audio event when score >= 0.75.
    """
    story = await db.stories.find_one({"id": body.story_id}, {"_id": 0})
    if not story:
        raise HTTPException(404, "Story not found")
    sentences = story.get("sentences", [])
    if body.sentence_index < 0 or body.sentence_index >= len(sentences):
        raise HTTPException(400, "Sentence index out of range")
    expected = sentences[body.sentence_index]["text"]
    sim = text_similarity(body.transcript, expected)

    # Position score: how much of the transcript "covers" the expected sentence
    exp_words = normalize(expected).split()
    got_words = normalize(body.transcript).split()
    overlap = len(set(exp_words) & set(got_words))
    position = min(1.0, overlap / max(1, len(exp_words)))

    conf = max(0.0, min(1.0, body.confidence))
    match_score = sim * 0.5 + position * 0.3 + conf * 0.2
    advance = match_score >= 0.6  # advance if reasonable
    trigger = match_score >= 0.75

    # Find audio event at this sentence index to trigger
    next_event = None
    if trigger:
        for ev in story.get("audio_events", []):
            if ev["sentence_index"] == body.sentence_index:
                next_event = ev
                break

    # Behaviour based on confidence buckets per spec
    if conf >= 0.85:
        behaviour = "advance_immediately"
    elif conf >= 0.70:
        behaviour = "advance_normal"
    elif conf >= 0.50:
        behaviour = "continue_listening"
        advance = False
    else:
        behaviour = "pause_progression"
        advance = False
        trigger = False
        next_event = None

    return {
        "match_score": round(match_score, 3),
        "text_similarity": round(sim, 3),
        "position_score": round(position, 3),
        "confidence_score": round(conf, 3),
        "advance": advance,
        "trigger_event": trigger,
        "behaviour": behaviour,
        "audio_event": next_event,
        "expected": expected,
    }


# ----------------------------------------------------------------------
# Reading sessions / analytics
# ----------------------------------------------------------------------
@api.post("/sessions/progress")
async def save_progress(body: ReadingProgressBody, user=Depends(current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "child_id": body.child_id,
        "story_id": body.story_id,
        "sentences_completed": body.sentences_completed,
        "duration_seconds": body.duration_seconds,
        "words_read": body.words_read,
        "finished": body.finished,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reading_sessions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/sessions/analytics")
async def analytics(user=Depends(current_user)):
    cursor = db.reading_sessions.find({"user_id": user["id"]}, {"_id": 0})
    items = await cursor.to_list(500)
    total_minutes = sum(i["duration_seconds"] for i in items) // 60
    total_words = sum(i["words_read"] for i in items)
    stories_finished = len({i["story_id"] for i in items if i["finished"]})
    # Last 7 days bar chart
    today = datetime.now(timezone.utc).date()
    days = []
    for d in range(6, -1, -1):
        day = today - timedelta(days=d)
        secs = sum(
            i["duration_seconds"]
            for i in items
            if i["created_at"][:10] == day.isoformat()
        )
        days.append({"date": day.isoformat(), "minutes": secs // 60})
    streak = 0
    for entry in reversed(days):
        if entry["minutes"] > 0:
            streak += 1
        else:
            break
    return {
        "total_minutes": total_minutes,
        "total_words": total_words,
        "stories_finished": stories_finished,
        "streak_days": streak,
        "last_7_days": days,
        "session_count": len(items),
    }


# ----------------------------------------------------------------------
# Subscriptions (stubbed — Razorpay keys not provided yet)
# ----------------------------------------------------------------------
FREE_STORY_LIMIT = 3


async def is_premium(user_id: str) -> bool:
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "premium_until": 1})
    if not u:
        return False
    until = u.get("premium_until")
    if not until:
        return False
    try:
        return datetime.fromisoformat(until.replace("Z", "+00:00")) > datetime.now(timezone.utc)
    except Exception:
        return False


async def finished_story_count(user_id: str) -> int:
    cursor = db.reading_sessions.find(
        {"user_id": user_id, "finished": True}, {"_id": 0, "story_id": 1}
    )
    items = await cursor.to_list(500)
    return len({i["story_id"] for i in items})


@api.get("/subscriptions/status")
async def subscription_status(user=Depends(current_user)):
    premium = await is_premium(user["id"])
    finished = await finished_story_count(user["id"])
    return {
        "premium": premium,
        "free_story_limit": FREE_STORY_LIMIT,
        "stories_finished": finished,
        "stories_remaining": max(0, FREE_STORY_LIMIT - finished) if not premium else None,
        "locked": (not premium) and finished >= FREE_STORY_LIMIT,
        "plans": [
            {"id": "monthly", "label": "Monthly", "amount_inr": 199, "interval": "month"},
            {"id": "yearly", "label": "Yearly", "amount_inr": 1499, "interval": "year"},
        ],
        "provider": "razorpay-stub",
    }


@api.post("/subscriptions/start")
async def subscription_start(payload: dict, user=Depends(current_user)):
    plan = payload.get("plan_id", "monthly")
    months = 12 if plan == "yearly" else 1
    until = datetime.now(timezone.utc) + timedelta(days=30 * months)
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "premium_until": until.isoformat(),
                "premium_plan": plan,
                "premium_started_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {
        "ok": True,
        "premium_until": until.isoformat(),
        "plan": plan,
        "note": "Stubbed payment — wire Razorpay keys to enable real checkout.",
    }


# ----------------------------------------------------------------------
# Classes & Assignments (teacher role)
# ----------------------------------------------------------------------
class ClassCreate(BaseModel):
    name: str
    grade: Optional[str] = None


class StudentAddBody(BaseModel):
    name: str
    email: Optional[EmailStr] = None


class AssignmentBody(BaseModel):
    story_id: str
    due_date: Optional[str] = None


def require_teacher(user: dict) -> None:
    if user.get("role") != "teacher":
        raise HTTPException(403, "Teacher role required")


@api.get("/classes")
async def list_classes(user=Depends(current_user)):
    require_teacher(user)
    cursor = db.classes.find({"teacher_id": user["id"]}, {"_id": 0})
    return await cursor.to_list(100)


@api.post("/classes")
async def create_class(body: ClassCreate, user=Depends(current_user)):
    require_teacher(user)
    doc = {
        "id": str(uuid.uuid4()),
        "teacher_id": user["id"],
        "name": body.name,
        "grade": body.grade,
        "students": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.classes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/classes/{class_id}")
async def get_class(class_id: str, user=Depends(current_user)):
    require_teacher(user)
    cls = await db.classes.find_one(
        {"id": class_id, "teacher_id": user["id"]}, {"_id": 0}
    )
    if not cls:
        raise HTTPException(404, "Class not found")
    # attach assignments
    assignments = await db.assignments.find(
        {"class_id": class_id}, {"_id": 0}
    ).to_list(100)
    cls["assignments"] = assignments
    return cls


@api.post("/classes/{class_id}/students")
async def add_student(class_id: str, body: StudentAddBody, user=Depends(current_user)):
    require_teacher(user)
    cls = await db.classes.find_one({"id": class_id, "teacher_id": user["id"]})
    if not cls:
        raise HTTPException(404, "Class not found")
    student = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": (body.email or "").lower() or None,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.classes.update_one(
        {"id": class_id}, {"$push": {"students": student}}
    )
    return student


@api.post("/classes/{class_id}/assignments")
async def create_assignment(
    class_id: str, body: AssignmentBody, user=Depends(current_user)
):
    require_teacher(user)
    cls = await db.classes.find_one({"id": class_id, "teacher_id": user["id"]})
    if not cls:
        raise HTTPException(404, "Class not found")
    story = await db.stories.find_one({"id": body.story_id})
    if not story:
        raise HTTPException(404, "Story not found")
    doc = {
        "id": str(uuid.uuid4()),
        "class_id": class_id,
        "story_id": body.story_id,
        "story_title": story.get("title", ""),
        "due_date": body.due_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assignments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/classes/{class_id}/analytics")
async def class_analytics(class_id: str, user=Depends(current_user)):
    require_teacher(user)
    cls = await db.classes.find_one({"id": class_id, "teacher_id": user["id"]})
    if not cls:
        raise HTTPException(404, "Class not found")
    students = cls.get("students", [])
    # Aggregate session stats by matching student email -> user id
    emails = [s.get("email") for s in students if s.get("email")]
    user_map: dict[str, dict] = {}
    if emails:
        async for u in db.users.find({"email": {"$in": emails}}, {"_id": 0}):
            user_map[u["email"]] = u
    rows = []
    for s in students:
        u = user_map.get(s.get("email") or "")
        minutes = 0
        words = 0
        finished = 0
        if u:
            async for sess in db.reading_sessions.find(
                {"user_id": u["id"]}, {"_id": 0}
            ):
                minutes += sess["duration_seconds"] // 60
                words += sess["words_read"]
                if sess["finished"]:
                    finished += 1
        rows.append(
            {
                "student_id": s["id"],
                "name": s["name"],
                "email": s.get("email"),
                "linked": u is not None,
                "minutes": minutes,
                "words": words,
                "stories_finished": finished,
            }
        )
    return {
        "class_id": class_id,
        "class_name": cls["name"],
        "student_count": len(students),
        "students": rows,
        "total_minutes": sum(r["minutes"] for r in rows),
        "total_words": sum(r["words"] for r in rows),
    }


# ----------------------------------------------------------------------
# Health
# ----------------------------------------------------------------------
@api.get("/")
async def root():
    return {"message": "Shravan API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ----------------------------------------------------------------------
# Seed sample stories
# ----------------------------------------------------------------------
SEED_STORIES = [
    {
        "title": "The Brave Tiger of Sundarbans",
        "synopsis": "A young tiger learns to roar with courage when monsoon rains fill the jungle and a peacock loses its way.",
        "sentences": [
            "Deep in the green Sundarbans forest, a young tiger named Raja opened his eyes to a new morning.",
            "The wind was warm and the smell of wet earth filled the air.",
            "Suddenly, a loud thunder shook the sky above the tall trees.",
            "Heavy rain began to fall on the leaves and the river started to rise.",
            "A frightened peacock cried out, lost between the dancing branches.",
            "Raja remembered the words of his mother and let out his very first brave roar.",
            "The peacock heard him and flew toward the safe banyan tree.",
            "Together they waited as the storm slowly passed and the sun returned.",
            "From that day, the jungle remembered the little tiger who learned to be brave.",
        ],
    },
    {
        "title": "Diwali Lamps for Meena",
        "synopsis": "On the night of Diwali, Meena lights tiny clay lamps and discovers a magical song hidden in her grandmother's tabla.",
        "sentences": [
            "It was the evening of Diwali and the whole street smelled of sweet jalebi.",
            "Meena carefully placed a row of clay lamps on the doorstep of her home.",
            "Her grandmother smiled and brought out an old wooden tabla from the cupboard.",
            "When Meena tapped the tabla, a soft music seemed to dance through the room.",
            "Outside, the festival fireworks lit the sky with golden flowers.",
            "A small sparrow landed near the lamps as if to listen to the music.",
            "Meena hugged her grandmother and felt the whole house glow with joy.",
            "That Diwali, the little girl learned that the warmest light comes from love.",
        ],
    },
    {
        "title": "The Elephant and the River",
        "synopsis": "Appu the elephant follows the sound of a flute and finds a hidden river full of stories.",
        "sentences": [
            "Appu the young elephant lived near a quiet village at the edge of the forest.",
            "One morning he heard the soft sound of a flute floating on the wind.",
            "Curious, Appu walked carefully past the mango trees and the singing birds.",
            "He came upon a wide blue river where a boy was playing his flute.",
            "The water shimmered and a cool breeze touched the elephant's ears.",
            "Appu drank deeply from the river and felt happier than ever before.",
            "The boy smiled and promised to play music for him every sunny morning.",
        ],
    },
]


async def seed_stories():
    # Always refresh system stories so newly added fields (audio_url) propagate.
    await db.stories.delete_many({"visibility": "system"})
    for s in SEED_STORIES:
        sentences = s["sentences"]
        story_id = str(uuid.uuid4())
        doc = {
            "id": story_id,
            "title": s["title"],
            "synopsis": s["synopsis"],
            "cover_color": color_palette_pick(story_id),
            "sentences": [{"index": i, "text": t} for i, t in enumerate(sentences)],
            "audio_events": heuristic_audio_events(sentences),
            "owner_user_id": None,
            "visibility": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "word_count": sum(len(x.split()) for x in sentences),
            "estimated_minutes": max(1, sum(len(x.split()) for x in sentences) // 120),
            "source": "seed",
        }
        await db.stories.insert_one(doc)
    logger.info("Seeded %d stories", len(SEED_STORIES))


async def seed_admin():
    if await db.users.find_one({"email": "demo@shravan.in"}):
        pass
    else:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": "demo@shravan.in",
                "name": "Demo Parent",
                "role": "parent",
                "password": hash_password("Demo@1234"),
                "verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Seeded demo user demo@shravan.in / Demo@1234")
    if not await db.users.find_one({"email": "teacher@shravan.in"}):
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": "teacher@shravan.in",
                "name": "Demo Teacher",
                "role": "teacher",
                "password": hash_password("Teacher@1234"),
                "verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Seeded demo teacher teacher@shravan.in / Teacher@1234")


# ----------------------------------------------------------------------
# App init
# ----------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.stories.create_index("id", unique=True)
    await seed_admin()
    await seed_stories()


@app.on_event("shutdown")
async def shutdown_event():
    client.close()
