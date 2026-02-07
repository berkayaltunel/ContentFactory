"""
Cookie Health Monitor.
Periodically checks if Twitter cookies are valid using `bird whoami`.
Sends Telegram notification when cookies expire.
"""
import subprocess
import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional
import httpx

from services.cookie_store import cookie_store

logger = logging.getLogger(__name__)

# Telegram config
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "8128240790")


async def send_telegram_notification(message: str):
    """Send notification via Telegram."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set, skipping notification")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("Telegram notification sent")
            else:
                logger.error(f"Telegram notification failed: {resp.text}")
    except Exception as e:
        logger.error(f"Telegram notification error: {e}")


def check_bird_whoami() -> dict:
    """
    Verify cookies using Bird CLI (if available) or direct GraphQL HTTP.
    Returns: {"valid": bool, "username": str|None, "error": str|None}
    """
    cookies = cookie_store.get_cookies()

    if not cookies.get("auth_token") or not cookies.get("ct0"):
        return {"valid": False, "username": None, "error": "No cookies configured"}

    import shutil
    if shutil.which("bird"):
        # Use Bird CLI
        try:
            cmd = [
                "bird", "whoami",
                "--auth-token", cookies["auth_token"],
                "--ct0", cookies["ct0"],
                "--timeout", "15000",
                "--plain",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)

            if result.returncode == 0:
                output = result.stdout.strip()
                username = None
                for line in output.split("\n"):
                    if line.startswith("user:"):
                        parts = line.split("@")
                        if len(parts) > 1:
                            username = "@" + parts[1].split()[0].strip("()")
                        break

                cookie_store.mark_verified(True, username)
                return {"valid": True, "username": username, "error": None}
            else:
                error = result.stderr.strip() or "Unknown error"
                cookie_store.mark_verified(False)
                return {"valid": False, "username": None, "error": error}
        except subprocess.TimeoutExpired:
            cookie_store.mark_verified(False)
            return {"valid": False, "username": None, "error": "Timeout"}
        except Exception as e:
            cookie_store.mark_verified(False)
            return {"valid": False, "username": None, "error": str(e)}
    else:
        # No Bird CLI (Linux/Hetzner): use direct HTTP
        try:
            import httpx as _httpx
            headers = {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "X-Csrf-Token": cookies["ct0"],
            }
            cookie_jar = {"auth_token": cookies["auth_token"], "ct0": cookies["ct0"]}

            resp = _httpx.get(
                "https://api.x.com/1.1/account/verify_credentials.json",
                headers=headers, cookies=cookie_jar, timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                username = "@" + data.get("screen_name", "unknown")
                cookie_store.mark_verified(True, username)
                return {"valid": True, "username": username, "error": None}
            else:
                cookie_store.mark_verified(False)
                return {"valid": False, "username": None, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            cookie_store.mark_verified(False)
            return {"valid": False, "username": None, "error": str(e)}


async def run_health_check() -> dict:
    """
    Run health check and send Telegram notification if cookies are invalid.
    """
    result = check_bird_whoami()

    if result["valid"]:
        logger.info(f"Cookie health check passed: {result['username']}")
    else:
        logger.warning(f"Cookie health check FAILED: {result['error']}")
        await send_telegram_notification(
            "🔴 <b>ContentFactory Cookie Alert</b>\n\n"
            f"Twitter cookie'leri geçersiz!\n"
            f"Hata: {result['error']}\n\n"
            "Yenilemek için:\n"
            "1. Twitter'da F12 → Application → Cookies\n"
            "2. <code>auth_token</code> ve <code>ct0</code> değerlerini kopyala\n"
            "3. Bu komutla gönder:\n"
            "<code>/cookie auth_token=XXX ct0=YYY</code>"
        )

    return result
