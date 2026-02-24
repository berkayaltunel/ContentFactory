"""Creator Hub Profile — Master Identity, Brand Voice, Niches.

GET  /profile          — Profil bilgilerini getir
PUT  /profile          — Profil güncelle (Pydantic validated)
POST /profile/avatar   — Avatar yükle (base64 veya URL)
GET  /profile/taxonomy — Niche taxonomy listesi
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from middleware.auth import require_auth
from datetime import datetime, timezone
from typing import Optional
import logging
import httpx
import base64
import uuid

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger(__name__)


def get_supabase():
    from server import supabase
    return supabase


# ═══════════════════════════════════════════
# NICHE TAXONOMY
# ═══════════════════════════════════════════

NICHE_TAXONOMY = [
    {"slug": "ai", "label": "Yapay Zeka / AI", "emoji": "🤖"},
    {"slug": "saas", "label": "SaaS", "emoji": "☁️"},
    {"slug": "startup", "label": "Girişimcilik", "emoji": "🚀"},
    {"slug": "marketing", "label": "Dijital Pazarlama", "emoji": "📈"},
    {"slug": "crypto", "label": "Kripto / Web3", "emoji": "🪙"},
    {"slug": "ecommerce", "label": "E-Ticaret", "emoji": "🛒"},
    {"slug": "design", "label": "Tasarım / UI-UX", "emoji": "🎨"},
    {"slug": "dev", "label": "Yazılım Geliştirme", "emoji": "💻"},
    {"slug": "data", "label": "Veri Bilimi", "emoji": "📊"},
    {"slug": "content", "label": "İçerik Üretimi", "emoji": "✍️"},
    {"slug": "video", "label": "Video / YouTube", "emoji": "🎬"},
    {"slug": "gaming", "label": "Oyun / Gaming", "emoji": "🎮"},
    {"slug": "finance", "label": "Finans / Yatırım", "emoji": "💰"},
    {"slug": "health", "label": "Sağlık / Wellness", "emoji": "🏥"},
    {"slug": "fitness", "label": "Fitness / Spor", "emoji": "💪"},
    {"slug": "food", "label": "Yemek / Gastronomi", "emoji": "🍽️"},
    {"slug": "travel", "label": "Seyahat", "emoji": "✈️"},
    {"slug": "education", "label": "Eğitim", "emoji": "📚"},
    {"slug": "music", "label": "Müzik", "emoji": "🎵"},
    {"slug": "fashion", "label": "Moda", "emoji": "👗"},
    {"slug": "photography", "label": "Fotoğrafçılık", "emoji": "📷"},
    {"slug": "realestate", "label": "Emlak", "emoji": "🏠"},
    {"slug": "law", "label": "Hukuk", "emoji": "⚖️"},
    {"slug": "hr", "label": "İnsan Kaynakları", "emoji": "👥"},
    {"slug": "sustainability", "label": "Sürdürülebilirlik", "emoji": "🌱"},
    {"slug": "politics", "label": "Politika / Gündem", "emoji": "🗳️"},
    {"slug": "science", "label": "Bilim", "emoji": "🔬"},
    {"slug": "automotive", "label": "Otomotiv", "emoji": "🚗"},
    {"slug": "parenting", "label": "Ebeveynlik", "emoji": "👶"},
    {"slug": "pets", "label": "Evcil Hayvanlar", "emoji": "🐾"},
    {"slug": "diy", "label": "Kendin Yap / DIY", "emoji": "🔧"},
    {"slug": "motivation", "label": "Motivasyon / Kişisel Gelişim", "emoji": "🌟"},
    {"slug": "books", "label": "Kitap / Okuma", "emoji": "📖"},
    {"slug": "cinema", "label": "Sinema / Dizi", "emoji": "🎥"},
    {"slug": "art", "label": "Sanat", "emoji": "🖼️"},
    {"slug": "news", "label": "Habercilik", "emoji": "📰"},
    {"slug": "security", "label": "Siber Güvenlik", "emoji": "🔒"},
    {"slug": "nocode", "label": "No-Code / Low-Code", "emoji": "⚡"},
    {"slug": "freelance", "label": "Freelance / Uzaktan Çalışma", "emoji": "🏡"},
    {"slug": "community", "label": "Topluluk Yönetimi", "emoji": "🤝"},
]

VALID_NICHE_SLUGS = {n["slug"] for n in NICHE_TAXONOMY}


# ═══════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════

class BrandVoiceTones(BaseModel):
    informative: int = Field(40, ge=0, le=100)
    friendly: int = Field(40, ge=0, le=100)
    witty: int = Field(20, ge=0, le=100)
    aggressive: int = Field(0, ge=0, le=100)
    inspirational: int = Field(0, ge=0, le=100)

    @model_validator(mode="after")
    def total_must_be_100(self):
        total = self.informative + self.friendly + self.witty + self.aggressive + self.inspirational
        if total != 100:
            raise ValueError(f"Ton toplamı 100 olmalı, şu an {total}")
        return self


class BrandVoice(BaseModel):
    tones: BrandVoiceTones = BrandVoiceTones()
    principles: list[str] = Field(default=[], max_length=5)
    avoid: list[str] = Field(default=[], max_length=5)
    sample_voice: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def clean_lists(self):
        self.principles = [p.strip()[:200] for p in self.principles if p.strip()]
        self.avoid = [a.strip()[:200] for a in self.avoid if a.strip()]
        return self


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=100)
    niches: list[str] = Field(default=[], max_length=10)
    brand_voice: Optional[BrandVoice] = None

    @model_validator(mode="after")
    def validate_niches(self):
        invalid = [n for n in self.niches if n not in VALID_NICHE_SLUGS]
        if invalid:
            raise ValueError(f"Geçersiz niche slug'ları: {invalid}")
        return self


class AvatarUpdate(BaseModel):
    """Avatar: base64 data veya platform'dan çek."""
    source: str = Field(..., pattern="^(upload|twitter|instagram|tiktok)$")
    data: Optional[str] = None  # base64 (upload için)
    content_type: Optional[str] = Field(None, pattern="^image/(jpeg|png|webp)$")


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("/taxonomy")
async def get_taxonomy():
    """Niche taxonomy listesi (public, auth gerektirmez)."""
    return NICHE_TAXONOMY


