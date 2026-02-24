"""Daily Drafts API.

GET  /drafts/today     — Bugünün taslakları (JIT: yoksa üretir)
GET  /drafts/{id}      — Tek taslak getir (bridge: Creator Hub → /create)
PUT  /drafts/{id}      — Taslak güncelle (edit/dismiss/published)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/drafts", tags=["drafts"])


def get_supabase():
    from server import supabase
    return supabase


class DraftUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None  # pending/edited/published/dismissed


@router.get("/today")
async def get_today_drafts(
    platform: str = Query("twitter"),
    user=Depends(require_auth),
):
    """Bugünün taslakları. Yoksa JIT üretir (~3-4 saniye)."""
    try:
        from services.magic_morning import generate_magic_morning
        result = await generate_magic_morning(user.id, platform=platform)
        return result
    except Exception as e:
        logger.error(f"Magic Morning error: {e}")
        raise HTTPException(status_code=500, detail="Taslaklar oluşturulamadı")


@router.get("/{draft_id}")
async def get_draft(draft_id: str, user=Depends(require_auth)):
    """Tek taslak getir. Bridge akışında /create sayfası bunu çeker."""
    sb = get_supabase()
    try:
        result = sb.table("daily_drafts") \
            .select("*") \
            .eq("id", draft_id) \
            .eq("user_id", user.id) \
            .limit(1) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Taslak bulunamadı")

        return {"success": True, "draft": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Draft get error: {e}")
        raise HTTPException(status_code=500, detail="Taslak getirilemedi")


@router.put("/{draft_id}")
async def update_draft(draft_id: str, body: DraftUpdate, user=Depends(require_auth)):
    """Taslak güncelle (düzenle veya dismiss et)."""
    sb = get_supabase()

    update = {}
    if body.content is not None:
        update["content"] = body.content
        update["status"] = "edited"
    if body.status is not None:
        if body.status not in ("pending", "edited", "published", "dismissed"):
            raise HTTPException(status_code=400, detail="Geçersiz status")
        update["status"] = body.status

    if not update:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

    try:
        result = sb.table("daily_drafts") \
            .update(update) \
            .eq("id", draft_id) \
            .eq("user_id", user.id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Taslak bulunamadı")

        return {"success": True, "draft": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Draft update error: {e}")
        raise HTTPException(status_code=500, detail="Güncelleme başarısız")
