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

    async def fetch_rss_trends(self) -> list:
        """Fetch RSS feed items from last 48 hours.

        Returns list of dicts with title, link (url), summary, source, published info.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        items = []

        async with httpx.AsyncClient(timeout=15.0) as client:
            for feed_info in self.RSS_FEEDS:
                try:
                    resp = await client.get(feed_info["url"])
                    feed = feedparser.parse(resp.text)
                    for entry in feed.entries[:10]:
                        published = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                            published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

                        if published and published < cutoff:
                            continue

                        raw_content = entry.get("summary", "") or entry.get("description", "") or ""

                        items.append({
                            "title": entry.get("title", ""),
                            "url": entry.get("link", ""),
                            "summary": raw_content[:500],
                            "raw_content": raw_content,
                            "source": feed_info["source"],
                            "source_type": "rss",
                            "published_at": published.isoformat() if published else None,
                        })
                except Exception as e:
                    logger.warning(f"RSS fetch failed for {feed_info['source']}: {e}")

        logger.info(f"Fetched {len(items)} RSS items")
        return items

    # Twitter fetch disabled - Bird CLI not available
    # async def fetch_twitter_trends(self, keywords=None) -> list:
    #     ...

    async def analyze_trends(self, raw_items: list) -> list:
        """Analyze raw RSS items with GPT-4o and return scored trends.

        Each trend includes a primary source URL from the raw items.
        """
        if not raw_items:
            return []

        # Build items text with raw_content for richer analysis
        items_text = ""
        for i, item in enumerate(raw_items[:40]):
            items_text += f"\n--- Item {i+1} ---\n"
            items_text += f"Başlık: {item.get('title', '')}\n"
            items_text += f"Kaynak: {item.get('source', '')}\n"
            items_text += f"URL: {item.get('url', '')}\n"
            items_text += f"Yayın: {item.get('published_at', '')}\n"
            raw = item.get('raw_content', '')
            if raw:
                items_text += f"İçerik: {raw[:400]}\n"
            elif item.get('summary'):
                items_text += f"Özet: {item['summary'][:300]}\n"

        prompt = f"""Aşağıdaki haber ve içerikleri analiz et. Bunları trend konularına grupla ve skorla.

{items_text}

Her trend için JSON formatında döndür:
[
  {{
    "topic": "Trend başlığı (Türkçe, kısa ve çarpıcı)",
    "category": "AI|Tech|Crypto|Gündem|Business|Lifestyle",
    "score": 0-100 (trend skoru),
    "summary": "2-3 cümle Türkçe AI özeti",
    "url": "Ana kaynak URL (item'lardan birinin URL'i)",
    "source": "Kaynak adı",
    "published_at": "ISO tarih (item'dan al)",
    "raw_content": "Ana kaynağın içerik özeti (max 500 karakter)",
    "tweet_count": 0,
    "avg_engagement": 0,
    "sample_sources": ["kaynak1", "kaynak2"],
    "sample_links": ["link1", "link2"],
    "keywords": ["anahtar", "kelimeler"],
    "content_angle": "Bu konuda nasıl içerik üretilebilir? 1 cümle öneri"
  }}
]

Skorlama kriterleri:
- Duyuru tipi (büyük lansman=yüksek, küçük güncelleme=düşük): 0-20
- Erişim potansiyeli (viral olabilirlik): 0-20  
- Kullanılabilirlik (pratik değer): 0-15
- Kaynak güvenilirliği: 0-15
- Rekabet (az konuşulmuş=yüksek): 0-15
- Zamanlılık (ne kadar taze): 0-15

ÖNEMLİ: Her trend'in url alanı, ilgili item'lardan birinin gerçek URL'i olmalı. URL uydurmayın.
Yanıtı şu formatta döndür: {{"trends": [...]}}
En az 3, en fazla 15 trend döndür. Başka açıklama ekleme."""

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sen bir trend analisti ve içerik stratejistisin. JSON formatında yanıt ver."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            logger.info(f"GPT raw response (first 300): {content[:300]}")
            data = json.loads(content)

            # Robust parsing: handle {"trends": [...]}, {"items": [...]}, [...], or any dict with a list value
            if isinstance(data, list):
                trends = data
            elif isinstance(data, dict):
                trends = data.get("trends", data.get("items", []))
                if not isinstance(trends, list):
                    # Fallback: find first list value in dict
                    trends = []
                    for v in data.values():
                        if isinstance(v, list):
                            trends = v
                            break
            else:
                trends = []

            logger.info(f"Analyzed {len(trends)} trends")
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
