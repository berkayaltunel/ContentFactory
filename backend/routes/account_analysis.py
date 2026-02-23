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

        # Private hesap kontrolü
        if user_info.get('is_private'):
            raise HTTPException(status_code=403, detail="Bu hesap gizli (private). Gizli hesaplar analiz edilemez.")

        # Tweet'leri çek (async, GraphQL fallback destekli)
        tweets = await scraper.get_user_tweets_async(username, count=200)

        # ── Tweet Data'dan Otomatik Stats Hesapla ──
        import re
        total = max(len(tweets), 1)
        total_likes = sum(t.get('likes', 0) for t in tweets)
        total_rts = sum(t.get('retweets', 0) for t in tweets)
        total_replies = sum(t.get('replies', 0) for t in tweets)
        avg_likes = total_likes / total
        avg_rts = total_rts / total
        avg_replies = total_replies / total
        followers = max(user_info.get('followers', 0), 1)
        engagement_rate = (avg_likes + avg_rts + avg_replies) / followers * 100

        # Medya analizi
        media_count = sum(1 for t in tweets if t.get('media') or t.get('has_media'))
        video_count = sum(1 for t in tweets if t.get('media_type') == 'video' or (isinstance(t.get('media'), list) and any(m.get('type') == 'video' for m in t.get('media', []))))
        gif_count = sum(1 for t in tweets if t.get('media_type') == 'gif' or (isinstance(t.get('media'), list) and any(m.get('type') == 'animated_gif' for m in t.get('media', []))))
        image_count = media_count - video_count - gif_count

        # Format analizi
        question_count = sum(1 for t in tweets if '?' in (t.get('content', '')[:100]))
        emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F]')
        emoji_count = sum(1 for t in tweets if emoji_pattern.search(t.get('content', '')))
        link_count = sum(1 for t in tweets if 'http' in (t.get('content', '')))
        thread_count = sum(1 for t in tweets if t.get('is_thread') or t.get('thread_id'))
        reply_count = sum(1 for t in tweets if t.get('is_reply') or t.get('in_reply_to'))
        quote_count = sum(1 for t in tweets if t.get('is_quote') or t.get('quoted_tweet'))
        hashtag_count = sum(1 for t in tweets if '#' in (t.get('content', '')))
        avg_length = sum(len(t.get('content', '')) for t in tweets) / total

        # Viral tweet hesaplama (10x ortalama engagement üstü)
        avg_engagement = avg_likes + avg_rts + avg_replies
        viral_count = sum(1 for t in tweets if (t.get('likes', 0) + t.get('retweets', 0) + t.get('replies', 0)) > avg_engagement * 10) if avg_engagement > 0 else 0

        stats_summary = f"""HESAPLANMIŞ İSTATİSTİKLER:
- Toplam analiz edilen tweet: {len(tweets)}
- Ortalama like: {avg_likes:.1f} | RT: {avg_rts:.1f} | Reply: {avg_replies:.1f}
- Engagement rate (follower'a göre): %{engagement_rate:.3f}
- Medya ekleme oranı: %{media_count/total*100:.1f} (görsel: {image_count}, video: {video_count}, GIF: {gif_count})
- Soru içeren tweet oranı: %{question_count/total*100:.1f}
- Emoji kullanan tweet oranı: %{emoji_count/total*100:.1f}
- Link içeren tweet oranı: %{link_count/total*100:.1f}
- Thread oranı: %{thread_count/total*100:.1f}
- Reply oranı: %{reply_count/total*100:.1f}
- Quote tweet oranı: %{quote_count/total*100:.1f}
- Hashtag kullanan tweet oranı: %{hashtag_count/total*100:.1f}
- Ortalama tweet uzunluğu: {avg_length:.0f} karakter
- Viral tweet sayısı (10x ort. üstü): {viral_count}"""

        # AI analizi: tweet metni + engagement verileri
        tweet_lines = []
        for t in tweets[:100]:
            text = t.get('content', '')
            likes = t.get('likes', 0)
            rts = t.get('retweets', 0)
            replies = t.get('replies', 0)
            has_media = '📷' if t.get('media') or t.get('has_media') else ''
            is_thread = '🧵' if t.get('is_thread') or t.get('thread_id') else ''
            is_reply = '↩️' if t.get('is_reply') or t.get('in_reply_to') else ''
            is_quote = '🔄' if t.get('is_quote') or t.get('quoted_tweet') else ''
            flags = f"{has_media}{is_thread}{is_reply}{is_quote}"
            tweet_lines.append(f"[❤️{likes} 🔁{rts} 💬{replies}]{flags} {text}")
        tweet_summary = "\n---\n".join(tweet_lines)

        lang = "Türkçe" if request.language != "en" else "English"

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""Sen uzman bir sosyal medya analistisin. Twitter hesabını 5 boyutta derinlemesine analiz et.
{lang} yaz.

