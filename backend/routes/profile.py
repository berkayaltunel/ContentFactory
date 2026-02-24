"""Creator Hub Profile — Master Identity, Brand Voice, Niches.

GET  /profile               — Profil bilgilerini getir
PUT  /profile               — Profil güncelle (Pydantic validated)
POST /profile/avatar        — Avatar yükle (base64 veya URL)
GET  /profile/taxonomy      — Niche taxonomy listesi
POST /profile/analyze-tone  — Twitter'dan AI ile ton analizi
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
import json

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


VALID_AUDIENCES = {"beginners", "professionals", "clevel", "founders"}

AUDIENCE_LABELS = {
    "beginners": "Yeni Başlayanlar / Herkes",
    "professionals": "Sektör Profesyonelleri",
    "clevel": "C-Level / Yöneticiler",
    "founders": "Girişimciler / Yatırımcılar",
}


class BrandVoice(BaseModel):
    tones: BrandVoiceTones = BrandVoiceTones()
    principles: list[str] = Field(default=[], max_length=5)
    avoid: list[str] = Field(default=[], max_length=5)
    sample_voice: str = Field(default="", max_length=500)
    target_audience: Optional[str] = None  # single select

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
                if info:
                    pic_url = info.get("avatar_url") or info.get("profile_image_url", "")
                    if pic_url:
                        pic_url = pic_url.replace("_normal.", "_400x400.").replace("_normal", "_400x400")
                    # Fallback: unavatar.io
                    if not pic_url:
                        pic_url = f"https://unavatar.io/x/{username}"

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


# ═══════════════════════════════════════════
# AI TONE ANALYSIS (Twitter → Brand Voice)
# ═══════════════════════════════════════════

class DnaTestRequest(BaseModel):
    tones: dict = {}
    principles: list = []
    avoid: list = []
    target_audience: Optional[str] = None


@router.post("/dna-test")
async def dna_test(body: DnaTestRequest, user=Depends(require_auth)):
    """DNA ile örnek tweet üret + daily_drafts'a kaydet (bridge to /create)."""
    from server import openai_client
    import random
    import uuid
    from datetime import timedelta
    from routes.trends import NICHE_KEYWORDS
    from prompts.builder_v3 import TONE_VOICE_GUIDES, FEW_SHOT_EXAMPLES, BASE_PROHIBITIONS

    active = {k: v for k, v in body.tones.items() if v and v > 0}
    sorted_t = sorted(active.items(), key=lambda x: -x[1])

    sb = get_supabase()
    profile = sb.table("user_settings").select("niches").eq("user_id", user.id).limit(1).execute()
    niches = profile.data[0].get("niches", []) if profile.data else []

    if not niches:
        raise HTTPException(status_code=400, detail="En az 1 ilgi alanı seçmelisiniz")

    # Trend çek
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    trend_query = sb.table("trends") \
        .select("topic, summary, keywords") \
        .eq("is_visible", True) \
        .gte("created_at", cutoff) \
        .gte("score", 60) \
        .order("score", desc=True) \
        .limit(20) \
        .execute()

    all_trends = trend_query.data or []
    chosen_trend = None

    if all_trends:
        niche_kws = []
        for n in niches:
            niche_kws.extend(NICHE_KEYWORDS.get(n, []))
        niche_kws_lower = [kw.lower() for kw in niche_kws]
        matching = [t for t in all_trends if any(
            nk in (t.get("topic", "") + " ".join(t.get("keywords", []))).lower()
            for nk in niche_kws_lower
        )]
        if matching:
            chosen_trend = random.choice(matching[:5])

    if chosen_trend:
        topic_str = chosen_trend["topic"]
        trend_context = f'Güncel trend: "{chosen_trend["topic"]}". Özet: {chosen_trend.get("summary", "")}'
    else:
        niche_labels_map = {n["slug"]: n["label"] for n in NICHE_TAXONOMY}
        niche_names = [niche_labels_map.get(n, n) for n in niches[:3]]
        fallback_niche = random.choice(niches) if niches else "teknoloji"
        topic_str = niche_labels_map.get(fallback_niche, fallback_niche)
        trend_context = f'{", ".join(niche_names)} alanında zamansız, sektörel bir tespit tweeti üret. Genel motivasyon değil, gerçek bilgi.'

    # Voice section: dominant tonlar + few-shot örnekler
    voice_parts = []

    if body.target_audience:
        aud_guides = {
            "beginners": "HEDEF KİTLE: Yeni başlayanlar. Basit dil, sıfır jargon.",
            "professionals": "HEDEF KİTLE: Sektör profesyonelleri. Teknik derinlik.",
            "clevel": "HEDEF KİTLE: C-Level yöneticiler. Stratejik, ROI odaklı, kısa.",
            "founders": "HEDEF KİTLE: Girişimciler. Büyüme, metrik, cesur öngörü.",
        }
        aud = aud_guides.get(body.target_audience)
        if aud:
            voice_parts.append(aud)

    for key, val in sorted_t[:2]:
        guide = TONE_VOICE_GUIDES.get(key)
        if guide:
            voice_parts.append(f"ANA TON %{val} {guide['label']}: {guide['voice']}")

    if len(sorted_t) >= 2:
        l1 = TONE_VOICE_GUIDES.get(sorted_t[0][0], {}).get("label", sorted_t[0][0])
        l2 = TONE_VOICE_GUIDES.get(sorted_t[1][0], {}).get("label", sorted_t[1][0])
        voice_parts.append(f"SENTEZ: {l1} + {l2} = tek tutarlı ses. Bipolar olma.")

    # Few-shot: dominant tonlara göre örnek seç
    examples = []
    for key, _ in sorted_t[:2]:
        examples.extend(FEW_SHOT_EXAMPLES.get(key, []))
    if not examples:
        examples = FEW_SHOT_EXAMPLES.get("witty", [])
    examples_block = "\n".join(f"  {i+1}. {ex}" for i, ex in enumerate(examples[:3]))

    principles_str = ', '.join(body.principles[:5]) if body.principles else ''
    avoid_str = ', '.join(body.avoid[:5]) if body.avoid else ''

    voice_section = "\n".join(voice_parts)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""Tek bir tweet üret. Sadece tweet metnini döndür, başka hiçbir şey yazma.

