#!/usr/bin/env python3
"""
Twitter Cookie Auto-Sync
Chrome'dan x.com cookie'lerini çekip Hetzner'deki ContentFactory API'ye push eder.
OpenClaw cron ile saatte 1 çalışır.

Gereksinimler:
  pip install pycookiecheat httpx

Kullanım:
  python3 sync-twitter-cookies.py              # Normal çalışma
  python3 sync-twitter-cookies.py --dry-run    # Sadece cookie çek, push etme
  python3 sync-twitter-cookies.py --verbose    # Detaylı log
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

# --- Config ---
CHROME_COOKIE_FILE = Path.home() / "Library/Application Support/Google/Chrome/Profile 1/Cookies"
API_BASE = "https://api.typehype.io"
COOKIE_UPDATE_ENDPOINT = f"{API_BASE}/api/cookies/update"
COOKIE_HEALTH_ENDPOINT = f"{API_BASE}/api/cookies/health"
HETZNER_HOST = "root@46.225.27.85"
HETZNER_BACKEND_DIR = "/opt/contentfactory/backend"
HETZNER_ENV_FILE = "/opt/contentfactory/backend/.env"
HETZNER_PM2_NAME = "contentfactory-api"
STATE_FILE = Path(__file__).parent / ".cookie-sync-state.json"

# Logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("cookie-sync")


def extract_twitter_cookies() -> dict:
    """Chrome'dan x.com cookie'lerini çek."""
    try:
        from pycookiecheat import chrome_cookies
    except ImportError:
        log.error("pycookiecheat kurulu değil: pip install pycookiecheat")
        sys.exit(1)

    if not CHROME_COOKIE_FILE.exists():
        log.error(f"Cookie dosyası bulunamadı: {CHROME_COOKIE_FILE}")
        return {}

    try:
        cookies = chrome_cookies("https://x.com", cookie_file=str(CHROME_COOKIE_FILE))
    except Exception as e:
        log.error(f"Cookie okuma hatası: {e}")
        return {}

    auth_token = cookies.get("auth_token", "")
    ct0 = cookies.get("ct0", "")

    if not auth_token:
        log.warning("auth_token bulunamadı. x.com'a giriş yapılmış mı?")
        return {}

    return {
        "auth_token": auth_token,
        "ct0": ct0,
        "twid": cookies.get("twid", ""),
    }


def load_state() -> dict:
    """Önceki sync durumunu oku."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            return {}
    return {}


def save_state(state: dict):
    """Sync durumunu kaydet."""
    STATE_FILE.write_text(json.dumps(state, indent=2))


def cookies_changed(current: dict, previous_hash: str) -> bool:
    """Cookie değişmiş mi kontrol et (gereksiz push'ları önle)."""
    import hashlib
    current_hash = hashlib.sha256(
        (current.get("auth_token", "") + current.get("ct0", "")).encode()
    ).hexdigest()[:16]
    return current_hash != previous_hash, current_hash


def push_to_hetzner(cookies: dict, dry_run: bool = False) -> bool:
    """Cookie'leri SSH ile Hetzner'deki .env dosyasına yaz + PM2 restart."""
    if dry_run:
        log.info(f"[DRY-RUN] Push edilecek: auth_token={cookies['auth_token'][:12]}...")
        return True

    import subprocess

    auth_token = cookies["auth_token"]
    ct0 = cookies["ct0"]

    # SSH ile .env'deki AUTH_TOKEN ve CT0'ı güncelle + PM2 restart
    ssh_script = f"""
set -e

# 1. .env'deki mevcut AUTH_TOKEN/CT0 satırlarını güncelle
sed -i 's|^AUTH_TOKEN=.*|AUTH_TOKEN={auth_token}|' {HETZNER_ENV_FILE}
sed -i 's|^CT0=.*|CT0={ct0}|' {HETZNER_ENV_FILE}

# Eğer satır yoksa ekle
grep -q '^AUTH_TOKEN=' {HETZNER_ENV_FILE} || echo 'AUTH_TOKEN={auth_token}' >> {HETZNER_ENV_FILE}
grep -q '^CT0=' {HETZNER_ENV_FILE} || echo 'CT0={ct0}' >> {HETZNER_ENV_FILE}

echo "ENV_UPDATED"

# 2. Encrypted cookie store'u güncelle (.env'den COOKIE_ENCRYPTION_KEY yükle)
cd {HETZNER_BACKEND_DIR}
set -a; source .env; set +a
source venv/bin/activate
python3 -c "
import sys; sys.path.insert(0, '.')
from services.cookie_store import cookie_store
cookie_store.update_cookies('{auth_token}', '{ct0}')
print('COOKIE_STORE_UPDATED')
"

# 3. PM2 restart (env değişkenlerini yeniden yükle)
pm2 restart {HETZNER_PM2_NAME} --update-env 2>&1 | tail -1
echo "DONE"
"""

    try:
        result = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=10", HETZNER_HOST, ssh_script],
            capture_output=True,
            text=True,
            timeout=30,
        )

        output = result.stdout.strip()
        for line in output.split("\n"):
            log.debug(f"  SSH: {line}")
        if result.stderr:
            for line in result.stderr.strip().split("\n"):
                if line.strip():
                    log.debug(f"  SSH err: {line}")

        env_ok = "ENV_UPDATED" in output
        store_ok = "COOKIE_STORE_UPDATED" in output
        done = "DONE" in output

        if env_ok and store_ok and done:
            log.info("✅ Cookie'ler Hetzner'e push edildi (.env + cookie store + PM2 restart)")
            return True
        elif env_ok and done:
            log.warning("⚠️ .env güncellendi + PM2 restart ama cookie store güncellenemedi")
            return True  # .env yeterli, backend oradan okuyor
        else:
            log.error(f"❌ Push başarısız. env:{env_ok} store:{store_ok} done:{done}")
            log.error(f"  stdout: {output[:300]}")
            return False
    except subprocess.TimeoutExpired:
        log.error("❌ SSH timeout (30s)")
        return False
    except Exception as e:
        log.error(f"❌ SSH hatası: {e}")
        return False


def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv

    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    log.info("🍪 Twitter cookie sync başlıyor...")

    # 1. Chrome'dan cookie çek
    cookies = extract_twitter_cookies()
    if not cookies:
        log.error("Cookie çekilemedi, çıkılıyor.")
        sys.exit(1)

    log.info(f"Cookie çekildi: auth_token={cookies['auth_token'][:12]}... ct0={cookies['ct0'][:12]}...")

    # 2. Değişim kontrolü
    state = load_state()
    changed, current_hash = cookies_changed(cookies, state.get("last_hash", ""))

    if not changed:
        log.info("Cookie değişmemiş, push atlanıyor.")
        # Durumu güncelle (son kontrol zamanı)
        state["last_check"] = datetime.now(timezone.utc).isoformat()
        save_state(state)
        return

    log.info("Cookie değişmiş, Hetzner'e push ediliyor...")

    # 3. Hetzner'e gönder
    success = push_to_hetzner(cookies, dry_run=dry_run)

    # 4. State güncelle
    state["last_check"] = datetime.now(timezone.utc).isoformat()
    if success:
        state["last_push"] = datetime.now(timezone.utc).isoformat()
        state["last_hash"] = current_hash
        state["push_count"] = state.get("push_count", 0) + 1
    save_state(state)

    if success:
        log.info("✅ Sync tamamlandı.")
    else:
        log.error("❌ Sync başarısız.")
        sys.exit(1)


if __name__ == "__main__":
    main()
