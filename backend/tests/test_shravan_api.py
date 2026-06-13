"""
Shravan Backend Regression Tests
- Auth (login, signup + OTP, /me, 401 on missing token)
- Stories (list seeded, get detail, create-from-text)
- Speech matching (high & low confidence)
- Sessions (progress + analytics)
- Children (empty list, create, retrieve)
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL"
) else "https://shravan-read.preview.emergentagent.com"

DEMO_EMAIL = "demo@shravan.in"
DEMO_PASSWORD = "Demo@1234"
OTP_CODE = "123456"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# -------------------- Health --------------------
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{BASE_URL}/api/health", timeout=30)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# -------------------- Auth --------------------
class TestAuth:
    def test_login_demo(self, session):
        r = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == DEMO_EMAIL
        assert d["user"]["name"] == "Demo Parent"
        assert "password" not in d["user"]

    def test_signup_and_verify_otp(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Pass@1234", "name": "Tester"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("otp_sent") is True

        # Wrong OTP fails
        bad = session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": email, "code": "000000"},
            timeout=30,
        )
        assert bad.status_code == 400

        # Correct OTP succeeds
        ok = session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": email, "code": OTP_CODE},
            timeout=30,
        )
        assert ok.status_code == 200
        d = ok.json()
        assert "token" in d
        assert d["user"]["email"] == email
        assert d["user"]["verified"] is True

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_without_token_401(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_stories_without_token_401(self, session):
        r = session.get(f"{BASE_URL}/api/stories", timeout=30)
        assert r.status_code == 401


# -------------------- Stories --------------------
class TestStories:
    def test_list_seeded_stories(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        titles = {s["title"] for s in items}
        for expected in [
            "The Brave Tiger of Sundarbans",
            "Diwali Lamps for Meena",
            "The Elephant and the River",
        ]:
            assert expected in titles, f"missing {expected}"
        for s in items:
            assert "sentence_count" in s
            assert "audio_events" in s
            assert isinstance(s["audio_events"], list)

    def test_get_story_detail(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30)
        story_id = r.json()[0]["id"]
        r2 = session.get(
            f"{BASE_URL}/api/stories/{story_id}", headers=auth_headers, timeout=30
        )
        assert r2.status_code == 200
        s = r2.json()
        assert s["id"] == story_id
        sentences = s["sentences"]
        assert isinstance(sentences, list) and len(sentences) > 0
        for sent in sentences:
            assert "index" in sent and "text" in sent
        assert "audio_events" in s

    def test_create_from_text(self, session, auth_headers):
        text = (
            "The rain fell heavily over the village. A tiger walked through the wet forest. "
            "A peacock sang loudly near the river. Music filled the air during the festival."
        )
        r = session.post(
            f"{BASE_URL}/api/stories/create-from-text",
            headers=auth_headers,
            json={"title": "TEST_Story", "text": text},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["title"]
        assert len(s["sentences"]) >= 2
        assert isinstance(s["audio_events"], list)


# -------------------- Speech matching --------------------
class TestSpeechMatch:
    def test_high_confidence_match_and_event(self, session, auth_headers):
        # Find Tiger story (sentence 0 has no audio event keyword; sentence 2 has 'thunder')
        items = session.get(
            f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30
        ).json()
        tiger = next(s for s in items if "Brave Tiger" in s["title"])
        story = session.get(
            f"{BASE_URL}/api/stories/{tiger['id']}", headers=auth_headers, timeout=30
        ).json()
        first_sentence = story["sentences"][0]["text"]

        r = session.post(
            f"{BASE_URL}/api/speech/match",
            headers=auth_headers,
            json={
                "story_id": tiger["id"],
                "sentence_index": 0,
                "transcript": first_sentence,
                "confidence": 0.95,
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["match_score"] >= 0.75
        assert d["trigger_event"] is True
        assert d["behaviour"] == "advance_immediately"
        assert d["advance"] is True

    def test_audio_event_returned_when_present(self, session, auth_headers):
        items = session.get(
            f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30
        ).json()
        tiger = next(s for s in items if "Brave Tiger" in s["title"])
        story = session.get(
            f"{BASE_URL}/api/stories/{tiger['id']}", headers=auth_headers, timeout=30
        ).json()
        # Find a sentence that has an audio event
        evt_indices = {e["sentence_index"] for e in story["audio_events"]}
        assert evt_indices, "Seeded tiger story should have at least one audio_event"
        idx = sorted(evt_indices)[0]
        sentence_text = story["sentences"][idx]["text"]
        r = session.post(
            f"{BASE_URL}/api/speech/match",
            headers=auth_headers,
            json={
                "story_id": tiger["id"],
                "sentence_index": idx,
                "transcript": sentence_text,
                "confidence": 0.95,
            },
            timeout=30,
        )
        d = r.json()
        assert d["trigger_event"] is True
        assert d["audio_event"] is not None
        assert d["audio_event"]["sentence_index"] == idx

    def test_low_confidence_pause(self, session, auth_headers):
        items = session.get(
            f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30
        ).json()
        story_id = items[0]["id"]
        r = session.post(
            f"{BASE_URL}/api/speech/match",
            headers=auth_headers,
            json={
                "story_id": story_id,
                "sentence_index": 0,
                "transcript": "umm",
                "confidence": 0.3,
            },
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["behaviour"] == "pause_progression"
        assert d["advance"] is False
        assert d["trigger_event"] is False


# -------------------- Sessions / Analytics --------------------
class TestSessions:
    def test_save_progress_and_analytics(self, session, auth_headers):
        items = session.get(
            f"{BASE_URL}/api/stories", headers=auth_headers, timeout=30
        ).json()
        story_id = items[0]["id"]
        r = session.post(
            f"{BASE_URL}/api/sessions/progress",
            headers=auth_headers,
            json={
                "story_id": story_id,
                "sentences_completed": 3,
                "duration_seconds": 180,
                "words_read": 60,
                "finished": False,
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        prog = r.json()
        assert prog["story_id"] == story_id
        assert prog["duration_seconds"] == 180

        a = session.get(
            f"{BASE_URL}/api/sessions/analytics", headers=auth_headers, timeout=30
        )
        assert a.status_code == 200
        d = a.json()
        assert "total_minutes" in d
        assert "total_words" in d
        assert "streak_days" in d
        assert isinstance(d["last_7_days"], list)
        assert len(d["last_7_days"]) == 7
        assert d["total_words"] >= 60


# -------------------- Children --------------------
class TestChildren:
    def test_children_empty_create_list(self, session):
        # Fresh user to ensure empty initial list
        email = f"child_test_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Pass@1234", "name": "Parent"},
            timeout=30,
        )
        tok = s.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": email, "code": OTP_CODE},
            timeout=30,
        ).json()["token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

        r = s.get(f"{BASE_URL}/api/children", headers=h, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

        c = s.post(
            f"{BASE_URL}/api/children",
            headers=h,
            json={"name": "TEST_Aarav", "age": 7},
            timeout=30,
        )
        assert c.status_code == 200, c.text
        child = c.json()
        assert child["name"] == "TEST_Aarav"
        assert child["age"] == 7
        assert "id" in child

        r2 = s.get(f"{BASE_URL}/api/children", headers=h, timeout=30)
        assert r2.status_code == 200
        names = [x["name"] for x in r2.json()]
        assert "TEST_Aarav" in names

    def test_children_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/children", timeout=30)
        assert r.status_code == 401
