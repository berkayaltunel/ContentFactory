"""Trend Discovery Engine - RSS + Twitter + GPT-4o Analysis"""
import asyncio
import json
import logging
import os
import subprocess
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
    RSS_FEEDS = [
        {"source": "Anthropic News", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml"},
        {"source": "Anthropic Engineering", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml"},
        {"source": "OpenAI Blog", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_openai_blog.xml"},
        {"source": "Google AI Blog", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_google_ai_blog.xml"},
        {"source": "Meta AI", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml"},
        {"source": "xAI", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xai.xml"},
        {"source": "Hugging Face Blog", "url": "https://huggingface.co/blog/feed.xml"},
        {"source": "MIT Tech Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed"},
    ]

    TWITTER_KEYWORDS = [
        "yapay zeka", "AI", "LLM", "GPT", "Claude", "Gemini",
        "machine learning", "deep learning", "AGI", "tech", "startup",
        "OpenAI", "Anthropic", "Google AI"
    ]

    CATEGORIES = ["AI", "Tech", "Crypto", "Gündem", "Business", "Lifestyle"]

    async def fetch_rss_trends(self) -> list:
        """Fetch RSS feed items from last 48 hours"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
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

                        items.append({
                            "title": entry.get("title", ""),
                            "link": entry.get("link", ""),
                            "summary": entry.get("summary", "")[:500],
                            "source": feed_info["source"],
                            "source_type": "rss",
                            "published": published.isoformat() if published else None,
                        })
                except Exception as e:
                    logger.warning(f"RSS fetch failed for {feed_info['source']}: {e}")

        logger.info(f"Fetched {len(items)} RSS items")
        return items

    async def fetch_twitter_trends(self, keywords: Optional[list] = None) -> list:
        """Fetch trending tweets via Bird CLI search"""
        keywords = keywords or self.TWITTER_KEYWORDS[:6]  # limit to avoid rate limits
        items = []
        auth_token = os.environ.get('AUTH_TOKEN', '')
        ct0 = os.environ.get('CT0', '')

        if not auth_token or not ct0:
            logger.warning("Twitter credentials not configured, skipping Twitter trends")
            return []

        env = os.environ.copy()
        env['AUTH_TOKEN'] = auth_token
        env['CT0'] = ct0

        for keyword in keywords:
            try:
                result = await asyncio.to_thread(
                    subprocess.run,
                    ['/opt/homebrew/bin/bird', 'search', keyword, '-n', '20', '--json'],
                    capture_output=True, text=True, timeout=30, env=env
                )
                if result.returncode != 0:
                    continue

                tweets = []
                for line in result.stdout.strip().split('\n'):
                    line = line.strip()
                    if line.startswith('{'):
                        try:
                            tweets.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue

                if not tweets:
                    # Try array parse
                    try:
                        idx = result.stdout.find('[')
                        if idx != -1:
                            tweets = json.loads(result.stdout[idx:])
                    except:
                        pass

                for tweet in tweets:
                    engagement = (tweet.get('likeCount', 0) + 
                                  tweet.get('retweetCount', 0) * 2 + 
                                  tweet.get('replyCount', 0))
                    if engagement < 5:
                        continue

                    items.append({
                        "title": tweet.get('text', '')[:120],
                        "content": tweet.get('text', ''),
                        "link": f"https://x.com/{tweet.get('author', {}).get('username', '')}/status/{tweet.get('id', '')}",
                        "source": f"Twitter/@{tweet.get('author', {}).get('username', '')}",
                        "source_type": "twitter",
                        "keyword": keyword,
                        "engagement": engagement,
                        "likes": tweet.get('likeCount', 0),
                        "retweets": tweet.get('retweetCount', 0),
                        "replies": tweet.get('replyCount', 0),
                        "author_username": tweet.get('author', {}).get('username', ''),
                        "author_name": tweet.get('author', {}).get('name', ''),
                    })

            except subprocess.TimeoutExpired:
                logger.warning(f"Bird search timed out for: {keyword}")
            except Exception as e:
                logger.warning(f"Twitter search failed for '{keyword}': {e}")

        logger.info(f"Fetched {len(items)} Twitter items")
        return items

    async def analyze_trends(self, raw_items: list) -> list:
        """Analyze and score raw items with GPT-4o"""
        if not raw_items:
            return []

        # Group similar items, take top items by engagement/recency
        items_text = ""
        for i, item in enumerate(raw_items[:40]):
            items_text += f"\n--- Item {i+1} ---\n"
            items_text += f"Başlık: {item.get('title', '')}\n"
            items_text += f"Kaynak: {item.get('source', '')}\n"
            items_text += f"Tür: {item.get('source_type', '')}\n"
            if item.get('content'):
                items_text += f"İçerik: {item['content'][:200]}\n"
            if item.get('summary'):
                items_text += f"Özet: {item['summary'][:200]}\n"
            if item.get('engagement'):
                items_text += f"Engagement: {item['engagement']}\n"

        prompt = f"""Aşağıdaki haber ve tweet'leri analiz et. Bunları trend konularına grupla ve skorla.

{items_text}

Her trend için JSON formatında döndür:
[
  {{
    "topic": "Trend başlığı (Türkçe, kısa ve çarpıcı)",
    "category": "AI|Tech|Crypto|Gündem|Business|Lifestyle",
    "score": 0-100 (trend skoru),
    "summary": "2-3 cümle Türkçe AI özeti",
    "tweet_count": ilgili tweet sayısı,
    "avg_engagement": ortalama engagement,
    "sample_sources": ["kaynak1", "kaynak2"],
    "sample_links": ["link1", "link2"],
    "keywords": ["anahtar", "kelimeler"],
    "content_angle": "Bu konuda nasıl içerik üretilebilir? 1 cümle öneri"
  }}
]

Skorlama kriterleri (n8n 12-point system'den esinlenme):
- Duyuru tipi (büyük lansman=yüksek, küçük güncelleme=düşük): 0-20
- Erişim potansiyeli (viral olabilirlik): 0-20  
- Kullanılabilirlik (pratik değer): 0-15
- Kaynak güvenilirliği: 0-15
- Rekabet (az konuşulmuş=yüksek): 0-15
- Zamanlılık (ne kadar taze): 0-15

Sadece JSON array döndür, başka açıklama ekleme. En az 3, en fazla 15 trend döndür."""

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
            data = json.loads(content)
            # Handle both {"trends": [...]} and [...]
            if isinstance(data, dict):
                trends = data.get("trends", data.get("items", list(data.values())[0] if data else []))
            else:
                trends = data
            
            if not isinstance(trends, list):
                trends = []

            logger.info(f"Analyzed {len(trends)} trends")
            return trends

        except Exception as e:
            logger.error(f"Trend analysis failed: {e}")
            return []

    async def refresh_all(self) -> dict:
        """Full refresh: fetch all sources, analyze, save to Supabase"""
        logger.info("Starting full trend refresh...")

        # Fetch from all sources in parallel
        rss_task = self.fetch_rss_trends()
        twitter_task = self.fetch_twitter_trends()
        rss_items, twitter_items = await asyncio.gather(rss_task, twitter_task)

        all_items = rss_items + twitter_items
        if not all_items:
            return {"success": False, "error": "No items fetched", "trends": 0}

        # Analyze with GPT-4o
        trends = await self.analyze_trends(all_items)
        if not trends:
            return {"success": False, "error": "Analysis returned no trends", "trends": 0}

        # Save to Supabase
        saved = 0
        now = datetime.now(timezone.utc).isoformat()
        for trend in trends:
            try:
                doc = {
                    "id": str(uuid.uuid4()),
                    "topic": trend.get("topic", ""),
                    "category": trend.get("category", "AI"),
                    "score": trend.get("score", 0),
                    "summary": trend.get("summary", ""),
                    "tweet_count": trend.get("tweet_count", 0),
                    "avg_engagement": trend.get("avg_engagement", 0),
                    "sample_sources": trend.get("sample_sources", []),
                    "sample_links": trend.get("sample_links", []),
                    "keywords": trend.get("keywords", []),
                    "content_angle": trend.get("content_angle", ""),
                    "created_at": now,
                    "updated_at": now,
                }
                supabase.table("trends").upsert(doc).execute()
                saved += 1
            except Exception as e:
                logger.error(f"Failed to save trend: {e}")

        result = {
            "success": True,
            "rss_items": len(rss_items),
            "twitter_items": len(twitter_items),
            "trends_analyzed": len(trends),
            "trends_saved": saved,
            "updated_at": now,
        }
        logger.info(f"Trend refresh complete: {result}")
        return result


# Singleton
trend_engine = TrendEngine()
