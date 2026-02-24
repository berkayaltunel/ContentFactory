"""Magic Morning — JIT daily draft generator.

Kullanıcı giriş yaptığında, bugün için taslak yoksa:
1. Kullanıcının niche'lerine uygun top 3 trendi seç (semantic dedup)
2. brand_voice DNA ile 3 farklı tweet taslağı üret
3. daily_drafts tablosuna kaydet, cache olarak döndür

Maliyet: ~$0.003/kullanıcı/gün (sadece giriş yapanlara)
"""
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from openai import OpenAI

logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


def _get_supabase():
    from server import supabase
    return supabase


def _select_diverse_trends(trends: list, count: int = 3) -> list:
    """Top trendlerden semantic olarak farklı olanları seç.
    
    Basit yaklaşım: keyword overlap ile dedup.
    Cosine similarity yerine keyword jaccard distance kullanıyoruz (zero-cost, embedding gerektirmez).
    """
    if len(trends) <= count:
        return trends

    selected = [trends[0]]  # En yüksek skorlu her zaman dahil

    for trend in trends[1:]:
        if len(selected) >= count:
            break

        # Keyword overlap kontrolü
        t_keywords = set(k.lower() for k in (trend.get("keywords") or []))
        t_topic_words = set(trend.get("topic", "").lower().split())
        t_all = t_keywords | t_topic_words

        is_duplicate = False
        for sel in selected:
            s_keywords = set(k.lower() for k in (sel.get("keywords") or []))
            s_topic_words = set(sel.get("topic", "").lower().split())
            s_all = s_keywords | s_topic_words

            # Jaccard similarity
            if t_all and s_all:
                overlap = len(t_all & s_all) / len(t_all | s_all)
                if overlap > 0.3:  # %30+ overlap = muhtemelen aynı konu
                    is_duplicate = True
                    break

        if not is_duplicate:
            selected.append(trend)

    # Yeterli bulunamadıysa sırayla ekle
    if len(selected) < count:
        for trend in trends:
            if trend not in selected:
                selected.append(trend)
            if len(selected) >= count:
                break

    return selected[:count]


async def _generate_evergreen_drafts(user_id: str, niches: list, brand_voice: dict, display_name: str, platform: str) -> dict:
    """Trend yokken evergreen (zamansız) taslaklar üret."""
    sb = _get_supabase()
    tones = brand_voice.get("tones", {})
    active_tones = {k: v for k, v in tones.items() if v > 0}
    tone_labels = {"informative": "Bilgi Verici", "friendly": "Samimi", "witty": "Esprili",
                   "aggressive": "Agresif", "inspirational": "İlham Verici"}
    tone_str = ", ".join(f"%{v} {tone_labels.get(k, k)}" for k, v in sorted(active_tones.items(), key=lambda x: -x[1]))
    niche_str = ", ".join(niches[:5]) if niches else "genel"

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""Bugün gündemde öne çıkan bir trend yok. Kullanıcının nişlerine ve sesine uygun 3 zamansız (evergreen) tweet taslağı üret.

Niş alanları: {niche_str}
Ton dengesi: {tone_str}

KURALLAR:
- Zamansız, her zaman geçerli tavsiyeler/düşünceler
- Kişisel deneyim veya sektörel bilgi odaklı
- Twitter max 280 karakter
- Emoji kullanma, doğal yaz
- Her biri farklı açıdan