JSON formatında döndür. HER ALAN ZORUNLU:
{{
  "overall_score": 0-100 arası genel skor (integer),
  "summary": "Genel profil değerlendirmesi (3-5 cümle, spesifik ve kişiselleştirilmiş)",
  "dimensions": {{
    "hook_power": 0-100,
    "engagement_potential": 0-100,
    "format_diversity": 0-100,
    "emotional_range": 0-100,
    "visual_usage": 0-100
  }},
  "dimension_details": {{
    "hook_power": "Kanca gücü hakkında 2-3 cümle detaylı yorum",
    "engagement_potential": "Etkileşim potansiyeli hakkında 2-3 cümle detaylı yorum",
    "format_diversity": "Format çeşitliliği hakkında 2-3 cümle detaylı yorum",
    "emotional_range": "Duygu yoğunluğu hakkında 2-3 cümle detaylı yorum",
    "visual_usage": "Görsel kullanımı hakkında 2-3 cümle detaylı yorum"
  }},
  "strengths": [
    {{"title": "Güçlü yön başlığı", "description": "Detaylı açıklama, spesifik tweet örnekleriyle"}},
    ...en az 3, en fazla 5 tane
  ],
  "weaknesses": [
    {{"title": "Zayıf yön başlığı", "description": "Detaylı açıklama ve somut iyileştirme önerisi"}},
    ...en az 3, en fazla 5 tane
  ],
  "recommendations": [
    {{"title": "Öneri başlığı", "description": "Uygulanabilir, somut adım. 'Daha çok tweet at' gibi genel öneriler YASAK."}},
    ...en az 3, en fazla 5 tane
  ],
  "tone_analysis": "Hesabın genel tonu ve iletişim stili analizi (2-3 cümle)",
  "posting_frequency": "Paylaşım sıklığı ve düzeni analizi (2-3 cümle)",
  "hashtag_strategy": "Hashtag kullanım analizi ve öneriler (2-3 cümle)",
  "growth_tips": "Büyüme stratejisi ve öneriler (3-5 cümle, spesifik)",
  "top_tweets": [
    {{"content": "Tweet metni", "likes": 123, "retweets": 45, "replies": 10, "why_good": "Neden iyi performans gösterdi (spesifik)"}},
    ...en iyi 3-5 tweet
  ]
}}

5 BOYUT SKORLAMA KILAVUZU:

1. hook_power (Kanca Gücü):
   - Tweet'lerin ilk cümlesinin dikkat çekiciliğini ölç
   - Soru ile başlama, rakam/istatistik kullanımı, merak boşluğu (curiosity gap)
   - "Unpopular opinion", "Hot take", "Thread:", "Biliyor muydunuz" gibi hook pattern'ları
   - İlk 15-20 kelimenin durup okutma gücü
   - 85+: Çoğu tweet güçlü kancayla açılıyor, scroll durdurucu
   - 50-84: Bazı iyi kancalar var ama tutarsız
   - <50: Çoğu tweet düz başlıyor, kanca yok

2. engagement_potential (Etkileşim Potansiyeli):
   - Sağlanan engagement rate'i kullan ama sadece buna bakma
   - CTA kullanımı: soru sorma, tartışma başlatma, "Siz ne düşünüyorsunuz?"
   - Reply ve quote tetikleme gücü
   - Viral tweet yüzdesi (10x ortalama üstü)
   - Konuşma başlatma vs monolog ayrımı
   - 85+: Yüksek ER, aktif topluluk, viral hit'ler
   - 50-84: Orta ER, bazen etkileşim alıyor
   - <50: Düşük ER, monolog tarzı, etkileşim yok

3. format_diversity (Format Çeşitliliği):
   - Tek tweet / Thread / Quote / Reply dağılım dengesi
   - Sadece tek tip format = düşük skor
   - Thread kullanımı büyük artı
   - Quote tweet ile başka içeriklere katılım
   - 85+: Çeşitli formatlar dengeli kullanılıyor
   - 50-84: 2-3 format var ama biri baskın
   - <50: Hep aynı format, monoton

4. emotional_range (Duygu Yoğunluğu):
   - Kaç farklı duygu tonu: mizah, ciddiyet, ilham, merak, şaşkınlık, kişisel
   - Hep aynı tonda = düşük skor
   - Kişisel hikaye/anekdot paylaşımı büyük artı
   - Emoji kullanım çeşitliliği
   - 85+: Zengin duygu paleti, okuyucu bağlantısı güçlü
   - 50-84: 2-3 ton var ama sınırlı
   - <50: Monoton, robotik veya hep aynı duygu

