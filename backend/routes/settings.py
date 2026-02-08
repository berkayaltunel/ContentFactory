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

@router.get("")
async def get_settings(user=Depends(require_auth), supabase=Depends(get_supabase)):
    result = supabase.table("user_settings").select("*").eq("user_id", "default").execute()
    if result.data:
        return result.data[0]
    return {"user_id": "default", "active_profile_id": None, "default_persona": "otorite", "default_tone": "natural"}

@router.patch("")
async def update_settings(body: SettingsUpdate, user=Depends(require_auth), supabase=Depends(get_supabase)):
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.active_profile_id is not None:
        update_data["active_profile_id"] = body.active_profile_id if body.active_profile_id != "" else None
    if body.default_persona is not None:
        update_data["default_persona"] = body.default_persona
    if body.default_tone is not None:
        update_data["default_tone"] = body.default_tone
    
    result = supabase.table("user_settings").update(update_data).eq("user_id", "default").execute()
    if result.data:
        return result.data[0]
    return update_data
