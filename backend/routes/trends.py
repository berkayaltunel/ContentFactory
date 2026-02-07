"""Trend takip ve trend bazlı içerik üretim route'ları.
GET /api/trends - Trend listesi (kategori filtreli)
POST /api/trends/refresh - Trend yenileme
GET /api/trends/{id} - Trend detayı
POST /api/trends/{id}/generate - Trend'den içerik üret
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trends", tags=["trends"])


class TrendRefreshRequest(BaseModel):
    category: Optional[str] = None  # tech, crypto, gundem, lifestyle, ai, business


class TrendGenerateRequest(BaseModel):
    platform: str = "twitter"  # twitter, linkedin, instagram, blog, tiktok, youtube
    format: Optional[str] = None
    language: str = "auto"
    additional_context: Optional[str] = None


class GeneratedContent(BaseModel):
    content: str
    variant_index: int = 0
    character_count: int = 0


class GenerationResponse(BaseModel):
    success: bool
    variants: List[GeneratedContent]
    error: Optional[str] = None


def get_supabase():
    from server import supabase
    return supabase


@router.get("")
async def list_trends(
    category: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
):
    """Trend listesi"""
    try:
        sb = get_supabase()
        query = sb.table("trends").select("*").order("score", desc=True).limit(limit)
        if category:
            query = query.eq("category", category)
        result = query.execute()
        return result.data
    except Exception as e:
        logger.error(f"Trends list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_trends(request: TrendRefreshRequest):
    """Trend'leri yenile (AI ile güncel konuları analiz et)"""
    try:
        from server import openai_client
        sb = get_supabase()

        category_ctx = f"Kategori: {request.category}" if request.category else "Tüm kategoriler: tech, crypto, gündem, lifestyle, ai, business"

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"""Sen bir trend analisti sin. Şu anki güncel trendleri analiz et.
{category_ctx}

Her trend için JSON formatında döndür:
[
  {{
    "topic": "trend konusu",
    "category": "tech|crypto|gundem|lifestyle|ai|business",
    "score": 0-100,
    "ai_summary": "2-3 cümle özet",
    "ai_content_suggestions": ["içerik önerisi 1", "içerik önerisi 2"]
  }}
]

5-10 güncel trend döndür. Gerçekçi ve güncel ol."""},
                {"role": "user", "content": "Güncel trendleri analiz et ve JSON olarak döndür."}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        import json
        trends_data = json.loads(response.choices[0].message.content)
        trends_list = trends_data.get("trends", trends_data.get("data", []))
        if isinstance(trends_data, list):
            trends_list = trends_data

        inserted = 0
        for trend in trends_list:
            if not isinstance(trend, dict) or not trend.get("topic"):
                continue
            sb.table("trends").insert({
                "id": str(uuid.uuid4()),
                "topic": trend["topic"],
                "category": trend.get("category", "gundem"),
                "source": "ai",
                "score": trend.get("score", 50),
                "ai_summary": trend.get("ai_summary", ""),
                "ai_content_suggestions": trend.get("ai_content_suggestions", []),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            inserted += 1

        return {"success": True, "trends_added": inserted}

    except Exception as e:
        logger.error(f"Trends refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories():
    """Mevcut trend kategorileri"""
    return ["ai", "tech", "crypto", "gundem", "business", "lifestyle"]


@router.get("/{trend_id}")
async def get_trend(trend_id: str):
    """Trend detayı"""
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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trend_id}/generate", response_model=GenerationResponse)
async def generate_from_trend(trend_id: str, request: TrendGenerateRequest):
    """Trend'den içerik üret"""
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

        system_prompt = f"""
{BANNED_PATTERNS}

## GÖREV: TREND BAZLI İÇERİK ÜRET

{platform_prompt}

## TREND BİLGİSİ:
Konu: {trend['topic']}
Kategori: {trend.get('category', 'genel')}
Özet: {trend.get('ai_summary', '')}
İçerik önerileri: {trend.get('ai_content_suggestions', [])}

## DİL
{lang}

{"## EK BAĞLAM" + chr(10) + request.additional_context if request.additional_context else ""}

Emoji kullanma. AI template kalıpları kullanma. Doğal ve özgün yaz.
"""

        contents = await generate_with_openai(system_prompt, "Trend bazlı içeriği üret.", 1)
        variants = [GeneratedContent(content=contents[0], variant_index=0, character_count=len(contents[0]))]
        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend generate error: {e}")
        return GenerationResponse(success=False, variants=[], error=str(e))