{trend_context}

SES:
{voice_section}

{f'İLKELER: {principles_str}' if principles_str else ''}
{f'YASAKLAR: {avoid_str}' if avoid_str else ''}

ÖRNEK TWEETLER (bu ritimde ve formatta yaz, kopyalama):
{examples_block}

KURALLAR:
- Tam olarak yukarıdaki örneklerin ritmi ve formatında yaz
- Setup → boşluk → punchline yapısı kur
- Max 280 karakter. Emoji ve hashtag YASAK
- AI kalıpları ("Unutmayın", "Sonuç olarak") YASAK
- Tespitini yap ve BIRAK. Açıklama ekleme.
- Sadece tweet metnini döndür"""},
                {"role": "user", "content": f"Konu: {topic_str}"}
            ],
            temperature=0.85,
            max_tokens=150,
        )
        content = response.choices[0].message.content.strip().strip('"')

        # Draft'ı daily_drafts'a kaydet (bridge to /create)
        draft_id = str(uuid.uuid4())
        try:
            sb.table("daily_drafts").insert({
                "id": draft_id,
                "user_id": user.id,
                "content": content,
                "platform": "twitter",
                "status": "pending",
                "source": "dna_test",
                "trend_topic": chosen_trend["topic"] if chosen_trend else topic_str,
                "trend_summary": chosen_trend.get("summary") if chosen_trend else None,
                "insight": f"DNA test ile üretildi",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"DNA test draft save error (non-fatal): {e}")
            draft_id = None

        return {
            "success": True,
            "content": content,
            "trend_topic": chosen_trend["topic"] if chosen_trend else topic_str,
            "draft_id": draft_id,
        }
    except Exception as e:
        logger.error(f"DNA test error: {e}")
        raise HTTPException(status_code=500, detail="Örnek üretilemedi")


class AnalyzeToneRequest(BaseModel):
    twitter_username: Optional[str] = None  # Boşsa bağlı hesaptan alır


@router.post("/analyze-tone")
async def analyze_tone(body: AnalyzeToneRequest = AnalyzeToneRequest(), user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Twitter tweetlerinden AI ile marka tonu analizi.
    Son 50 tweeti okur, 5 ton ekseninde yüzdelik dağılım döner.
    """
    from server import openai_client
    from services.twitter_scraper import scraper

    # Username belirle
    username = body.twitter_username
    if not username:
        acc = supabase.table("connected_accounts") \
            .select("username") \
            .eq("user_id", user.id) \
            .eq("platform", "twitter") \
            .is_("deleted_at", "null") \
            .limit(1) \
            .execute()
        if not acc.data:
            raise HTTPException(status_code=404, detail="Bağlı Twitter hesabı bulunamadı. Önce bir hesap ekleyin.")
        username = acc.data[0]["username"]

    username = username.lstrip("@").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Geçerli bir kullanıcı adı gerekli")

    # Tweetleri çek
    try:
        tweets = await scraper.get_user_tweets_async(username, count=50)
    except Exception as e:
        logger.error(f"Tweet fetch failed for @{username}: {e}")
        raise HTTPException(status_code=502, detail="Tweetler alınamadı, lütfen tekrar deneyin")

    if not tweets or len(tweets) < 5:
        raise HTTPException(status_code=422, detail=f"@{username} için yeterli tweet bulunamadı (min 5)")

    tweet_texts = [t.get("content", "") for t in tweets if t.get("content", "").strip()]
    tweet_block = "\n---\n".join(tweet_texts[:50])

    # GPT ile ton analizi
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """Sen uzman bir sosyal medya ton analistisin.
Verilen tweetleri analiz edip yazarın iletişim tonunu 5 eksende yüzdelik olarak belirle.

5 EKSEN:
1. informative: Bilgi verici, öğretici, veri odaklı
2. friendly: Samimi, sıcak, yakın, kişisel
3. witty: Esprili, keskin, mizahi, alaycı
4. aggressive: Agresif, provokatif, sert, direkt
5. inspirational: İlham verici, motive edici, vizyoner

KURALLAR:
- Toplam TAM 100 olmalı
- Her değer 0-100 arası, 5'in katı
- En az 2 eksen 0'dan büyük olmalı
- Tweetlerdeki gerçek tona bak, ne söylediklerine değil nasıl söylediklerine

Ayrıca kısa bir "insight" yaz: Yazarın farkında olmayabileceği bir ton özelliği. Şaşırtıcı, kışkırtıcı ve eğlenceli olsun. Türkçe yaz.

JSON formatında döndür:
{
  "tones": {"informative": 25, "friendly": 30, "witty": 35, "aggressive": 5, "inspirational": 5},
  "insight": "Sen kendini ciddi sanıyorsun ama tweetlerinin %70'i espri kokan cümlelerle başlıyor!",
  "dominant": "witty"
}"""},
                {"role": "user", "content": f"@{username} kullanıcısının son {len(tweet_texts)} tweeti:\n\n{tweet_block}"}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        tones = result.get("tones", {})

        # Validasyon: toplam 100 olmalı
        total = sum(tones.values())
        if total != 100:
            # Normalize et
            factor = 100 / max(total, 1)
            tones = {k: max(0, round(v * factor / 5) * 5) for k, v in tones.items()}
            # Farkı en büyük değere ekle/çıkar
            diff = 100 - sum(tones.values())
            if diff != 0:
                max_key = max(tones, key=tones.get)
                tones[max_key] += diff

        return {
            "success": True,
            "username": username,
            "tones": tones,
            "insight": result.get("insight", ""),
            "dominant": result.get("dominant", ""),
            "tweets_analyzed": len(tweet_texts),
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI analiz sonucu okunamadı")
    except Exception as e:
        logger.error(f"Tone analysis AI error: {e}")
        raise HTTPException(status_code=500, detail="Ton analizi başarısız oldu")
