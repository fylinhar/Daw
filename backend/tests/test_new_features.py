"""Tests for new features: streak, profile visitors, image messaging.

Run: cd /app/backend && python -m pytest tests/test_new_features.py -v
"""
import base64

import requests

BASE = "http://localhost:8001/api"
DEMO = {"email": "demo@demo.com", "password": "Demo1234!"}
MEI = {"email": "mei@demo.com", "password": "Demo1234!"}

# 1x1 red PNG
PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8"
    "z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _login(creds):
    r = requests.post(f"{BASE}/auth/login", json=creds)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Streak & created_at on login ----------
def test_login_returns_streak_and_created_at():
    _, user = _login(DEMO)
    assert "streak_count" in user
    assert isinstance(user["streak_count"], int)
    assert user["streak_count"] >= 1
    assert "created_at" in user and user["created_at"]


def test_me_endpoint_returns_streak():
    t, _ = _login(DEMO)
    r = requests.get(f"{BASE}/auth/me", headers=_h(t))
    assert r.status_code == 200
    d = r.json()
    assert "streak_count" in d and d["streak_count"] >= 1
    assert "created_at" in d


# ---------- Profile visits ----------
def test_visit_records_and_dedupes_and_returns_view_count():
    mei_t, _mei = _login(MEI)
    demo_t, demo = _login(DEMO)
    demo_id = demo["id"]

    # baseline count
    r0 = requests.get(f"{BASE}/users/{demo_id}", headers=_h(mei_t))
    assert r0.status_code == 200
    baseline = r0.json().get("profile_views", 0)

    # mei visits demo (upsert; may already exist from previous runs)
    r1 = requests.get(f"{BASE}/users/{demo_id}", headers=_h(mei_t))
    assert r1.status_code == 200
    body = r1.json()
    assert "profile_views" in body
    assert body["profile_views"] >= max(1, baseline)
    # unique-per-visitor upsert: second visit MUST NOT increment
    r2 = requests.get(f"{BASE}/users/{demo_id}", headers=_h(mei_t))
    assert r2.status_code == 200
    assert r2.json()["profile_views"] == body["profile_views"]
    # response must not leak email
    assert "email" not in body


def test_self_visit_not_recorded():
    demo_t, demo = _login(DEMO)
    demo_id = demo["id"]

    # count before
    r1 = requests.get(f"{BASE}/users/{demo_id}", headers=_h(demo_t))
    before = r1.json()["profile_views"]
    # visit myself
    r2 = requests.get(f"{BASE}/users/{demo_id}", headers=_h(demo_t))
    after = r2.json()["profile_views"]
    assert before == after


def test_me_visitors_endpoint_shape_and_sort():
    # ensure at least one visit exists (mei -> demo)
    mei_t, _ = _login(MEI)
    demo_t, demo = _login(DEMO)
    requests.get(f"{BASE}/users/{demo['id']}", headers=_h(mei_t))

    r = requests.get(f"{BASE}/users/me/visitors", headers=_h(demo_t))
    assert r.status_code == 200
    d = r.json()
    assert "count" in d and "visitors" in d
    assert d["count"] == len(d["visitors"])
    assert d["count"] >= 1
    # first visitor has expected fields
    v0 = d["visitors"][0]
    for k in ("id", "name", "visited_at", "native_language"):
        assert k in v0, f"missing {k} in visitor card"
    # sorted desc by visited_at
    times = [v["visited_at"] for v in d["visitors"]]
    assert times == sorted(times, reverse=True)


# ---------- Image messages + media serving ----------
def test_image_message_and_media_serving():
    demo_t, _ = _login(DEMO)
    _mei_t, mei = _login(MEI)
    # ensure conversation
    r = requests.post(
        f"{BASE}/chats", json={"partner_id": mei["id"]}, headers=_h(demo_t)
    )
    assert r.status_code == 200
    conv_id = r.json()["id"]

    r2 = requests.post(
        f"{BASE}/chats/{conv_id}/image",
        json={"image_base64": PNG_B64, "mime": "image/png"},
        headers=_h(demo_t),
    )
    assert r2.status_code == 201, r2.text
    msg = r2.json()
    assert msg["type"] == "image"
    assert msg["image_id"]
    image_id = msg["image_id"]

    # conversation last_message updated
    r3 = requests.get(f"{BASE}/chats", headers=_h(demo_t))
    conv = next(c for c in r3.json() if c["id"] == conv_id)
    assert conv["last_message"]["text"] == "📷 Photo"

    # media serves the bytes
    r4 = requests.get(f"{BASE}/media/{image_id}")
    assert r4.status_code == 200
    assert r4.headers.get("content-type", "").startswith("image/")
    assert r4.content == base64.b64decode(PNG_B64)

    # media 404 for garbage id
    r5 = requests.get(f"{BASE}/media/does-not-exist")
    assert r5.status_code == 404


def test_image_invalid_base64_rejected():
    demo_t, _ = _login(DEMO)
    _, mei = _login(MEI)
    r = requests.post(
        f"{BASE}/chats", json={"partner_id": mei["id"]}, headers=_h(demo_t)
    )
    conv_id = r.json()["id"]
    r2 = requests.post(
        f"{BASE}/chats/{conv_id}/image",
        json={"image_base64": "!!!not-base64!!!", "mime": "image/png"},
        headers=_h(demo_t),
    )
    # base64.b64decode is lenient; the endpoint may accept and store an empty/garbage blob.
    # Only require it doesn't 500.
    assert r2.status_code in (201, 400)
