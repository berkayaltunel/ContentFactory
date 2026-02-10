from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from middleware.auth import require_auth
from datetime import datetime, timezone
import uuid
import logging
import httpx

router = APIRouter(prefix="/accounts", tags=["accounts"])
logger = logging.getLogger(__name__)

VALID_PLATFORMS = {"twitter", "instagram", "youtube", "tiktok", "linkedin"}

def get_supabase():
    from server import supabase
    return supabase

class AccountUpdate(BaseModel):
    username: str

@router.get("")
async def get_accounts(user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get all connected accounts for the user"""
    result = supabase.table("connected_accounts").select("*").eq("user_id", user.id).order("created_at").execute()
    return result.data or []

@router.put("/{platform}")
async def upsert_account(platform: str, body: AccountUpdate, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Add or update a connected account"""
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Geçersiz platform: {platform}")
    
    username = body.username.strip().lstrip("@")
    if not username:
        raise HTTPException(status_code=400, detail="Kullanıcı adı boş olamaz")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if exists
    existing = supabase.table("connected_accounts").select("id").eq("user_id", user.id).eq("platform", platform).execute()
    
    if existing.data:
        # Update
        result = supabase.table("connected_accounts").update({
            "username": username,
            "updated_at": now,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        # Check if user has any accounts yet (first one becomes primary)
        all_accounts = supabase.table("connected_accounts").select("id").eq("user_id", user.id).execute()
        is_first = not all_accounts.data
        
        result = supabase.table("connected_accounts").insert({
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "platform": platform,
            "username": username,
            "is_primary": is_first,
            "created_at": now,
            "updated_at": now,
        }).execute()
    
    return result.data[0] if result.data else {"success": True}

@router.delete("/{platform}")
async def delete_account(platform: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Delete a connected account"""
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Geçersiz platform: {platform}")
    
    result = supabase.table("connected_accounts").delete().eq("user_id", user.id).eq("platform", platform).execute()
    return {"deleted": len(result.data) if result.data else 0}

@router.patch("/{platform}/primary")
async def set_primary(platform: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Set an account as primary (unset all others)"""
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Geçersiz platform: {platform}")
    
    # Verify account exists
    existing = supabase.table("connected_accounts").select("id").eq("user_id", user.id).eq("platform", platform).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    # Unset all primary
    supabase.table("connected_accounts").update({"is_primary": False}).eq("user_id", user.id).execute()
    # Set this one
    supabase.table("connected_accounts").update({"is_primary": True}).eq("id", existing.data[0]["id"]).execute()
    
    return {"success": True, "primary": platform}


# ── Avatar Proxy (for platforms unavatar.io doesn't support) ──

@router.get("/avatar/instagram/{username}", include_in_schema=False)
async def instagram_avatar(username: str):
    """Proxy Instagram profile picture via Instagram GraphQL API"""
    username = username.strip().lstrip("@")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}",
                headers={
                    "User-Agent": "Instagram 219.0.0.12.117",
                    "X-IG-App-ID": "936619743392459",
                }
            )
            if r.status_code == 200:
                data = r.json()
                pic_url = data.get("data", {}).get("user", {}).get("profile_pic_url_hd") or \
                          data.get("data", {}).get("user", {}).get("profile_pic_url", "")
                if pic_url:
                    return RedirectResponse(url=pic_url, status_code=302)
    except Exception as e:
        logger.warning(f"Instagram avatar fetch failed for @{username}: {e}")
    
    raise HTTPException(status_code=404, detail="Avatar not found")