5. visual_usage (Görsel Kullanımı):
   - Sağlanan medya oranını kullan
   - Medya türü çeşitliliği: foto, video, GIF, infografik
   - Medyalı tweetlerin engagement farkı
   - Salt metin ağırlıklı = düşük skor (ama metin kalitesi yüksekse 30-40 arası, 0 değil)
   - 85+: Düzenli ve çeşitli medya, engagement artışı belirgin
   - 50-84: Ara sıra medya var ama tutarsız
   - <50: Çok az veya hiç medya yok

JENERİK OLMAYAN ANALİZ KURALLARI:
- "Daha çok tweet at", "Daha fazla etkileşim kur" gibi genel öneriler YASAK
- Her madde spesifik olmalı: hangi tweet, hangi pattern, hangi rakam
- Strengths'te somut örnek ver (hangi tweet iyi çalışmış ve neden)
- Weaknesses'ta somut iyileştirme önerisi ver
- Recommendations'ta adım adım uygulanabilir eylem planı ver"""},
                {"role": "user", "content": f"""Hesap: @{username}
İsim: {user_info.get('name', 'N/A')}
Bio: {user_info.get('bio', 'N/A')}
Takipçi: {user_info.get('followers', 0):,}
Takip: {user_info.get('following', 0):,}
Toplam tweet: {user_info.get('tweet_count', 0):,}
Verified: {'Evet' if user_info.get('is_verified') else 'Hayır'}

{stats_summary}

Son {len(tweets)} tweet (engagement + format flag'leri):
📷=medya 🧵=thread ↩️=reply 🔄=quote
{tweet_summary}"""}
            ],
            temperature=0.5,
            response_format={"type": "json_object"}
        )

        import json
        analysis = json.loads(response.choices[0].message.content)

        # Veritabanına kaydet
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "user_id": user.id,
            "twitter_username": username,
            "display_name": user_info.get('name', ''),
            "avatar_url": user_info.get('avatar_url') or f"https://unavatar.io/x/{username}",
            "bio": user_info.get('bio', ''),
            "followers_count": user_info.get('followers', 0),
            "following_count": user_info.get('following', 0),
            "tweet_count": len(tweets),
            "overall_score": analysis.get("overall_score", 0),
            "analysis": analysis,
            "top_tweets": sorted(tweets, key=lambda t: t.get('likes', 0), reverse=True)[:5],
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "recommendations": analysis.get("recommendations", []),
            "posting_patterns": analysis.get("posting_patterns", {}),
            "updated_at": now,
        }

        try:
            # Aynı kullanıcı + aynı hesap varsa güncelle (upsert)
            existing = sb.table("account_analyses").select("id").eq("user_id", user.id).eq("twitter_username", username).limit(1).execute()
            if existing.data:
                sb.table("account_analyses").update(record).eq("id", existing.data[0]["id"]).execute()
            else:
                record["id"] = str(uuid.uuid4())
                record["created_at"] = now
                sb.table("account_analyses").insert(record).execute()
        except Exception as db_err:
            logger.warning(f"DB upsert failed: {db_err}")

        return {
            "success": True,
            "username": username,
            "display_name": user_info.get('name', ''),
            "avatar_url": user_info.get('avatar_url') or f"https://unavatar.io/x/{username}",
            "followers": user_info.get('followers', 0),
            "bio": user_info.get('bio', ''),
            "tweets_analyzed": len(tweets),
            "tweet_count_analyzed": len(tweets),
            "analysis": analysis
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account analysis error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.get("/history")
async def get_analysis_history(limit: int = Query(20, le=100), offset: int = Query(0, ge=0), user=Depends(require_auth)):
    """Geçmiş analizleri getir (meta veri, tam analiz hariç)"""
    try:
        sb = get_supabase()
        result = (
            sb.table("account_analyses")
            .select("id, twitter_username, display_name, avatar_url, overall_score, tweet_count, followers_count, bio, created_at, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return {"analyses": result.data or [], "has_more": len(result.data or []) >= limit}
    except Exception as e:
        logger.error(f"Analysis history error: {e}")
        return {"analyses": [], "has_more": False}


@router.get("/history/{analysis_id}")
async def get_analysis_detail(analysis_id: str, user=Depends(require_auth)):
    """Tek analiz detayı (tam veri)"""
    try:
        sb = get_supabase()
        result = sb.table("account_analyses").select("*").eq("id", analysis_id).eq("user_id", user.id).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Analiz bulunamadı")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis detail error: {e}")
        raise HTTPException(status_code=500, detail="Bir hata oluştu")


@router.delete("/history/{analysis_id}")
async def delete_analysis(analysis_id: str, user=Depends(require_auth)):
    """Analiz geçmişinden sil"""
    try:
        sb = get_supabase()
        sb.table("account_analyses").delete().eq("id", analysis_id).eq("user_id", user.id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Analysis delete error: {e}")
        raise HTTPException(status_code=500, detail="Silinemedi")
