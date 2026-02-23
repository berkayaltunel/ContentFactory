"""
Active Account Middleware — X-Active-Account-Id header'dan aktif hesabı çözer.

Kullanım:
    from middleware.active_account import get_active_account

    @router.get("/something")
    async def handler(user=Depends(require_auth), account_id=Depends(get_active_account)):
        # account_id: str | None
        # None = tek hesaplı kullanıcı veya henüz seçilmemiş

Performans: Header'dan okur, her request'te DB'ye gitmez.
Fallback: Header yoksa user_settings.active_account_id'den çeker (1 kez).
"""
import logging
from typing import Optional
from fastapi import Header, Depends, Request
from middleware.auth import require_auth

logger = logging.getLogger(__name__)


def _get_supabase():
    from server import supabase
    return supabase


async def get_active_account(
    request: Request,
    user=Depends(require_auth),
    x_active_account_id: Optional[str] = Header(None),
) -> Optional[str]:
    """
    Aktif hesap ID'sini çöz.

    Öncelik:
    1. X-Active-Account-Id header (frontend gönderiyorsa)
    2. user_settings.active_account_id (fallback)
    3. Primary connected_account (son fallback)
    4. None (hesap yok)
    """
    # 1. Header'dan
    if x_active_account_id and x_active_account_id != "null":
        return x_active_account_id

    # 2. user_settings'ten (fallback, cache'lenebilir)
    try:
        sb = _get_supabase()
        res = sb.table("user_settings") \
            .select("active_account_id") \
            .eq("user_id", user.id) \
            .limit(1) \
            .execute()

        if res.data and res.data[0].get("active_account_id"):
            return res.data[0]["active_account_id"]
    except Exception as e:
        logger.warning(f"Active account fallback error: {e}")

    # 3. Primary account (son fallback)
    try:
        sb = _get_supabase()
        res = sb.table("connected_accounts") \
            .select("id") \
            .eq("user_id", user.id) \
            .eq("is_primary", True) \
            .limit(1) \
            .execute()

        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning(f"Primary account fallback error: {e}")

    return None


async def get_active_account_or_none(
    request: Request,
    user=Depends(require_auth),
    x_active_account_id: Optional[str] = Header(None),
) -> Optional[str]:
    """get_active_account ile aynı ama hiçbir zaman hata fırlatmaz."""
    try:
        return await get_active_account(request, user, x_active_account_id)
    except Exception:
        return None