@router.get("")
async def get_profile(user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Kullanıcı profil bilgilerini getir."""
    result = supabase.table("user_settings") \
        .select("display_name, title, avatar_url, niches, brand_voice") \
        .eq("user_id", user.id) \
        .limit(1) \
        .execute()

    if not result.data:
        # Default profil
        return {
            "display_name": None,
            "title": None,
            "avatar_url": None,
            "niches": [],
            "brand_voice": BrandVoice().model_dump(),
        }

    profile = result.data[0]
    # brand_voice boşsa default template döndür
    if not profile.get("brand_voice"):
        profile["brand_voice"] = BrandVoice().model_dump()
    if not profile.get("niches"):
        profile["niches"] = []

    return profile


@router.put("")
async def update_profile(body: ProfileUpdate, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Profil güncelle (validated)."""
    now = datetime.now(timezone.utc).isoformat()

    update_data = {"updated_at": now}

    if body.display_name is not None:
        update_data["display_name"] = body.display_name.strip() or None
    if body.title is not None:
        update_data["title"] = body.title.strip() or None
    if body.niches is not None:
        update_data["niches"] = body.niches
    if body.brand_voice is not None:
        update_data["brand_voice"] = body.brand_voice.model_dump()

    result = supabase.table("user_settings") \
        .upsert({"user_id": user.id, **update_data}, on_conflict="user_id") \
        .execute()

    return {"success": True, "profile": result.data[0] if result.data else update_data}


@router.post("/avatar")
async def update_avatar(body: AvatarUpdate, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Avatar güncelle: upload (base64) veya platform'dan çek."""
    now = datetime.now(timezone.utc).isoformat()
    avatar_url = None

    if body.source == "upload":
        # Base64 upload → Supabase Storage
        if not body.data:
            raise HTTPException(status_code=400, detail="Upload için data (base64) gerekli")

        content_type = body.content_type or "image/jpeg"
        ext = content_type.split("/")[1]
        file_name = f"avatars/{user.id}/{uuid.uuid4().hex}.{ext}"

        try:
            file_bytes = base64.b64decode(body.data)
        except Exception:
            raise HTTPException(status_code=400, detail="Geçersiz base64 data")

        # Max 2MB
        if len(file_bytes) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Avatar max 2MB olabilir")

        try:
            supabase.storage.from_("public-assets").upload(
                file_name, file_bytes,
                {"content-type": content_type, "upsert": "true"}
            )
            avatar_url = f"{supabase.supabase_url}/storage/v1/object/public/public-assets/{file_name}"
        except Exception as e:
            logger.error(f"Avatar upload failed: {e}")
            raise HTTPException(status_code=500, detail="Avatar yüklenemedi")

    else:
        # Platform'dan çek
        platform = body.source  # twitter, instagram, tiktok

        # Kullanıcının bu platformdaki hesabını bul
        acc = supabase.table("connected_accounts") \
            .select("username") \
            .eq("user_id", user.id) \
            .eq("platform", platform) \
            .is_("deleted_at", "null") \
            .limit(1) \
            .execute()

        if not acc.data:
            raise HTTPException(status_code=404, detail=f"{platform} hesabı bulunamadı")

        username = acc.data[0]["username"]
        pic_url = None

        try:
            if platform == "twitter":
                from services.twitter_scraper import scraper
                info = await scraper.get_user_info_async(username)
                pic_url = info.get("profile_image_url", "").replace("_normal", "_400x400") if info else None

            elif platform == "instagram":
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}",
                        headers={"User-Agent": "Instagram 219.0.0.12.117", "X-IG-App-ID": "936619743392459"}
                    )
                    if r.status_code == 200:
                        data = r.json()
                        pic_url = data.get("data", {}).get("user", {}).get("profile_pic_url_hd")

            elif platform == "tiktok":
                # TikTok avatar: basit scrape, ileride geliştirilebilir
                pass

        except Exception as e:
            logger.warning(f"Avatar fetch from {platform} failed: {e}")
            raise HTTPException(status_code=502, detail=f"{platform}'dan avatar alınamadı")

        if not pic_url:
            raise HTTPException(status_code=404, detail=f"{platform}'da profil fotoğrafı bulunamadı")

        # Platform avatar'ı kendi storage'ımıza kopyala (hotlink değil)
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                img_resp = await client.get(pic_url)
                img_resp.raise_for_status()

            img_bytes = img_resp.content
            ct = img_resp.headers.get("content-type", "image/jpeg")
            ext = "jpg" if "jpeg" in ct else ("png" if "png" in ct else "webp")
            file_name = f"avatars/{user.id}/{uuid.uuid4().hex}.{ext}"

            supabase.storage.from_("public-assets").upload(
                file_name, img_bytes,
                {"content-type": ct, "upsert": "true"}
            )
            avatar_url = f"{supabase.supabase_url}/storage/v1/object/public/public-assets/{file_name}"
        except Exception as e:
            logger.error(f"Avatar storage copy failed: {e}")
            raise HTTPException(status_code=500, detail="Avatar kaydedilemedi")

    # DB güncelle
    supabase.table("user_settings") \
        .upsert({"user_id": user.id, "avatar_url": avatar_url, "updated_at": now}, on_conflict="user_id") \
        .execute()

    return {"success": True, "avatar_url": avatar_url}
