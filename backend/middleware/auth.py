"""
JWT Auth Middleware - Supabase token doğrulama ve whitelist kontrolü.
"""
import os
from typing import Optional
from fastapi import Header, HTTPException


# Env'den izin verilen email listesi (virgülle ayrılmış)
_allowed_raw = os.environ.get("ALLOWED_EMAILS", "")
ALLOWED_EMAILS: set[str] | None = (
    {e.strip().lower() for e in _allowed_raw.split(",") if e.strip()}
    if _allowed_raw.strip()
    else None  # None = herkes erişebilir (dev mode)
)


def _get_supabase():
    """server.py'deki supabase client'ı import et."""
    from server import supabase
    return supabase


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """
    Zorunlu auth dependency.
    Bearer token yoksa veya geçersizse 401 döner.
    Whitelist varsa email kontrolü yapar, yoksa 403 döner.
    Başarılıysa Supabase user objesi döner.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Yetkilendirme token'ı gerekli")

    token = authorization.replace("Bearer ", "")
    try:
        sb = _get_supabase()
        user_response = sb.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    # Whitelist kontrolü
    if ALLOWED_EMAILS is not None:
        user_email = (user.email or "").lower()
        if user_email not in ALLOWED_EMAILS:
            raise HTTPException(status_code=403, detail="Bu hesap erişim izni olmayan bir kullanıcıya ait")

    return user


async def optional_auth(authorization: Optional[str] = Header(None)):
    """
    Opsiyonel auth dependency.
    Token varsa user döner, yoksa None döner. Hata fırlatmaz.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        sb = _get_supabase()
        user_response = sb.auth.get_user(token)
        return user_response.user
    except Exception:
        return None