JSON: {{"drafts": [{{"content": "...", "insight": "Neden bu konu her zaman geçerli"}}]}}"""},
                {"role": "user", "content": "3 zamansız tweet taslağı üret."}
            ],
            temperature=0.8,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        drafts_data = result.get("drafts", [])
    except Exception as e:
        logger.error(f"Evergreen generation error: {e}")
        return {"drafts": [], "cached": False, "reason": "generation_failed"}

    saved = []
    for draft in drafts_data[:3]:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "trend_id": None,
            "content": draft.get("content", ""),
            "platform": platform,
            "status": "pending",
            "trend_topic": "💡 Zamansız Tavsiye",
            "trend_summary": None,
            "insight": draft.get("insight", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            sb.table("daily_drafts").insert(doc).execute()
            saved.append(doc)
        except Exception as e:
            logger.error(f"Evergreen draft save error: {e}")

    return {"drafts": saved, "cached": False, "evergreen": True}


async def generate_magic_morning(user_id: str, platform: str = "twitter") -> dict:
    """Kullanıcı için günlük taslaklar üret (JIT).
    
    Returns:
        {"drafts": [...], "cached": bool}
    """
    sb = _get_supabase()

    # 1. Bugünkü taslaklar var mı? (cache check)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing = sb.table("daily_drafts") \
        .select("*") \
        .eq("user_id", user_id) \
        .gte("created_at", today_start.isoformat()) \
        .order("created_at", desc=False) \
        .limit(5) \
        .execute()

    if existing.data and len(existing.data) >= 3:
        return {"drafts": existing.data, "cached": True}

    # 2. Kullanıcının profil bilgilerini çek
    profile = sb.table("user_settings") \
        .select("display_name, niches, brand_voice") \
        .eq("user_id", user_id) \
        .limit(1) \
        .execute()

    niches = []
    brand_voice = {}
    display_name = ""
    if profile.data:
        niches = profile.data[0].get("niches") or []
        brand_voice = profile.data[0].get("brand_voice") or {}
        display_name = profile.data[0].get("display_name") or ""

    # 3. Trendleri çek (son 48h, score >= 60)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    trend_query = sb.table("trends") \
        .select("id, topic, summary, keywords, content_angle, category, score, url") \
        .eq("is_visible", True) \
        .gte("created_at", cutoff) \
        .gte("score", 60) \
        .order("score", desc=True) \
        .limit(20) \
        .execute()

    trends = trend_query.data or []
    if not trends:
        # Evergreen fallback: trend yoksa DNA'ya uygun zamansız tavsiyeler üret
        return await _generate_evergreen_drafts(user_id, niches, brand_voice, display_name, platform)

    # 4. Niche filtering (varsa)
    if niches:
        from routes.trends import NICHE_KEYWORDS
        niche_kws = []
        for niche in niches:
            niche_kws.extend(NICHE_KEYWORDS.get(niche, []))
        niche_kws_lower = [kw.lower() for kw in niche_kws]

        def matches(t):
            t_kws = [k.lower() for k in (t.get("keywords") or [])]
            topic_lower = (t.get("topic") or "").lower()
            return any(nk in tk or tk in nk for nk in niche_kws_lower for tk in t_kws) or \
                   any(nk in topic_lower for nk in niche_kws_lower)

        niche_trends = [t for t in trends if matches(t)]
        # Pad with general if not enough
        if len(niche_trends) < 3:
            niche_trends.extend([t for t in trends if t not in niche_trends])
        trends = niche_trends

    # 5. Semantic dedup — farklı 3 trend seç
    selected = _select_diverse_trends(trends, count=3)

    if not selected:
        return {"drafts": [], "cached": False, "reason": "no_matching_trends"}

    # 6. Brand voice context oluştur
    tones = brand_voice.get("tones", {})
    active_tones = {k: v for k, v in tones.items() if v > 0}
    tone_labels = {"informative": "Bilgi Verici", "friendly": "Samimi", "witty": "Esprili",
                   "aggressive": "Agresif", "inspirational": "İlham Verici"}
    tone_str = ", ".join(f"%{v} {tone_labels.get(k, k)}" for k, v in sorted(active_tones.items(), key=lambda x: -x[1]))

    principles = brand_voice.get("principles", [])
    avoid = brand_voice.get("avoid", [])

    voice_context = f"Ton dengesi: {tone_str}" if tone_str else "Ton: Dengeli"
    if principles:
        voice_context += f"\nİlkeler: {', '.join(principles[:5])}"
    if avoid:
        voice_context += f"\nKaçınılacaklar: {', '.join(avoid[:5])}"

    # 7. GPT ile 3 taslak üret
    trends_block = ""
    for i, t in enumerate(selected):
        trends_block += f"\n## Trend {i+1}: {t['topic']}\n"
        trends_block += f"Özet: {t.get('summary', '')}\n"
        trends_block += f"Açı: {t.get('content_angle', '')}\n"
        trends_block += f"Kategori: {t.get('category', '')}\n"

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""Sen bir sosyal medya içerik asistanısın.
Kullanıcının marka sesini kullanarak, verilen trendler hakkında {platform} için 3 farklı içerik taslağı üret.

KULLANICI SESİ:
{voice_context}

KURALLAR:
- Her taslak farklı bir trend hakkında olmalı
- Kullanıcının ton dengesine UYGUN yaz
- Emoji kullanma (kullanıcı isterse ekler)
- AI template kalıpları kullanma ("Yapay zeka ile ilgili büyük haber!" gibi klişeler YASAK)
- Twitter için max 280 karakter, doğal ve kişisel
- Her taslak için kısa bir "insight" yaz: Bu trend kullanıcının nişi için neden önemli (1 cümle, Türkçe)

JSON formatı:
{{
  "drafts": [
    {{
      "trend_index": 0,
      "content": "Tweet taslağı",
      "insight": "Bu konu senin için neden önemli"
    }},
    ...
  ]
}}"""},
                {"role": "user", "content": f"Günün trendleri:{trends_block}"}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        drafts_data = result.get("drafts", [])

    except Exception as e:
        logger.error(f"Magic Morning GPT error: {e}")
        return {"drafts": [], "cached": False, "reason": "generation_failed"}

    # 8. DB'ye kaydet
    saved_drafts = []
    for draft in drafts_data[:3]:
        trend_idx = draft.get("trend_index", 0)
        trend = selected[trend_idx] if trend_idx < len(selected) else selected[0]

        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "trend_id": trend.get("id"),
            "content": draft.get("content", ""),
            "platform": platform,
            "status": "pending",
            "trend_topic": trend.get("topic", ""),
            "trend_summary": trend.get("summary", ""),
            "insight": draft.get("insight", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            sb.table("daily_drafts").insert(doc).execute()
            saved_drafts.append(doc)
        except Exception as e:
            logger.error(f"Draft save error: {e}")

    return {"drafts": saved_drafts, "cached": False}
