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
    error: Optional[str] = None


def get_supabase():
    """Get Supabase client from server module."""
    from server import supabase
    return supabase


SINCE_DELTAS = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}


@router.get("")
async def list_trends(
    category: Optional[str] = Query(None),
    since: Optional[str] = Query(None, description="24h, 7d, or 30d"),
    show_hidden: bool = Query(False, description="Show hidden (low-score) trends"),
    limit: int = Query(20, le=100),
    user=Depends(require_auth),
):
    """Trend listesi. Default olarak sadece is_visible=true olanları döner."""
    try:
        sb = get_supabase()
        query = sb.table("trends").select("*").order("score", desc=True).limit(limit)

        if not show_hidden:
            query = query.eq("is_visible", True)

        if category:
            query = query.eq("category", category)

        if since and since in SINCE_DELTAS:
            cutoff = (datetime.now(timezone.utc) - SINCE_DELTAS[since]).isoformat()
            query = query.gte("created_at", cutoff)

        result = query.execute()
        return {"trends": result.data}
    except Exception as e:
        logger.error(f"Trends list error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.post("/refresh")
async def refresh_trends(request: Optional[TrendRefreshRequest] = None, user=Depends(require_auth)):
    """Trend'leri yenile - gerçek RSS verisi + GPT-4o analizi."""
    try:
        from services.trend_engine import trend_engine
        result = await trend_engine.refresh_all()

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
        result = await trend_engine.refresh_all()
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
        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend generate error: {e}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")
