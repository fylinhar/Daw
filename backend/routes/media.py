from fastapi import APIRouter, HTTPException, Response

from db import media_col

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/{media_id}")
async def get_media(media_id: str):
    doc = await media_col.find_one({"_id": media_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Media not found")
    return Response(
        content=bytes(doc["data"]),
        media_type=doc.get("mime", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )
