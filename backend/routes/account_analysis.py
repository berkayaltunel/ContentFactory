"""Hesap analizi route'ları.
POST /api/analyze/account - Twitter hesap analizi
GET /api/analyze/history - Geçmiş analizler
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analysis"])


class AccountAnalysisRequest(BaseModel):
    twitter_username: str
    language: str = "auto"


class GeneratedContent(BaseModel):
    content: str
    variant_index: int = 0
    character_count: int = 0


def get_supabase():
    from server import supabase
    return supabase


@router.post("/account")
async def analyze_account(request: AccountAnalysisRequest, user=Depends(require_auth)):
    """Twitter hesabını analiz et"""
    try:
        from server import openai_client
        from services.twitter_scraper import scraper

        sb = get_supabase()
        username = request.twitter_username.lstrip('@')

        # Kullanıcı bilgisi çek (async, GraphQL fallback destekli)
        user_info = await scraper.get_user_info_async(username)
        if not user_info:
            raise HTTPException(status_code=404, detail=f"@{username} bulunamadı")

        # Tweet'leri çek (async, GraphQL fallback destekli)
        tweets = await scraper.get_user_tweets_async(username, count=200)

        # AI analizi
        tweet_texts = [t.get('content', '') for t in tweets[:100]]
        tweet_summary = "\n---\n".join(tweet_texts)

        lang = "Türkçe" if request.language != "en" else "English"

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""Sen bir sosyal medya analistisin. Twitter hesabını derinlemesine analiz et.
{lang} yaz.

JSON formatında döndür. HER ALAN ZORUNLU:
{{
  "overall_score": 0-100 arası genel skor (integer),
  "summary": "Genel profil değerlendirmesi (3-5 cümle)",
  "dimensions": {{
    "content_quality": 0-100,
    "engagement_rate": 0-100,
    "consistency": 0-100,
    "creativity": 0-100,
    "community": 0-100,
    "growth_potential": 0-100
  }},
  "strengths": [
    {{"title": "Güçlü yön başlığı", "description": "Detaylı açıklama"}},
    ...en az 3 tane
  ],
  "weaknesses": [
    {{"title": "Zayıf yön başlığı", "description": "Detaylı açıklama"}},
    ...en az 3 tane
  ],
  "recommendations": [
    {{"title": "Öneri başlığı", "description": "Detaylı açıklama"}},
    ...en az 3 tane
  ],
  "tone_analysis": "Hesabın genel tonu ve iletişim stili analizi (2-3 cümle)",
  "posting_frequency": "Paylaşım sıklığı ve düzeni analizi (2-3 cümle)",
  "hashtag_strategy": "Hashtag kullanım analizi ve öneriler (2-3 cümle)",
  "growth_tips": "Büyüme stratejisi ve öneriler (3-5 cümle)",
  "top_tweets": [
    {{"content": "Tweet metni", "likes": 123, "retweets": 45, "replies": 10, "why_good": "Neden iyi performans gösterdi"}},
    ...en iyi 3-5 tweet
  ]
}}

SKORLAMA:
- 80+: Profesyonel, tutarlı, yüksek etkileşim
- 60-79: İyi ama geliştirilebilir
- 40-59: Orta, ciddi eksikler var
- <40: Başlangıç seviyesi veya inaktif"""},
                {"role": "user", "content": f"""Hesap: @{username}
Bio: {user_info.get('bio', 'N/A')}
Takipçi: {user_info.get('followers', 0)}
Takip: {user_info.get('following', 0)}

Son {len(tweet_texts)} tweet:
{tweet_summary}"""}
            ],
            temperature=0.5,
            response_format={"type": "json_object"}
        )

        import json
        analysis = json.loads(response.choices[0].message.content)

        # Veritabanına kaydet
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "twitter_username": username,
            "display_name": user_info.get('name', ''),
            "bio": user_info.get('bio', ''),
            "followers_count": user_info.get('followers', 0),
            "following_count": user_info.get('following', 0),
            "tweet_count": len(tweets),
            "analysis": analysis,
            "top_tweets": sorted(tweets, key=lambda t: t.get('likes', 0), reverse=True)[:5],
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "recommendations": analysis.get("recommendations", []),
            "posting_patterns": analysis.get("posting_patterns", {}),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            sb.table("account_analyses").insert(record).execute()
        except Exception as db_err:
            logger.warning(f"DB insert failed (table may not exist): {db_err}")

        return {
            "success": True,
            "username": username,
            "display_name": user_info.get('name', ''),
            "followers": user_info.get('followers', 0),
            "tweets_analyzed": len(tweets),
            "analysis": analysis
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account analysis error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.get("/history")
async def get_analysis_history(limit: int = Query(20, le=100), user=Depends(require_auth)):
    """Geçmiş analizleri getir"""
    try:
        sb = get_supabase()
        result = sb.table("account_analyses").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit).execute()
        return result.data
    except Exception as e:
        logger.error(f"Analysis history error: {e}")
        return []
