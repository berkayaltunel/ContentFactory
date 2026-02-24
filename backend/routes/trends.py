"""Trend takip ve trend bazlı içerik üretim route'ları.

GET /api/trends - Trend listesi (kategori filtreli, is_visible=true default)
POST /api/trends/refresh - Trend yenileme (gerçek RSS + GPT-4o analiz)
POST /api/trends/auto-refresh - Cron job endpoint (secret header ile korunan)
GET /api/trends/categories - Kategori listesi
GET /api/trends/{id} - Trend detayı
POST /api/trends/{id}/generate - Trend'den içerik üret
"""
from fastapi import APIRouter, HTTPException, Query, Depends, Header, Request
from middleware.auth import require_auth
from middleware.rate_limit import rate_limit
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trends", tags=["trends"])


class TrendRefreshRequest(BaseModel):
    """Trend yenileme isteği."""
    category: Optional[str] = None


class TrendGenerateRequest(BaseModel):
    """Trend'den içerik üretme isteği."""
    platform: str = "twitter"
    format: Optional[str] = None
    language: str = "auto"
    additional_context: Optional[str] = None


class GeneratedContent(BaseModel):
    """Üretilen içerik."""
    content: str
    variant_index: int = 0
    character_count: int = 0


class GenerationResponse(BaseModel):
    """İçerik üretim yanıtı."""
    success: bool
    variants: List[GeneratedContent]
    generation_id: Optional[str] = None
    error: Optional[str] = None


def get_supabase():
    """Get Supabase client from server module."""
    from server import supabase
    return supabase


SINCE_DELTAS = {
    "6h": timedelta(hours=6),
    "24h": timedelta(hours=24),
    "48h": timedelta(hours=48),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}


# Niche -> Trend keyword mapping (OR semantics)
NICHE_KEYWORDS = {
    "ai": ["AI", "yapay zeka", "machine learning", "LLM", "GPT", "deep learning", "OpenAI", "Anthropic", "model"],
    "saas": ["SaaS", "subscription", "cloud", "B2B", "ARR", "churn"],
    "startup": ["startup", "girişim", "funding", "VC", "seed", "YC"],
    "marketing": ["marketing", "pazarlama", "SEO", "growth", "conversion"],
    "crypto": ["crypto", "kripto", "Bitcoin", "Ethereum", "blockchain", "Web3", "DeFi"],
    "ecommerce": ["e-ticaret", "ecommerce", "marketplace", "Shopify"],
    "design": ["tasarım", "design", "UI", "UX", "Figma"],
    "dev": ["developer", "yazılım", "GitHub", "open source", "framework", "API"],
    "data": ["data", "veri", "analytics", "SQL", "pipeline"],
    "content": ["içerik", "content", "creator", "influencer", "viral"],
    "video": ["video", "YouTube", "streaming"],
    "gaming": ["gaming", "oyun", "esports", "Steam"],
    "finance": ["finans", "borsa", "yatırım", "investment", "ekonomi"],
    "health": ["sağlık", "health", "wellness", "biotech"],
    "fitness": ["fitness", "spor", "antrenman"],
    "food": ["yemek", "food", "restoran", "gastronomi"],
    "travel": ["seyahat", "travel", "turizm"],
    "education": ["eğitim", "education", "kurs", "online learning"],
    "music": ["müzik", "music", "Spotify"],
    "fashion": ["moda", "fashion", "stil"],
    "photography": ["fotoğraf", "photography", "kamera"],
    "realestate": ["emlak", "real estate", "konut"],
    "law": ["hukuk", "KVKK", "GDPR", "regülasyon"],
    "hr": ["HR", "işe alım", "hiring", "remote work"],
    "sustainability": ["sürdürülebilirlik", "iklim", "ESG"],
    "politics": ["politika", "seçim", "gündem"],
    "science": ["bilim", "science", "araştırma", "uzay", "NASA"],
    "automotive": ["otomotiv", "EV", "Tesla", "elektrikli"],
    "parenting": ["ebeveyn", "çocuk", "parenting"],
    "pets": ["evcil", "kedi", "köpek"],
    "diy": ["DIY", "kendin yap", "maker"],
    "motivation": ["motivasyon", "kişisel gelişim", "mindset"],
    "books": ["kitap", "book", "okuma"],
    "cinema": ["sinema", "film", "dizi", "Netflix"],
    "art": ["sanat", "galeri", "sergi"],
    "news": ["haber", "son dakika", "breaking"],
    "security": ["güvenlik", "siber", "hack", "malware"],
    "nocode": ["no-code", "low-code", "n8n", "Zapier", "automation"],
    "freelance": ["freelance", "uzaktan", "remote"],
    "community": ["topluluk", "community", "Discord"],
}


