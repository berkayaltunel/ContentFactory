"""AI Coach route'ları.
GET /api/coach/insights - Kullanıcının üretim geçmişi analizi + öneriler
GET /api/coach/weekly-plan - Haftalık içerik planı önerisi
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from middleware.auth import require_auth
from typing import Optional, List
from collections import Counter
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coach", tags=["coach"])


def get_supabase():
    from server import supabase
    return supabase


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        return user_response.user.id
    except Exception:
        return None


@router.get("/insights")
async def get_insights(user=Depends(require_auth)):
    """Kullanıcının üretim geçmişini analiz et ve öneriler sun"""
    try:
        sb = get_supabase()
        from server import openai_client

        # Son 100 üretimi çek
        query = sb.table("generations").select("*").order("created_at", desc=True).limit(100)
        if user:
            query = query.eq("user_id", user.id)
        result = query.execute()
        generations = result.data or []

        if len(generations) < 3:
            return {
                "total_generations": len(generations),
                "insights": [],
                "stats": {},
                "message": "Yeterli veri yok. En az 3 üretim yapmanız gerekiyor."
            }

        # İstatistik hesapla
        persona_counts = Counter(g.get("persona", "unknown") for g in generations)
        tone_counts = Counter(g.get("tone", "unknown") for g in generations)
        length_counts = Counter(g.get("length", "unknown") for g in generations)
        type_counts = Counter(g.get("type", "tweet") for g in generations)
        knowledge_counts = Counter(g.get("knowledge") for g in generations if g.get("knowledge"))
        mode_counts = Counter("apex" if g.get("is_ultra") else "classic" for g in generations)

        # Favori oranı
        fav_query = sb.table("favorites").select("id", count="exact")
        if user:
            fav_query = fav_query.eq("user_id", user.id)
        fav_count = fav_query.execute().count or 0

        stats = {
            "total": len(generations),
            "favorites": fav_count,
            "favorite_ratio": round(fav_count / max(len(generations), 1) * 100, 1),
            "personas": dict(persona_counts.most_common()),
            "tones": dict(tone_counts.most_common()),
            "lengths": dict(length_counts.most_common()),
            "types": dict(type_counts.most_common()),
            "knowledge_modes": dict(knowledge_counts.most_common()),
            "modes": dict(mode_counts.most_common()),
            "top_persona": persona_counts.most_common(1)[0][0] if persona_counts else None,
            "top_tone": tone_counts.most_common(1)[0][0] if tone_counts else None,
            "least_used_persona": persona_counts.most_common()[-1][0] if len(persona_counts) > 1 else None,
        }

        # GPT-4o ile kişisel öneriler
        if not openai_client:
            return {"total_generations": len(generations), "stats": stats, "insights": []}

        stats_summary = json.dumps(stats, ensure_ascii=False, indent=2)

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """Sen bir sosyal medya koçusun. Kullanıcının içerik üretim istatistiklerini analiz edip kişiselleştirilmiş öneriler vereceksin.

Türkçe yaz. Kısa ve actionable öneriler ver. Her öneri 1-2 cümle.

JSON formatında döndür:
{
  "insights": [
    {
      "type": "tip|warning|suggestion|praise",
      "title": "Kısa başlık",
      "description": "Detaylı açıklama",
      "action": "Yapılacak aksiyon (opsiyonel)"
    }
  ]
}

3-5 öneri ver."""},
                {"role": "user", "content": f"Kullanıcının üretim istatistikleri:\n{stats_summary}\n\nAnaliz et ve öneriler ver."}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        insights_data = json.loads(response.choices[0].message.content)
        insights = insights_data.get("insights", [])

        return {
            "total_generations": len(generations),
            "stats": stats,
            "insights": insights
        }

    except Exception as e:
        logger.error(f"Coach insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-plan")
async def get_weekly_plan(
    niche: str = "tech",
    user=Depends(require_auth)
):
    """Haftalık içerik planı önerisi"""
    try:
        from server import openai_client

        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI yapılandırılmamış")

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"""Sen bir sosyal medya stratejisti sin. {niche} niche'i için haftalık Twitter içerik planı oluştur.

JSON formatında döndür:
{{
  "plan": [
    {{
      "day": "Pazartesi",
      "content_type": "tweet|thread|quote|article",
      "topic_suggestion": "Konu önerisi",
      "persona": "otorite|insider|saf|mentalist|haber",
      "tone": "natural|raw|polished|unhinged",
      "best_time": "09:00",
      "reasoning": "Neden bu gün bu içerik"
    }}
  ],
  "weekly_goal": "Bu haftanın hedefi"
}}

7 gün için plan oluştur. Türkçe yaz."""},
                {"role": "user", "content": f"Niche: {niche}. Haftalık içerik planı oluştur."}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        plan_data = json.loads(response.choices[0].message.content)
        return plan_data

    except Exception as e:
        logger.error(f"Coach weekly plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
