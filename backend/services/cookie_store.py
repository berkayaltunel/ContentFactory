"""
Encrypted cookie storage for Twitter credentials.
Cookies are stored in a JSON file encrypted with Fernet (AES-128-CBC).
Falls back to environment variables if no stored cookies exist.
"""
import json
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

# Default path for cookie storage
DEFAULT_COOKIE_PATH = Path(__file__).parent.parent / "data" / "cookies.json"


class CookieStore:
    def __init__(self, cookie_path: Optional[str] = None):
        self.cookie_path = Path(cookie_path) if cookie_path else DEFAULT_COOKIE_PATH
        self.cookie_path.parent.mkdir(parents=True, exist_ok=True)

        # Encryption key from env (REQUIRED - server.py validates this at startup)
        key = os.environ.get("COOKIE_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError(
                "COOKIE_ENCRYPTION_KEY not set! Server cannot start without it. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

        self.fernet = Fernet(key.encode() if isinstance(key, str) else key)

        # In-memory cache
        self._cache: Optional[dict] = None

    def _read_file(self) -> dict:
        """Read and decrypt cookie file."""
        if self._cache:
            return self._cache

        if not self.cookie_path.exists():
            return {}

        try:
            encrypted = self.cookie_path.read_bytes()
            decrypted = self.fernet.decrypt(encrypted)
            self._cache = json.loads(decrypted)
            return self._cache
        except Exception as e:
            logger.error(f"Failed to read cookie file: {e}")
            return {}

    def _write_file(self, data: dict):
        """Encrypt and write cookie file."""
        try:
            raw = json.dumps(data, indent=2, default=str)
            encrypted = self.fernet.encrypt(raw.encode())
            self.cookie_path.write_bytes(encrypted)
            self._cache = data
            logger.info("Cookie file updated successfully")
        except Exception as e:
            logger.error(f"Failed to write cookie file: {e}")
            raise

    def get_cookies(self) -> dict:
        """
        Get Twitter cookies. Priority:
        1. Encrypted cookie store
        2. Environment variables (fallback)
        """
        stored = self._read_file()

        auth_token = stored.get("auth_token")
        ct0 = stored.get("ct0")

        # Fallback to env vars
        if not auth_token:
            auth_token = os.environ.get("AUTH_TOKEN")
        if not ct0:
            ct0 = os.environ.get("CT0")

        return {
            "auth_token": auth_token,
            "ct0": ct0,
            "last_verified": stored.get("last_verified"),
            "last_updated": stored.get("last_updated"),
            "is_valid": stored.get("is_valid", None),
            "username": stored.get("username"),
            "source": "store" if stored.get("auth_token") else "env",
        }

    def update_cookies(self, auth_token: str, ct0: str) -> dict:
        """Update stored cookies."""
        data = self._read_file()
        data.update({
            "auth_token": auth_token,
            "ct0": ct0,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "is_valid": None,  # Will be verified by health check
            "username": data.get("username"),
        })
        self._write_file(data)
        logger.info("Cookies updated")
        return data

    def mark_verified(self, is_valid: bool, username: Optional[str] = None):
        """Mark cookies as verified/invalid after health check."""
        data = self._read_file()
        data["last_verified"] = datetime.now(timezone.utc).isoformat()
        data["is_valid"] = is_valid
        if username:
            data["username"] = username
        self._write_file(data)

    def get_status(self) -> dict:
        """Get cookie status summary."""
        cookies = self.get_cookies()
        return {
            "has_cookies": bool(cookies.get("auth_token") and cookies.get("ct0")),
            "source": cookies.get("source"),
            "is_valid": cookies.get("is_valid"),
            "last_verified": cookies.get("last_verified"),
            "last_updated": cookies.get("last_updated"),
            "username": cookies.get("username"),
            "auth_token_preview": (
                cookies["auth_token"][:8] + "..." if cookies.get("auth_token") else None
            ),
        }


# Singleton
cookie_store = CookieStore()
