from fastapi import APIRouter, HTTPException, Response

from db import audio_col

router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/{audio_id}")
async def get_audio(audio_id: str):
    doc = await audio_col.find_one({"_id": audio_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Audio not found")
    return Response(
        content=bytes(doc["data"]),
        media_type=doc.get("mime", "audio/mp4"),
        headers={"Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes"},
    )
