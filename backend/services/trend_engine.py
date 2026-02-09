"""Trend Discovery Engine - RSS + GPT-4o Analysis

Fetches real data from RSS feeds, analyzes with GPT-4o,
and saves to Supabase with URL-based deduplication.
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

    SCORE_THRESHOLD = 60  # Trends with score >= 60 are visible

    MAX_AGE_HOURS = 48  # Sadece son 48 saatin haberleri

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

    # Twitter fetch disabled - Bird CLI not available
    # async def fetch_twitter_trends(self, keywords=None) -> list:
    #     ...

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

        prompt = f"""Sen bir trend analisti ve haber editörüsün. Aşağıdaki haberleri analiz et, grupla ve SIKI şekilde skorla.

KURALLAR:
1. SADECE gerçek, doğrulanabilir haberler trend olabilir
2. Küçük güncellemeler, minor release'ler, blog yazıları düşük skor alır
3. Birden fazla kaynakta geçen konular daha yüksek skor alır
4. HER trend'in url'i, aşağıdaki item'lardan birinin GERÇEK URL'i olmalı. URL UYDURMA.
5. published_at değerini ilgili item'dan AYNEN al, değiştirme.

{items_text}

SKORLAMA (toplam 100):

| Kriter | Puan | Açıklama |
|--------|------|----------|
| Etki büyüklüğü | 0-25 | Büyük lansman/duyuru=20-25, API güncelleme=10-15, blog yazısı=5-10 |
| Viral potansiyel | 0-20 | Tartışma yaratır mı? Paylaşılır mı? |
| Pratik değer | 0-15 | Geliştiriciler/kullanıcılar için uygulanabilir mi? |
| Kaynak güvenilirliği | 0-15 | Resmi blog=15, haber sitesi=10, aggregator=5 |
| TAZELİK (KRİTİK) | 0-25 | 0-6 saat=25, 6-12 saat=20, 12-24 saat=15, 24-36 saat=8, 36-48 saat=3 |

TAZELİK ZORUNLU:
- 24 saatten eski haber MAX 65 puan alabilir
- 36 saatten eski haber MAX 50 puan alabilir
- "Yaş" alanına bak, saat bilgisi yazıyor

SKOR ÖRNEKLERİ:
- "OpenAI yeni model duyurdu" (2 saat önce, resmi blog) → 85-95
- "Google AI küçük API güncellemesi" (5 saat önce) → 45-55
- "HuggingFace yeni kütüphane" (18 saat önce) → 55-65
- "MIT araştırma makalesi" (30 saat önce) → 35-45
- Herhangi bir haber (40+ saat) → MAX 40

JSON formatı:
{{
  "trends": [
    {{
      "topic": "Türkçe, kısa ve çarpıcı başlık",
      "category": "AI|Tech|Crypto|Gündem|Business|Lifestyle",
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

En az 3, en fazla 12 trend döndür. Düşük kaliteli/eski haberleri ATLA, trend yapma.
Başka açıklama ekleme, sadece JSON döndür."""

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sen bir trend analisti ve içerik stratejistisin. JSON formatında yanıt ver."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,  # Daha tutarlı skorlama
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

                # Zamanlılık cezası uygula
                gpt_score = trend.get("score", 0)
                if age_hours is not None:
                    if age_hours > 36:
                        trend["score"] = min(gpt_score, 50)  # Max 50
                    elif age_hours > 24:
                        trend["score"] = min(gpt_score, 65)  # Max 65
                    elif age_hours > 12:
                        trend["score"] = min(gpt_score, 80)  # Max 80

                    if gpt_score != trend["score"]:
                        logger.info(f"Score capped: '{trend.get('topic', '?')}' {gpt_score}→{trend['score']} (age: {age_hours:.1f}h)")

                trend["_age_hours"] = age_hours  # Debug bilgisi

            logger.info(f"Analyzed {len(trends)} trends (post-processed with age penalties)")
            return trends

        except Exception as e:
            logger.error(f"Trend analysis failed: {e}")
            return []

    async def refresh_all(self) -> dict:
        """Full refresh: fetch RSS, analyze with GPT-4o, upsert to Supabase.

        Uses URL-based deduplication (upsert on conflict url).
        Sets is_visible based on score threshold (>= 80).
        """
        logger.info("Starting full trend refresh...")

        # Fetch RSS only (Twitter disabled)
        rss_items = await self.fetch_rss_trends()

        if not rss_items:
            return {"success": False, "error": "No items fetched", "trends": 0}

        # Build URL lookup for fallback matching
        items_by_title = {}
        for item in rss_items:
            items_by_title[item.get("title", "")] = item

        # Analyze with GPT-4o
        trends = await self.analyze_trends(rss_items)
        if not trends:
            return {"success": False, "error": "Analysis returned no trends", "trends": 0}

        # Save to Supabase with URL-based dedup
        saved = 0
        now = datetime.now(timezone.utc).isoformat()

        for trend in trends:
            try:
                # Get URL: from GPT analysis or fallback to matching item
                trend_url = trend.get("url") or ""
                if not trend_url:
                    # Try to match by topic/title
                    for item in rss_items:
                        if item.get("title", "").lower() in trend.get("topic", "").lower() or \
                           trend.get("topic", "").lower() in item.get("title", "").lower():
                            trend_url = item.get("url", "")
                            break

                # Skip trends without URL (can't dedup)
                if not trend_url:
                    logger.warning(f"Skipping trend without URL: {trend.get('topic')}")
                    continue

                score = trend.get("score", 0)

                doc = {
                    "id": str(uuid.uuid4()),
                    "topic": trend.get("topic", ""),
                    "category": trend.get("category", "AI"),
                    "score": score,
                    "summary": trend.get("summary", ""),
                    "url": trend_url,
                    "source_type": "rss",
                    "source_name": trend.get("source", ""),
                    "published_at": trend.get("published_at", None),
                    "is_visible": score >= self.SCORE_THRESHOLD,
                    "raw_content": trend.get("raw_content", "")[:2000],
                    "tweet_count": trend.get("tweet_count", 0),
                    "avg_engagement": trend.get("avg_engagement", 0),
                    "sample_sources": trend.get("sample_sources", []),
                    "sample_links": trend.get("sample_links", []),
                    "keywords": trend.get("keywords", []),
                    "content_angle": trend.get("content_angle", ""),
                    "updated_at": now,
                }

                # Check if URL already exists (dedup)
                existing = supabase.table("trends").select("id").eq("url", trend_url).limit(1).execute()
                if existing.data:
                    # Update existing trend
                    del doc["id"]  # keep original id
                    supabase.table("trends").update(doc).eq("id", existing.data[0]["id"]).execute()
                    logger.info(f"Updated existing trend: {trend.get('topic', '?')}")
                else:
                    # Insert new trend
                    supabase.table("trends").insert(doc).execute()
                    logger.info(f"Inserted new trend: {trend.get('topic', '?')}")
                saved += 1
            except Exception as e:
                logger.error(f"Failed to save trend '{trend.get('topic', '?')}': {e}")

        result = {
            "success": True,
            "rss_items": len(rss_items),
            "twitter_items": 0,
            "trends_analyzed": len(trends),
            "trends_saved": saved,
            "updated_at": now,
        }
        logger.info(f"Trend refresh complete: {result}")
        return result


# Singleton
trend_engine = TrendEngine()
