"""
Cookie management API endpoints.
Admin-only endpoints for viewing and updating Twitter cookies.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
import logging
import re

from services.cookie_store import cookie_store
from services.cookie_monitor import run_health_check

router = APIRouter(prefix="/cookies", tags=["cookies"])
logger = logging.getLogger(__name__)

# Admin auth: simple API key or Telegram chat_id check
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY")
ALLOWED_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "8128240790")


def verify_admin(request: Request):
    """Verify admin access via API key header."""
    api_key = request.headers.get("X-Admin-Key")
    if not ADMIN_API_KEY:
        # If no admin key configured, block all external updates
        # (only internal/Telegram updates allowed)
        raise HTTPException(status_code=403, detail="Admin API key not configured")
    if api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


class CookieUpdateRequest(BaseModel):
    auth_token: str
    ct0: str


class TelegramCookieUpdate(BaseModel):
    """Parse cookie update from Telegram message."""
    chat_id: str
    text: str


@router.get("/status")
async def cookie_status():
    """Get current cookie status (no sensitive data exposed)."""
    return cookie_store.get_status()


@router.post("/update")
async def update_cookies(request: Request, body: CookieUpdateRequest):
    """Update Twitter cookies (admin only)."""
    verify_admin(request)

    if not body.auth_token or not body.ct0:
        raise HTTPException(status_code=400, detail="Both auth_token and ct0 required")

    # Basic validation
    if len(body.auth_token) < 20:
        raise HTTPException(status_code=400, detail="auth_token looks too short")
    if len(body.ct0) < 20:
        raise HTTPException(status_code=400, detail="ct0 looks too short")

    cookie_store.update_cookies(body.auth_token, body.ct0)

    # Run immediate health check
    result = await run_health_check()

    return {
        "success": True,
        "verified": result["valid"],
        "username": result.get("username"),
        "message": "Cookies updated and verified" if result["valid"] else "Cookies updated but verification failed",
    }


@router.post("/telegram-update")
async def telegram_cookie_update(body: TelegramCookieUpdate):
    """
    Update cookies via Telegram bot message.
    Expected format: /cookie auth_token=XXX ct0=YYY
    Only accepts from allowed chat_id.
    """
    if body.chat_id != ALLOWED_CHAT_ID:
        raise HTTPException(status_code=403, detail="Unauthorized chat")

    text = body.text.strip()

    # Parse auth_token and ct0 from text
    auth_match = re.search(r"auth_token[=:\s]+([a-f0-9]+)", text, re.IGNORECASE)
    ct0_match = re.search(r"ct0[=:\s]+([a-f0-9]+)", text, re.IGNORECASE)

    if not auth_match or not ct0_match:
        return {
            "success": False,
            "error": "Format hatası. Doğru format:\n/cookie auth_token=XXX ct0=YYY",
        }

    auth_token = auth_match.group(1)
    ct0 = ct0_match.group(1)

    cookie_store.update_cookies(auth_token, ct0)

    # Run health check
    result = await run_health_check()

    return {
        "success": True,
        "verified": result["valid"],
        "username": result.get("username"),
    }


@router.get("/health")
async def cookie_health():
    """Run a live health check on cookies."""
    result = await run_health_check()
    return result
