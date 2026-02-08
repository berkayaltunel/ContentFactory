"""
In-memory rate limiter - IP bazlı istek sınırlama.
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException


# IP -> [timestamp listesi]
_requests: dict[str, list[float]] = defaultdict(list)

# Ayarlar
MAX_REQUESTS = 10  # Dakikada max istek
WINDOW_SECONDS = 60  # Pencere süresi


async def rate_limit(request: Request):
    """
    Generate endpoint'leri için dakikada 10 istek limiti.
    IP bazlı kontrol yapar, aşılırsa 429 döner.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    # Eski kayıtları temizle
    _requests[client_ip] = [t for t in _requests[client_ip] if t > cutoff]

    if len(_requests[client_ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Çok fazla istek. Dakikada en fazla {MAX_REQUESTS} üretim yapabilirsiniz."
        )

    _requests[client_ip].append(now)
