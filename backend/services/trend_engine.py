"""Trend Discovery Engine - RSS + Twitter + GPT-4o Analysis

Multi-signal trend intelligence:
- RSS feeds (mevcut)
- Twitter signals (Tier 1 resmi, Tier 2 key people, Tier 3 keyword search)
- GPT-4o skorlama + context enrichment
- Topic clustering (dedup + merge)
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid

import feedparser
import httpx
from openai import OpenAI

from supabase import create_client

logger = logging.getLogger(__name__)

supabase_url = os.environ.get('SUPABASE_URL', '')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
supabase = create_client(supabase_url, supabase_key) if supabase_url else None

openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY', ''))


class TrendEngine:
    """Discovers and analyzes trends from RSS feeds using GPT-4o."""

    # Load feeds from config file, fallback to hardcoded defaults
    @staticmethod
    def _load_feeds():
        """Load RSS feeds from config/rss_feeds.json or use defaults."""
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "rss_feeds.json")
        try:
            with open(config_path, "r") as f:
                all_feeds = json.load(f)
            # Filter: only active feeds, use tier system
            active = [f for f in all_feeds if f.get("status") == "active"]
            # Tier 1: always included (most reliable sources)
            tier1 = [f for f in active if f.get("tier", 2) == 1]
            tier2 = [f for f in active if f.get("tier", 2) == 2]
            # Rotate tier 2: pick 5 per day based on day of year
            day_offset = datetime.now().timetuple().tm_yday % max(len(tier2), 1)
            selected_tier2 = (tier2[day_offset:] + tier2[:day_offset])[:5]
            feeds = tier1 + selected_tier2
            logger.info(f"Loaded {len(feeds)} feeds ({len(tier1)} tier1 + {len(selected_tier2)} tier2 rotating)")
            return [{"source": f["source"], "url": f["url"]} for f in feeds]
        except Exception as e:
            logger.warning(f"Could not load feeds config: {e}, using defaults")
            return [
                {"source": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml"},
                {"source": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/"},
                {"source": "Google DeepMind", "url": "https://deepmind.google/blog/rss.xml"},
                {"source": "Hugging Face Blog", "url": "https://huggingface.co/blog/feed.xml"},
                {"source": "MIT Tech Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed"},
                {"source": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
                {"source": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
            ]

    RSS_FEEDS = []  # populated in __init__

    def __init__(self):
        self.RSS_FEEDS = self._load_feeds()

    CATEGORIES = ["AI", "Tech", "Crypto", "Gündem", "Business", "Lifestyle"]

    SCORE_THRESHOLD = 70  # Trends with score >= 70 are visible

    MAX_AGE_HOURS = 72  # Son 72 saatin haberleri

    async def fetch_rss_trends(self) -> list:
        """Fetch RSS feed items from last 48 hours ONLY.

        - published_at zorunlu: tarihsiz item'lar atlanır
        - 48 saatten eski item'lar atlanır
        - Her item'a age_hours eklenir (GPT'ye gönderilir)
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=self.MAX_AGE_HOURS)
        items = []
        skipped_no_date = 0
        skipped_old = 0

        async with httpx.AsyncClient(timeout=15.0) as client:
            for feed_info in self.RSS_FEEDS:
                try:
                    resp = await client.get(feed_info["url"])
                    feed = feedparser.parse(resp.text)
                    for entry in feed.entries[:10]:
                        # Tarih parse et
                        published = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                            published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

                        # Tarihsiz item = güvenilmez, atla
                        if not published:
                            skipped_no_date += 1
                            continue

                        # 48 saatten eski = atla
                        if published < cutoff:
                            skipped_old += 1
                            continue

                        # Gelecek tarihli kontrol (hatalı feed'ler)
                        if published > now + timedelta(hours=1):
                            continue

                        age_hours = round((now - published).total_seconds() / 3600, 1)
                        raw_content = entry.get("summary", "") or entry.get("description", "") or ""

                        items.append({
                            "title": entry.get("title", ""),
                            "url": entry.get("link", ""),
                            "summary": raw_content[:500],
                            "raw_content": raw_content,
                            "source": feed_info["source"],
                            "source_type": "rss",
                            "published_at": published.isoformat(),
                            "age_hours": age_hours,
                        })
                except Exception as e:
                    logger.warning(f"RSS fetch failed for {feed_info['source']}: {e}")

        logger.info(f"Fetched {len(items)} RSS items (skipped: {skipped_no_date} no-date, {skipped_old} old)")
        return items

    async def fetch_twitter_signals(self, include_search: bool = False) -> list:
        """Twitter'dan trend sinyalleri topla ve RSS formatına dönüştür.

        Args:
            include_search: Tier 3 keyword search dahil mi (günde 3 kez)
        """
        try:
            from services.twitter_trend_fetcher import fetch_all_twitter_signals
        except ImportError as e:
            logger.warning(f"twitter_trend_fetcher import hatası: {e}")
            return []

        signals = await fetch_all_twitter_signals(include_search=include_search)

        # Twitter sinyallerini RSS item formatına dönüştür (analyze_trends ile uyumlu)
        items = []
        for signal in signals:
            # Yaş hesapla
            age_hours = 0
            if signal.get("created_at"):
                try:
                    # Twitter tarih formatı: "Mon Feb 20 12:00:00 +0000 2026"
                    from email.utils import parsedate_to_datetime
                    tweet_dt = parsedate_to_datetime(signal["created_at"])
                    age_hours = (datetime.now(timezone.utc) - tweet_dt).total_seconds() / 3600
                except Exception:
                    age_hours = 1  # Parse edilemezse taze kabul et

            items.append({
                "title": signal["text"][:120],
                "source": f"@{signal['username']} (Twitter)",
                "url": signal["url"],
                "published_at": signal.get("created_at"),
                "age_hours": age_hours,
                "raw_content": signal["text"],
                "summary": signal["text"],
                # Twitter-specific metadata
                "_source_type": "twitter",
                "_tweet_id": signal["tweet_id"],
                "_twitter_account": signal["username"],
                "_tier": signal.get("tier", 3),
                "_likes": signal.get("likes", 0),
                "_retweets": signal.get("retweets", 0),
                "_views": signal.get("views", 0),
            })

        logger.info(f"Converted {len(items)} Twitter signals to trend items")
        return items

    async def analyze_trends(self, raw_items: list) -> list:
        """Analyze raw RSS items with GPT-4o and return scored trends.

        Each trend includes a primary source URL from the raw items.
        Strict freshness: age_hours included, scoring penalizes old items.
        """
        if not raw_items:
            return []

        # Sort by freshness (newest first)
        sorted_items = sorted(raw_items, key=lambda x: x.get("age_hours", 999))

        # Build items text with age info for strict scoring
        items_text = ""
        for i, item in enumerate(sorted_items[:40]):
            items_text += f"\n--- Item {i+1} ---\n"
            items_text += f"Başlık: {item.get('title', '')}\n"
            items_text += f"Kaynak: {item.get('source', '')}\n"
            items_text += f"URL: {item.get('url', '')}\n"
            items_text += f"Yayın: {item.get('published_at', '')}\n"
            items_text += f"Yaş: {item.get('age_hours', '?')} saat önce\n"
            raw = item.get('raw_content', '')
            if raw:
                items_text += f"İçerik: {raw[:400]}\n"
            elif item.get('summary'):
                items_text += f"Özet: {item['summary'][:300]}\n"

        prompt = f"""Sen sert, seçici bir haber editörüsün. Haberleri analiz et, grupla ve ACIMADAN skorla.

TEMEL KURALLAR:
1. SADECE gerçek, doğrulanabilir haberler trend olabilir
2. Aynı konuyu farklı kaynaklar yazdıysa BİRLEŞTİR, duplicate trend oluşturma
3. HER trend'in url'i aşağıdaki item'lardan birinin GERÇEK URL'i olmalı. URL UYDURMA.
4. published_at değerini ilgili item'dan AYNEN al, değiştirme.
5. category TEK değer olmalı: AI, Tech, Crypto, Gündem, Business veya Lifestyle. ASLA birleşik yazma (AI|Tech YANLIŞ, AI DOĞRU).

SELF-PROMO CEZASI:
- Şirketin kendi blog'unda kendi ürününü tanıttığı yazılar (örn: NVIDIA Blog'da NVIDIA ürünü, OpenAI Blog'da OpenAI ürünü) PRATİK DEĞER'den max 5 alır ve KAYNAK GÜVENİLİRLİĞİ'nden max 5 alır. Bunlar reklam, haber değil.

{items_text}

SKORLAMA KRİTERLERİ (toplam 100):

1. ETKİ BÜYÜKLÜĞÜ (0-25):
   - 20-25: Sektörü değiştiren olay (yeni büyük model, büyük satın alma, yasal düzenleme)
   - 12-18: Önemli ama sektör değiştirmeyen (yeni özellik, orta çaplı anlaşma)
   - 5-11: Küçük güncelleme, partnership, genişleme
   - 0-4: Rutin blog yazısı, araştırma makalesi, etkinlik duyurusu

2. VİRAL POTANSİYEL (0-20):
   - 15-20: Herkes konuşacak, tartışma yaratır (tartışmalı karar, skandal, sürpriz)
   - 8-14: İlgi çekici ama sınırlı kitle
   - 0-7: Niş haber, sınırlı paylaşılabilirlik

3. PRATİK DEĞER (0-15):
   - 12-15: Geliştiriciler/kullanıcılar hemen uygulayabilir (yeni API, tool, ücretsiz erişim)
   - 6-11: Dolaylı fayda (gelecek plan, beta)
   - 0-5: Akademik, teorik, self-promo

4. KAYNAK GÜVENİLİRLİĞİ (0-15):
   - 12-15: Bağımsız haber sitesi (TechCrunch, Verge, Wired, Ars Technica)
   - 7-11: Resmi şirket blog'u (kendi ürünü dışında), sektör siteleri
   - 3-6: Self-promo blog, aggregator, küçük kaynak
   - 0-2: Belirsiz kaynak

5. TAZELİK (0-25):
   - 22-25: 0-6 saat
   - 16-21: 6-12 saat
   - 10-15: 12-24 saat
   - 4-9: 24-48 saat
   - 0-3: 48-72 saat

SKOR DAĞILIMI HEDEFİ (BU ÇOK ÖNEMLİ):
- 90+: Sadece sektörü sarsan haberler. Refresh başına 0-1 tane olmalı.
- 80-89: Gerçekten önemli, geniş kitlenin ilgilendiği haberler. 2-3 tane olmalı.
- 70-79: İyi haberler, nişe hitap eder. Çoğunluk burası.
- 60-69: Orta kalite, ama yine de paylaşılabilir.
- 50-59: Zayıf ama mevcut. Düşük öncelik.
- <50: Bu trendleri listeye KOYMA, çöpe at.

SKOR ÖRNEKLERİ (KALİBRASYON):
- "OpenAI GPT-5 duyurdu" (2 saat, resmi) → 90-95
- "Google yeni Gemini modeli çıkardı" (4 saat) → 82-88
- "Mistral AI bir startup satın aldı" (8 saat) → 72-78
- "HuggingFace yeni kütüphane yayınladı" (12 saat) → 58-65
- "NVIDIA kendi blog'unda kendi GPU'sunu övdü" (3 saat) → 40-50
- "Küçük API güncellemesi" (6 saat) → 45-55
- "Araştırma makalesi yayınlandı" (20 saat) → 40-50
- "Lego akıllı tuğla yaptı" (10 saat, tech ama niş) → 55-62
- "Herhangi bir haber" (50+ saat) → MAX 45

TAZELİK HARD CAP (GPT bu kuralı çiğneyemez):
- >24 saat → MAX 80
- >48 saat → MAX 65
- >72 saat → MAX 45

JSON formatı:
{{
  "trends": [
    {{
      "topic": "Türkçe, kısa ve çarpıcı başlık",
      "category": "AI veya Tech veya Crypto veya Gündem veya Business veya Lifestyle",
      "score": 0-100,
      "summary": "2-3 cümle Türkçe özet. Ne oldu, neden önemli.",
      "url": "İlgili item'ın GERÇEK URL'i",
      "source": "Kaynak adı",
      "published_at": "Item'dan AYNEN alınan ISO tarih",
      "raw_content": "İçerik özeti (max 500 karakter)",
      "tweet_count": 0,
      "avg_engagement": 0,
      "sample_sources": ["kaynak1"],
      "sample_links": ["link1"],
      "keywords": ["anahtar", "kelimeler", "max 5"],
      "content_angle": "İçerik üretim önerisi, 1 cümle"
    }}
  ]
}}

En az 3, en fazla 10 trend döndür. 50 altı skorlu haberleri ATLA.
Aynı konunun tekrarını YAPMA, birleştir.
Başka açıklama ekleme, sadece JSON döndür."""

        try:
            response = openai_client.chat.completions.create(
                model=os.environ.get('MODEL_ANALYSIS', 'gpt-4o-mini'),
                messages=[
                    {"role": "system", "content": "Sen sert bir haber editörüsün. Skorları şişirme, acımasızca değerlendir. Sadece JSON döndür."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Düşük temperature = tutarlı, sıkı skorlama
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            logger.info(f"GPT raw response (first 300): {content[:300]}")
            data = json.loads(content)

            # Robust parsing
            if isinstance(data, list):
                trends = data
            elif isinstance(data, dict):
                trends = data.get("trends", data.get("items", []))
                if not isinstance(trends, list):
                    trends = []
                    for v in data.values():
                        if isinstance(v, list):
                            trends = v
                            break
            else:
                trends = []

            # ── POST-PROCESS: Zamanlılık cezası (GPT'ye güvenme, double-check) ──
            now = datetime.now(timezone.utc)
            items_url_map = {item.get("url", ""): item for item in raw_items}

            for trend in trends:
                # published_at'dan yaş hesapla
                pub_str = trend.get("published_at")
                age_hours = None
                if pub_str:
                    try:
                        pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                        age_hours = (now - pub_dt).total_seconds() / 3600
                    except Exception:
                        pass

                # URL'den fallback yaş
                if age_hours is None:
                    matched_item = items_url_map.get(trend.get("url", ""))
                    if matched_item:
                        age_hours = matched_item.get("age_hours")

                # Zamanlılık cezası uygula (hard cap, prompt'a güvenme)
                gpt_score = trend.get("score", 0)
                if age_hours is not None:
                    if age_hours > 72:
                        trend["score"] = min(gpt_score, 45)  # 72h+: max 45
                    elif age_hours > 48:
                        trend["score"] = min(gpt_score, 65)  # 48-72h: max 65
                    elif age_hours > 24:
                        trend["score"] = min(gpt_score, 80)  # 24-48h: max 80

                    if gpt_score != trend["score"]:
                        logger.info(f"Score capped: '{trend.get('topic', '?')}' {gpt_score}→{trend['score']} (age: {age_hours:.1f}h)")

                trend["_age_hours"] = age_hours  # Debug bilgisi

                # Kategori temizliği: birleşik kategoriyi tek kategoriye çevir
                cat = trend.get("category", "")
                if "|" in cat:
                    trend["category"] = cat.split("|")[0].strip()
                    logger.info(f"Category fixed: '{cat}' → '{trend['category']}'")

            # 50 altı skorlu trendleri filtrele
            before_count = len(trends)
            trends = [t for t in trends if t.get("score", 0) >= 50]
            if before_count != len(trends):
                logger.info(f"Filtered {before_count - len(trends)} low-score trends (<50)")

            logger.info(f"Analyzed {len(trends)} trends (post-processed with age penalties)")
            return trends

        except Exception as e:
            logger.error(f"Trend analysis failed: {e}")
            return []

    async def refresh_all(self, include_twitter_search: bool = False) -> dict:
        """Full refresh: fetch RSS + Twitter, analyze with GPT-4o, upsert to Supabase.

        Uses URL-based deduplication (upsert on conflict url).
        Sets is_visible based on score threshold (>= 70).

        Args:
            include_twitter_search: Tier 3 keyword search dahil mi (günde 3 kez)
        """
        logger.info("Starting full trend refresh (RSS + Twitter)...")

        # Fetch from both sources
        rss_items = await self.fetch_rss_trends()
        twitter_items = await self.fetch_twitter_signals(include_search=include_twitter_search)

        # Birleştir
        all_items = rss_items + twitter_items

        if not all_items:
            return {"success": False, "error": "No items fetched", "trends": 0}

        # Build URL lookup for fallback matching
        items_by_title = {}
        for item in rss_items:
            items_by_title[item.get("title", "")] = item

        # Analyze ALL items with GPT-4o (RSS + Twitter birlikte)
        trends = await self.analyze_trends(all_items)
        if not trends:
            return {"success": False, "error": "Analysis returned no trends", "trends": 0}

        # Build twitter metadata lookup (URL → twitter signal)
        twitter_by_url = {}
        for item in twitter_items:
            twitter_by_url[item["url"]] = item

        # Build all items lookup for matching
        all_items_by_title = {}
        for item in all_items:
            all_items_by_title[item.get("title", "")] = item

        # Enrichment import
        try:
            from services.trend_enrichment import enrich_trend, calculate_multi_signal_score
        except ImportError:
            enrich_trend = None
            calculate_multi_signal_score = None

        # Save to Supabase with URL-based dedup
        saved = 0
        enriched_count = 0
        now = datetime.now(timezone.utc).isoformat()

        for trend in trends:
            try:
                # Get URL: from GPT analysis or fallback to matching item
                trend_url = trend.get("url") or ""
                if not trend_url:
                    for item in all_items:
                        if item.get("title", "").lower() in trend.get("topic", "").lower() or \
                           trend.get("topic", "").lower() in item.get("title", "").lower():
                            trend_url = item.get("url", "")
                            break

                if not trend_url:
                    logger.warning(f"Skipping trend without URL: {trend.get('topic')}")
                    continue

                # Determine source type and collect twitter metadata
                source_item = twitter_by_url.get(trend_url)
                is_twitter = source_item is not None
                source_type = "twitter" if is_twitter else "rss"

                # Collect all twitter signals related to this trend (by topic similarity)
                related_tweets = []
                if is_twitter:
                    related_tweets.append(source_item)
                # Also check if any twitter items mention similar topic
                trend_topic_lower = trend.get("topic", "").lower()
                for t_item in twitter_items:
                    if t_item["url"] != trend_url and any(
                        word in t_item.get("raw_content", "").lower()
                        for word in trend_topic_lower.split()[:3]
                        if len(word) > 4
                    ):
                        related_tweets.append(t_item)

                # Calculate engagement and signal count
                engagement_total = sum(t.get("_likes", 0) for t in related_tweets)
                signal_count = 1 + len(related_tweets)  # 1 for base source
                has_tier1 = any(t.get("_tier") == 1 for t in related_tweets)
                has_tier2 = any(t.get("_tier") == 2 for t in related_tweets)

                # Multi-signal scoring
                base_score = trend.get("score", 0)
                if calculate_multi_signal_score and related_tweets:
                    final_score = calculate_multi_signal_score(
                        base_score=base_score,
                        engagement_total=engagement_total,
                        signal_count=signal_count,
                        has_tier1=has_tier1,
                        has_tier2=has_tier2,
                        age_hours=trend.get("age_hours", 0),
                    )
                else:
                    final_score = base_score

                # Source tweets JSON (for frontend display)
                source_tweets_json = [
                    {
                        "tweet_id": t.get("_tweet_id"),
                        "username": t.get("_twitter_account"),
                        "likes": t.get("_likes", 0),
                        "tier": t.get("_tier", 3),
                        "text": t.get("raw_content", "")[:200],
                    }
                    for t in related_tweets[:5]
                ]

                doc = {
                    "id": str(uuid.uuid4()),
                    "topic": trend.get("topic", ""),
                    "category": trend.get("category", "AI"),
                    "score": final_score,
                    "summary": trend.get("summary", ""),
                    "url": trend_url,
                    "source_type": "merged" if (is_twitter and len(related_tweets) > 1) else source_type,
                    "source_name": trend.get("source", ""),
                    "published_at": trend.get("published_at") if trend.get("published_at") and str(trend.get("published_at")) != "None" else None,
                    "is_visible": final_score >= self.SCORE_THRESHOLD,
                    "raw_content": trend.get("raw_content", "")[:2000],
                    "tweet_count": trend.get("tweet_count", 0),
                    "avg_engagement": trend.get("avg_engagement", 0),
                    "sample_sources": trend.get("sample_sources", []),
                    "sample_links": trend.get("sample_links", []),
                    "keywords": trend.get("keywords", []),
                    "content_angle": trend.get("content_angle", ""),
                    "updated_at": now,
                    # New fields
                    "signal_count": signal_count,
                    "engagement_total": engagement_total,
                    "source_tweets": source_tweets_json,
                    "twitter_account": source_item.get("_twitter_account") if source_item else None,
                    "tweet_id": source_item.get("_tweet_id") if source_item else None,
                }

                # Context enrichment (high-score trends only, save API costs)
                if enrich_trend and final_score >= 65:
                    enrichment = await enrich_trend(
                        topic=trend.get("topic", ""),
                        summary=trend.get("summary", ""),
                        source_tweets=source_tweets_json,
                        engagement_total=engagement_total,
                        signal_count=signal_count,
                    )
                    if enrichment:
                        doc["key_angles"] = enrichment.get("key_angles", [])
                        doc["suggested_hooks"] = enrichment.get("suggested_hooks", {})
                        doc["content_pillars"] = enrichment.get("content_pillars", [])
                        enriched_count += 1

                # Check if URL already exists (dedup)
                existing = supabase.table("trends").select("id,signal_count,engagement_total,source_tweets").eq("url", trend_url).limit(1).execute()
                if existing.data:
                    existing_doc = existing.data[0]
                    del doc["id"]

                    # Merge signals: keep higher signal count, combine tweets
                    old_tweets = existing_doc.get("source_tweets") or []
                    if isinstance(old_tweets, str):
                        try:
                            old_tweets = json.loads(old_tweets)
                        except Exception:
                            old_tweets = []

                    # Merge source tweets (dedup by tweet_id)
                    seen_ids = {t.get("tweet_id") for t in old_tweets if t.get("tweet_id")}
                    for new_tweet in source_tweets_json:
                        if new_tweet.get("tweet_id") not in seen_ids:
                            old_tweets.append(new_tweet)
                    doc["source_tweets"] = old_tweets[:10]  # Max 10 tweets
                    doc["signal_count"] = max(doc["signal_count"], existing_doc.get("signal_count", 1))
                    doc["engagement_total"] = max(doc["engagement_total"], existing_doc.get("engagement_total", 0))

                    supabase.table("trends").update(doc).eq("id", existing_doc["id"]).execute()
                    logger.info(f"Updated trend: {trend.get('topic', '?')} (score: {final_score}, signals: {signal_count})")
                else:
                    supabase.table("trends").insert(doc).execute()
                    logger.info(f"New trend: {trend.get('topic', '?')} (score: {final_score}, signals: {signal_count})")
                saved += 1
            except Exception as e:
                logger.error(f"Failed to save trend '{trend.get('topic', '?')}': {e}")

        result = {
            "success": True,
            "rss_items": len(rss_items),
            "twitter_items": len(twitter_items),
            "trends_analyzed": len(trends),
            "trends_saved": saved,
            "trends_enriched": enriched_count,
            "updated_at": now,
        }
        logger.info(f"Trend refresh complete: {result}")
        return result


# Singleton
trend_engine = TrendEngine()
