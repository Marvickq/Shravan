"""
Iteration 2 backend regression tests:
- /api/stories audio_events contain audio_url
- /api/subscriptions/status + /start (paywall stub)
- Teacher RBAC: /api/classes, students, assignments, analytics
- Parent gets 403 on /api/classes
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://shravan-read.preview.emergentagent.com"
).rstrip("/")

PARENT_EMAIL = "demo@shravan.in"
PARENT_PASSWORD = "Demo@1234"
TEACHER_EMAIL = "teacher@shravan.in"
TEACHER_PASSWORD = "Teacher@1234"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password):
    r = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def parent_headers(session):
    tok = _login(session, PARENT_EMAIL, PARENT_PASSWORD)
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def teacher_headers(session):
    tok = _login(session, TEACHER_EMAIL, TEACHER_PASSWORD)
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# -------------------- Stories: audio_url --------------------
class TestStoryAudioURL:
    def test_list_stories_audio_events_have_url(self, session, parent_headers):
        r = session.get(f"{BASE_URL}/api/stories", headers=parent_headers, timeout=30)
        assert r.status_code == 200
        stories = r.json()
        assert len(stories) >= 1
        # Across all stories at least one audio_event must have audio_url
        any_url_seen = False
        for s in stories:
            for ev in s.get("audio_events", []):
                assert "audio_url" in ev, f"audio_event missing audio_url: {ev}"
                if ev["audio_url"]:
                    assert ev["audio_url"].startswith("http"), ev["audio_url"]
                    any_url_seen = True
        assert any_url_seen, "Expected at least one audio_url across seeded stories"

    def test_story_detail_audio_events_have_url(self, session, parent_headers):
        items = session.get(
            f"{BASE_URL}/api/stories", headers=parent_headers, timeout=30
        ).json()
        # pick story with audio_events
        target = next((s for s in items if s.get("audio_events")), items[0])
        r = session.get(
            f"{BASE_URL}/api/stories/{target['id']}", headers=parent_headers, timeout=30
        )
        assert r.status_code == 200
        story = r.json()
        assert story["audio_events"], "Story should have audio_events"
        for ev in story["audio_events"]:
            assert "audio_url" in ev
            assert ev["event_type"] in [
                "animal", "bird", "weather", "nature", "music",
                "festival", "emotion", "horror", "character_voice",
            ]


# -------------------- Subscriptions --------------------
class TestSubscriptions:
    def test_status_shape_for_parent(self, session):
        # Use a fresh parent so we know premium=False initially
        email = f"test_sub_{uuid.uuid4().hex[:8]}@example.com"
        session.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Pass@1234", "name": "SubTest"},
            timeout=30,
        )
        tok = session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": email, "code": "123456"},
            timeout=30,
        ).json()["token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

        r = session.get(f"{BASE_URL}/api/subscriptions/status", headers=h, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["premium"] is False
        assert d["free_story_limit"] == 3
        assert "stories_finished" in d
        assert "stories_remaining" in d
        assert d["locked"] is False
        assert isinstance(d["plans"], list) and len(d["plans"]) == 2
        plan_ids = {p["id"] for p in d["plans"]}
        assert plan_ids == {"monthly", "yearly"}

    def test_start_monthly_marks_premium(self, session):
        email = f"test_sub2_{uuid.uuid4().hex[:8]}@example.com"
        session.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Pass@1234", "name": "SubTest2"},
            timeout=30,
        )
        tok = session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": email, "code": "123456"},
            timeout=30,
        ).json()["token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

        start = session.post(
            f"{BASE_URL}/api/subscriptions/start",
            headers=h,
            json={"plan_id": "monthly"},
            timeout=30,
        )
        assert start.status_code == 200, start.text
        assert start.json().get("ok") is True

        st = session.get(
            f"{BASE_URL}/api/subscriptions/status", headers=h, timeout=30
        )
        assert st.status_code == 200
        d = st.json()
        assert d["premium"] is True


# -------------------- Teacher RBAC --------------------
class TestTeacherRBAC:
    def test_teacher_login_ok(self, session):
        r = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "teacher"
        assert d["user"]["email"] == TEACHER_EMAIL

    def test_parent_forbidden_on_classes(self, session, parent_headers):
        r = session.get(f"{BASE_URL}/api/classes", headers=parent_headers, timeout=30)
        assert r.status_code == 403
        # detail message contains "Teacher role required"
        body = r.json()
        # FastAPI default error shape: {"detail": "..."}
        assert "Teacher" in str(body)

    def test_teacher_list_classes(self, session, teacher_headers):
        r = session.get(f"{BASE_URL}/api/classes", headers=teacher_headers, timeout=30)
        assert r.status_code == 200
        classes = r.json()
        assert isinstance(classes, list)
        # Either pre-seeded "Grade 3 - Sundaram" or empty (depending on seed iteration)
        # We just check shape
        for c in classes:
            assert "id" in c and "name" in c

    def test_teacher_full_workflow(self, session, teacher_headers, parent_headers):
        # Create class
        unique = uuid.uuid4().hex[:6]
        cls_resp = session.post(
            f"{BASE_URL}/api/classes",
            headers=teacher_headers,
            json={"name": f"TEST_Class_{unique}", "grade": "5"},
            timeout=30,
        )
        assert cls_resp.status_code == 200, cls_resp.text
        cls = cls_resp.json()
        class_id = cls["id"]
        assert cls["name"] == f"TEST_Class_{unique}"
        assert cls["grade"] == "5"
        assert cls["students"] == []

        # GET to verify persistence
        get_resp = session.get(
            f"{BASE_URL}/api/classes/{class_id}",
            headers=teacher_headers,
            timeout=30,
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == class_id

        # Add a student
        stu_resp = session.post(
            f"{BASE_URL}/api/classes/{class_id}/students",
            headers=teacher_headers,
            json={"name": "TEST_Kid", "email": f"test_kid_{unique}@example.com"},
            timeout=30,
        )
        assert stu_resp.status_code == 200, stu_resp.text
        stu = stu_resp.json()
        assert stu["name"] == "TEST_Kid"
        assert "id" in stu

        # Verify student persisted via GET class
        cls_after = session.get(
            f"{BASE_URL}/api/classes/{class_id}",
            headers=teacher_headers,
            timeout=30,
        ).json()
        names = [s["name"] for s in cls_after["students"]]
        assert "TEST_Kid" in names

        # Need a story_id for assignment (teacher uses parent's view? Actually teacher
        # is a different user — but stories with visibility=system are visible to all).
        stories = session.get(
            f"{BASE_URL}/api/stories", headers=teacher_headers, timeout=30
        )
        assert stories.status_code == 200
        story_list = stories.json()
        assert story_list, "Teacher should see at least the seed (system) stories"
        story_id = story_list[0]["id"]

        # Create assignment
        as_resp = session.post(
            f"{BASE_URL}/api/classes/{class_id}/assignments",
            headers=teacher_headers,
            json={"story_id": story_id},
            timeout=30,
        )
        assert as_resp.status_code == 200, as_resp.text
        assignment = as_resp.json()
        assert assignment["class_id"] == class_id
        assert assignment["story_id"] == story_id
        assert assignment.get("story_title")

        # Verify assignment shows in class detail
        cls_with_as = session.get(
            f"{BASE_URL}/api/classes/{class_id}",
            headers=teacher_headers,
            timeout=30,
        ).json()
        assignment_ids = [a["id"] for a in cls_with_as.get("assignments", [])]
        assert assignment["id"] in assignment_ids

        # Analytics
        an_resp = session.get(
            f"{BASE_URL}/api/classes/{class_id}/analytics",
            headers=teacher_headers,
            timeout=30,
        )
        assert an_resp.status_code == 200, an_resp.text
        an = an_resp.json()
        assert an["class_id"] == class_id
        assert an["student_count"] == 1
        assert isinstance(an["students"], list)
        assert len(an["students"]) == 1
        row = an["students"][0]
        assert "name" in row
        assert "minutes" in row
        assert "words" in row
        assert "stories_finished" in row
        assert "linked" in row

        # Parent cannot access this class
        forbidden = session.get(
            f"{BASE_URL}/api/classes/{class_id}",
            headers=parent_headers,
            timeout=30,
        )
        assert forbidden.status_code == 403

        # Parent cannot create class
        forbidden_post = session.post(
            f"{BASE_URL}/api/classes",
            headers=parent_headers,
            json={"name": "Should fail"},
            timeout=30,
        )
        assert forbidden_post.status_code == 403
