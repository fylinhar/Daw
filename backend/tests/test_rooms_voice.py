"""Tests for voice rooms and voice messages.

Run: cd /app/backend && python -m pytest tests/test_rooms_voice.py -v
"""

import base64

import requests

BASE = "http://localhost:8001/api"
PASSWORD = "Demo1234!"


def login(email):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_room_full_lifecycle():
    host_token, host = login("demo@demo.com")
    member_token, member = login("mei@demo.com")

    # create
    r = requests.post(
        f"{BASE}/rooms",
        json={"title": "Pytest practice room", "language": "en"},
        headers=headers(host_token),
    )
    assert r.status_code == 201, r.text
    room = r.json()
    room_id = room["id"]
    assert room["host"]["id"] == host["id"]
    assert room["members"][0]["role"] == "host"

    # listed as live
    r = requests.get(f"{BASE}/rooms", headers=headers(host_token))
    assert any(rm["id"] == room_id for rm in r.json())

    # member joins as listener
    r = requests.post(f"{BASE}/rooms/{room_id}/join", headers=headers(member_token))
    assert r.status_code == 200
    detail = r.json()
    m = next(x for x in detail["members"] if x["id"] == member["id"])
    assert m["role"] == "listener" and m["mic_on"] is False

    # listener raises hand
    r = requests.post(f"{BASE}/rooms/{room_id}/hand", headers=headers(member_token))
    assert r.json()["hand_raised"] is True

    # listener cannot use mic
    r = requests.post(f"{BASE}/rooms/{room_id}/mic", headers=headers(member_token))
    assert r.status_code == 403

    # non-host cannot promote
    r = requests.post(
        f"{BASE}/rooms/{room_id}/role",
        json={"user_id": member["id"], "role": "speaker"},
        headers=headers(member_token),
    )
    assert r.status_code == 403

    # host promotes
    r = requests.post(
        f"{BASE}/rooms/{room_id}/role",
        json={"user_id": member["id"], "role": "speaker"},
        headers=headers(host_token),
    )
    assert r.status_code == 200

    # now member can toggle mic
    r = requests.post(f"{BASE}/rooms/{room_id}/mic", headers=headers(member_token))
    assert r.status_code == 200 and r.json()["mic_on"] is True

    # room chat
    r = requests.post(
        f"{BASE}/rooms/{room_id}/messages",
        json={"text": "hello from pytest"},
        headers=headers(member_token),
    )
    assert r.status_code == 201
    r = requests.get(f"{BASE}/rooms/{room_id}/messages", headers=headers(member_token))
    assert any(m["text"] == "hello from pytest" for m in r.json())

    # member leaves
    r = requests.post(f"{BASE}/rooms/{room_id}/leave", headers=headers(member_token))
    assert r.status_code == 200

    # only host can end; host ends
    r = requests.post(f"{BASE}/rooms/{room_id}/end", headers=headers(host_token))
    assert r.status_code == 200

    # room no longer joinable
    r = requests.post(f"{BASE}/rooms/{room_id}/join", headers=headers(member_token))
    assert r.status_code == 404


def test_voice_message_and_audio_fetch():
    token, _ = login("demo@demo.com")
    _, partner = login("mei@demo.com")
    conv = requests.post(
        f"{BASE}/chats", json={"partner_id": partner["id"]}, headers=headers(token)
    ).json()
    audio_b64 = base64.b64encode(b"PYTESTAUDIO" * 50).decode()
    r = requests.post(
        f"{BASE}/chats/{conv['id']}/voice",
        json={"audio_base64": audio_b64, "mime": "audio/webm", "duration_ms": 2500},
        headers=headers(token),
    )
    assert r.status_code == 201, r.text
    msg = r.json()
    assert msg["type"] == "voice" and msg["audio_id"]
    assert msg["duration_ms"] == 2500
    # audio is fetchable
    r = requests.get(f"{BASE}/audio/{msg['audio_id']}")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/webm")
    assert r.content == b"PYTESTAUDIO" * 50
    # invalid base64 rejected
    r = requests.post(
        f"{BASE}/chats/{conv['id']}/voice",
        json={"audio_base64": "!!!notbase64!!!", "mime": "audio/webm", "duration_ms": 100},
        headers=headers(token),
    )
    assert r.status_code == 400