def _get_niche_keywords(user_id: str, sb) -> list:
    """Fetch user niches and expand to keyword list."""
    try:
        result = sb.table("user_settings").select("niches").eq("user_id", user_id).limit(1).execute()
        if not result.data or not result.data[0].get("niches"):
            return []
        keywords = []
        for niche in result.data[0]["niches"]:
            keywords.extend(NICHE_KEYWORDS.get(niche, []))
        return keywords
    except Exception:
        return []


@router.get("")
async def list_trends(
    category: Optional[str] = Query(None),
    since: Optional[str] = Query("48h", description="6h, 24h, 48h, 7d, 30d, or all"),
    show_hidden: bool = Query(False, description="Show hidden (low-score) trends"),
    archived: bool = Query(False, description="Show archived trends"),
    limit: int = Query(20, le=100),
    niche_filter: bool = Query(False, description="Filter by user niches"),
    user=Depends(require_auth),
):
    """Trend listesi. Default olarak sadece is_visible=true olanları döner."""
    try:
        sb = get_supabase()
        query = sb.table("trends").select("*").order("score", desc=True).limit(limit)

        if not show_hidden:
            query = query.eq("is_visible", True)

        if archived:
            query = query.eq("is_archived", True)
        else:
            query = query.or_("is_archived.is.null,is_archived.eq.false")

        if category:
            query = query.eq("category", category)

        if since and since != "all" and since in SINCE_DELTAS:
            cutoff = (datetime.now(timezone.utc) - SINCE_DELTAS[since]).isoformat()
            query = query.gte("created_at", cutoff)

        result = query.execute()
        trends = result.data or []
        
        # Niche filtering (OR: trend matches ANY user niche keyword)
        if niche_filter:
            niche_kws = _get_niche_keywords(user.id, sb)
            if niche_kws:
                niche_kws_lower = [kw.lower() for kw in niche_kws]
                def matches_niche(t):
                    t_kws = [k.lower() for k in (t.get("keywords") or [])]
                    if any(nk in tk or tk in nk for nk in niche_kws_lower for tk in t_kws):
                        return True
                    topic_lower = (t.get("topic") or "").lower()
                    return any(nk in topic_lower for nk in niche_kws_lower)
                filtered = [t for t in trends if matches_niche(t)]
                if len(filtered) < 3:
                    filtered.extend([t for t in trends if t not in filtered][:max(0, 5 - len(filtered))])
                trends = filtered
        
        return {"trends": trends}
    except Exception as e:
        logger.error(f"Trends list error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.post("/archive-old")
async def archive_old_trends(user=Depends(require_auth)):
    """48 saatten eski trendleri arşivle."""
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    result = sb.table("trends").update({"is_archived": True}).lt("created_at", cutoff).eq("is_archived", False).execute()
    count = len(result.data) if result.data else 0
    return {"archived": count, "cutoff": cutoff}


@router.post("/refresh")
async def refresh_trends(request: Optional[TrendRefreshRequest] = None, user=Depends(require_auth)):
    """Trend'leri yenile - RSS + Twitter + GPT-4o analizi."""
    try:
        from services.trend_engine import trend_engine
        result = await trend_engine.refresh_all(include_twitter_search=True)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Trend yenileme başarısız"))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trends refresh error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.post("/auto-refresh")
async def auto_refresh_trends(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret"),
):
    """Cron job endpoint - secret header ile korunan, auth gerektirmez."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid cron secret")

    try:
        from services.trend_engine import trend_engine
        from datetime import datetime, timezone

        # Keyword search sadece 06:00, 14:00, 22:00 saatlerinde (günde 3)
        current_hour = datetime.now(timezone.utc).hour
        search_hours = {3, 11, 19}  # UTC (Istanbul 06, 14, 22)
        include_search = current_hour in search_hours

        result = await trend_engine.refresh_all(include_twitter_search=include_search)
        return result
    except Exception as e:
        logger.error(f"Auto-refresh error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.get("/categories")
async def get_categories(user=Depends(require_auth)):
    """Mevcut trend kategorileri."""
    return ["ai", "tech", "crypto", "gundem", "business", "lifestyle"]


@router.get("/{trend_id}")
async def get_trend(trend_id: str, user=Depends(require_auth)):
    """Trend detayı."""
    try:
        sb = get_supabase()
        result = sb.table("trends").select("*").eq("id", trend_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Trend bulunamadı")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend detail error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.post("/{trend_id}/generate", response_model=GenerationResponse)
async def generate_from_trend(trend_id: str, request: TrendGenerateRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Trend'den içerik üret. raw_content varsa daha zengin context sağlar."""
    try:
        from server import generate_with_openai
        from prompts.quality import BANNED_PATTERNS

        sb = get_supabase()
        result = sb.table("trends").select("*").eq("id", trend_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Trend bulunamadı")

        trend = result.data[0]
        lang = "Türkçe yaz." if request.language == "tr" else "İngilizce yaz." if request.language == "en" else "Konunun diline göre otomatik yaz."

        platform_prompts = {
            "twitter": "Twitter tweet formatında yaz. Kısa, punch'lı, viral potansiyeli yüksek.",
            "linkedin": "LinkedIn post formatında yaz. Profesyonel, insight odaklı, kısa paragraflarla.",
            "instagram": "Instagram caption formatında yaz. Kısa paragraflar, hook ile başla.",
            "blog": "Blog yazısı taslağı oluştur. SEO uyumlu, detaylı.",
            "tiktok": "TikTok script formatında yaz. 30sn, hook-heavy, hızlı tempo.",
            "youtube": "YouTube video fikri ve kısa script oluştur."
        }

        platform_prompt = platform_prompts.get(request.platform, platform_prompts["twitter"])

        # Build rich context with raw_content if available
        raw_context = ""
        if trend.get("raw_content"):
            raw_context = f"\n## KAYNAK İÇERİK:\n{trend['raw_content'][:1000]}\n"

        source_url = ""
        if trend.get("url"):
            source_url = f"\nKaynak URL: {trend['url']}"

        system_prompt = f"""
{BANNED_PATTERNS}

## GÖREV: TREND BAZLI İÇERİK ÜRET

{platform_prompt}

## TREND BİLGİSİ:
Konu: {trend['topic']}
Kategori: {trend.get('category', 'genel')}
Özet: {trend.get('summary', '')}
Keywords: {trend.get('keywords', [])}
İçerik açısı: {trend.get('content_angle', '')}
{source_url}
{raw_context}

## DİL
{lang}

{"## EK BAĞLAM" + chr(10) + request.additional_context if request.additional_context else ""}

Emoji kullanma. AI template kalıpları kullanma. Doğal ve özgün yaz.
"""

        result_tuple = await generate_with_openai(system_prompt, "Trend bazlı içeriği üret.", 1)
        contents = result_tuple[0] if isinstance(result_tuple, tuple) else result_tuple
        text = contents[0] if contents else ""
        variants = [GeneratedContent(content=text, variant_index=0, character_count=len(text))]

        # Veritabanına kaydet (geçmişte görünsün)
        gen_id = None
        try:
            gen_result = sb.table("generations").insert({
                "type": request.platform,
                "user_id": user.id,
                "topic": trend["topic"],
                "mode": "trend",
                "language": request.language,
                "additional_context": request.additional_context,
                "is_ultra": False,
                "variant_count": 1,
                "variants": [v.model_dump(mode="json") for v in variants],
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            gen_id = gen_result.data[0]["id"] if gen_result.data else None
        except Exception as save_err:
            logger.warning(f"Trend generation DB save failed (content still returned): {save_err}")

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend generate error: {e}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")
