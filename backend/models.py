from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=60)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None
    native_language: Optional[str] = None
    learning_language: Optional[str] = None
    proficiency: Optional[str] = None


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ConversationCreate(BaseModel):
    partner_id: str


class MomentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_language: str


class CorrectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: Optional[str] = None


class VoiceMessageCreate(BaseModel):
    audio_base64: str = Field(min_length=1)
    mime: str = "audio/m4a"
    duration_ms: int = 0


class ImageMessageCreate(BaseModel):
    image_base64: str = Field(min_length=1)
    mime: str = "image/jpeg"


class RoomCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    language: str = Field(min_length=2, max_length=8)


class RoomRoleUpdate(BaseModel):
    user_id: str
    role: str = Field(pattern="^(speaker|listener)$")


class RoomMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


def user_public(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "email": doc.get("email"),
        "name": doc.get("name"),
        "bio": doc.get("bio"),
        "country": doc.get("country"),
        "avatar_url": doc.get("avatar_url"),
        "native_language": doc.get("native_language"),
        "learning_language": doc.get("learning_language"),
        "proficiency": doc.get("proficiency"),
        "streak_count": doc.get("streak_count", 0),
        "created_at": doc.get("created_at"),
    }


def user_card(doc: dict) -> dict:
    """Lightweight user info embedded in lists/messages."""
    return {
        "id": doc["_id"],
        "name": doc.get("name"),
        "avatar_url": doc.get("avatar_url"),
        "country": doc.get("country"),
        "native_language": doc.get("native_language"),
        "learning_language": doc.get("learning_language"),
        "proficiency": doc.get("proficiency"),
        "bio": doc.get("bio"),
    }
