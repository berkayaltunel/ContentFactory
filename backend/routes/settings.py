from fastapi import APIRouter, Depends
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timezone

router = APIRouter(prefix="/settings", tags=["settings"])
logger = logging.getLogger(__name__)

def get_supabase():
    from server import supabase
    return supabase

class SettingsUpdate(BaseModel):
    active_profile_id: Optional[str] = None
    default_persona: Optional[str] = None
    default_tone: Optional[str] = None
    twitter_username: Optional[str] = None

@router.get("")
async def get_settings(user=Depends(require_auth), supabase=Depends(get_supabase)):
    result = supabase.table("user_settings").select("*").eq("user_id", user.id).execute()
    if result.data:
        return result.data[0]
    return {"user_id": user.id, "active_profile_id": None, "default_persona": "otorite", "default_tone": "natural", "twitter_username": None}

@router.patch("")
async def update_settings(body: SettingsUpdate, user=Depends(require_auth), supabase=Depends(get_supabase)):
    update_data = {
        "user_id": user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if body.active_profile_id is not None:
        update_data["active_profile_id"] = body.active_profile_id if body.active_profile_id != "" else None
    if body.default_persona is not None:
        update_data["default_persona"] = body.default_persona
    if body.default_tone is not None:
        update_data["default_tone"] = body.default_tone
    if body.twitter_username is not None:
        # Strip @ prefix if provided, store clean username
        username = body.twitter_username.strip().lstrip("@")
        update_data["twitter_username"] = username if username else None
    
    result = supabase.table("user_settings").upsert(update_data, on_conflict="user_id").execute()
    if result.data:
        return result.data[0]
    return update_data
