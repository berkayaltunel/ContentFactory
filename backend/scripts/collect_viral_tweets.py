#!/usr/bin/env python3
"""
Viral Tweet Collector
=====================
Belirli hesaplardan viral tweet'leri toplar ve Supabase'e kaydeder.

Kullanım:
    python collect_viral_tweets.py                    # Tüm hesaplardan topla
    python collect_viral_tweets.py --niche tech       # Sadece tech nişi
    python collect_viral_tweets.py --handle elonmusk  # Tek hesap
    python collect_viral_tweets.py --min-likes 500    # Minimum 500 like
    python collect_viral_tweets.py --dry-run           # Kaydetmeden test et
"""

import asyncio
import json
import os
import sys
import re
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from decimal import Decimal

import httpx

# Proje root'unu path'e ekle
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

logger = logging.getLogger("viral_collector")

# ─── Config ───────────────────────────────────────────────────────────────────

DATA_DIR = BACKEND_DIR / "data"
ACCOUNTS_FILE = DATA_DIR / "viral_accounts.json"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://awlsmfhxcsifabyanwfv.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Rate limiting
DELAY_BETWEEN_USERS = 5.0      # saniye - hesaplar arası bekleme
DELAY_BETWEEN_REQUESTS = 2.0   # saniye - request arası bekleme
MAX_RETRIES = 3
RETRY_DELAY = 10.0

# Viral eşik
DEFAULT_MIN_LIKES = 100


# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_hashtags(text: str) -> List[str]:
    return re.findall(r"#(\w+)", text)


def extract_mentions(text: str) -> List[str]:
    return re.findall(r"@(\w+)", text)


def detect_media_type(tweet: dict) -> str:
    """Tweet'teki medya tipini belirle."""
    media = tweet.get("media") or tweet.get("extended_entities", {}).get("media", [])
    if not media:
        return "none"
    if isinstance(media, list) and len(media) > 0:
        mt = media[0].get("type", "")
        if mt == "video" or mt == "animated_gif":
            return mt.replace("animated_", "")
        if mt == "photo":
            return "image"
    return "none"


def has_link(text: str) -> bool:
    return bool(re.search(r"https?://\S+", text))


def parse_twitter_date(date_str: str) -> Optional[datetime]:
    """Twitter tarih formatını parse et."""
    if not date_str:
        return None
    try:
        # "Wed Oct 10 20:19:24 +0000 2018"
        return datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
    except (ValueError, TypeError):
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None


def calculate_engagement_rate(tweet: dict, followers: int = 0) -> float:
    """Engagement rate hesapla. Followers bilinmiyorsa impression bazlı."""
    likes = tweet.get("likeCount", 0) or tweet.get("likes", 0) or 0
    rts = tweet.get("retweetCount", 0) or tweet.get("retweets", 0) or 0
    replies = tweet.get("replyCount", 0) or tweet.get("replies", 0) or 0
    total = likes + rts + replies
    
    if followers and followers > 0:
        return round(total / followers * 100, 6)
    # Fallback: impressions
    impressions = tweet.get("impressions", 0) or tweet.get("views", 0) or 0
    if impressions and impressions > 0:
        return round(total / impressions * 100, 6)
    return 0.0


# ─── Tweet Collector ─────────────────────────────────────────────────────────

class TweetCollector:
    """Viral tweet'leri toplar ve Supabase'e kaydeder."""

    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self._http: Optional[httpx.AsyncClient] = None
        self._graphql = None

    async def _get_http(self) -> httpx.AsyncClient:
        if not self._http:
            self._http = httpx.AsyncClient(timeout=30.0)
        return self._http

    async def close(self):
        if self._http:
            await self._http.aclose()

    def _get_graphql(self):
        """TwitterGraphQL client'ı lazy init et."""
        if not self._graphql:
            try:
                from services.twitter_graphql import TwitterGraphQL
                from services.cookie_store import cookie_store
                cookies = cookie_store.get_cookies()
                auth_token = cookies.get("auth_token", os.environ.get("AUTH_TOKEN", ""))
                ct0 = cookies.get("ct0", os.environ.get("CT0", ""))
                if auth_token and ct0:
                    self._graphql = TwitterGraphQL(auth_token, ct0)
                else:
                    logger.warning("Twitter cookie'leri bulunamadı, GraphQL kullanılamaz")
            except ImportError:
                logger.warning("twitter_graphql import edilemedi, env'den cookie denenecek")
                auth_token = os.environ.get("AUTH_TOKEN", "")
                ct0 = os.environ.get("CT0", "")
                if auth_token and ct0:
                    from services.twitter_graphql import TwitterGraphQL
                    self._graphql = TwitterGraphQL(auth_token, ct0)
        return self._graphql

    # ─── Tweet Toplama ────────────────────────────────────────────────────

    async def collect_user_tweets(self, handle: str, limit: int = 200) -> List[dict]:
        """Bir hesaptan tweet'leri topla (GraphQL API ile)."""
        logger.info(f"📥 @{handle} - {limit} tweet çekiliyor...")

        graphql = self._get_graphql()
        if not graphql:
            logger.error(f"❌ @{handle} - GraphQL client yok, atlanıyor")
            return []

        try:
            tweets = await graphql.get_user_tweets(handle, count=min(limit, 200))
            logger.info(f"✅ @{handle} - {len(tweets)} tweet çekildi")
            return tweets or []
        except Exception as e:
            logger.error(f"❌ @{handle} - Hata: {e}")
            return []

    async def filter_viral(self, tweets: List[dict], min_likes: int = DEFAULT_MIN_LIKES) -> List[dict]:
        """Viral eşiğini geçen tweet'leri filtrele."""
        viral = []
        for t in tweets:
            likes = t.get("likeCount", 0) or t.get("likes", 0) or 0
            if likes >= min_likes:
                viral.append(t)
        logger.info(f"🔥 {len(viral)}/{len(tweets)} tweet viral eşiğini geçti (min_likes={min_likes})")
        return viral

    def _normalize_tweet(self, tweet: dict, niche: str = "", language: str = "tr") -> dict:
        """Tweet'i Supabase şemasına uygun hale getir."""
        text = tweet.get("text", "") or tweet.get("full_text", "") or tweet.get("content", "")
        tweet_id = tweet.get("id") or tweet.get("id_str")
        if not tweet_id or not text:
            return {}

        try:
            tweet_id = int(tweet_id)
        except (ValueError, TypeError):
            return {}

        author = tweet.get("author", {})
        posted_at = parse_twitter_date(tweet.get("createdAt") or tweet.get("created_at"))
        followers = author.get("followers_count", 0) or tweet.get("author_followers", 0) or 0

        return {
            "id": tweet_id,
            "author_handle": author.get("username", "") or tweet.get("author_handle", ""),
            "author_name": author.get("name", "") or tweet.get("author_name", ""),
            "author_followers": followers,
            "author_verified": author.get("verified", False),
            "content": text,
            "likes": tweet.get("likeCount", 0) or tweet.get("likes", 0) or 0,
            "retweets": tweet.get("retweetCount", 0) or tweet.get("retweets", 0) or 0,
            "replies": tweet.get("replyCount", 0) or tweet.get("replies", 0) or 0,
            "quotes": tweet.get("quoteCount", 0) or tweet.get("quotes", 0) or 0,
            "bookmarks": tweet.get("bookmarkCount", 0) or tweet.get("bookmarks", 0) or 0,
            "impressions": tweet.get("views", 0) or tweet.get("impressions", 0) or 0,
            "media_type": detect_media_type(tweet),
            "has_link": has_link(text),
            "hashtags": extract_hashtags(text),
            "mentions": extract_mentions(text),
            "language": language,
            "tweet_length": len(text),
            "posted_at": posted_at.isoformat() if posted_at else None,
            "niche": niche,
            "engagement_rate": calculate_engagement_rate(tweet, followers),
            "is_thread": tweet.get("conversationId", "") == str(tweet_id) and tweet.get("replyCount", 0) > 0,
            "thread_position": None,
            "hook_type": None,
        }

    # ─── Supabase ─────────────────────────────────────────────────────────

    async def save_to_supabase(self, tweets: List[dict]) -> int:
        """Tweet'leri Supabase'e kaydet (upsert)."""
        if not tweets:
            return 0

        http = await self._get_http()
        url = f"{self.supabase_url}/rest/v1/viral_tweets"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }

        # Batch olarak gönder (50'şer)
        saved = 0
        batch_size = 50
        for i in range(0, len(tweets), batch_size):
            batch = tweets[i:i + batch_size]
            # Boş normalize sonuçları filtrele
            batch = [t for t in batch if t.get("id")]

            if not batch:
                continue

            for attempt in range(MAX_RETRIES):
                try:
                    resp = await http.post(url, json=batch, headers=headers)
                    if resp.status_code in (200, 201):
                        saved += len(batch)
                        logger.info(f"💾 {len(batch)} tweet kaydedildi (toplam: {saved})")
                        break
                    elif resp.status_code == 409:
                        # Duplicate - tek tek dene
                        for t in batch:
                            try:
                                r = await http.post(url, json=[t], headers=headers)
                                if r.status_code in (200, 201):
                                    saved += 1
                            except Exception:
                                pass
                        break
                    else:
                        logger.warning(f"⚠️ Supabase hata ({resp.status_code}): {resp.text[:200]}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                except Exception as e:
                    logger.error(f"❌ Supabase bağlantı hatası: {e}")
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY)

        return saved

    # ─── Ana Toplama ──────────────────────────────────────────────────────

    async def collect_all(
        self,
        accounts: List[dict],
        min_likes: int = DEFAULT_MIN_LIKES,
        dry_run: bool = False,
    ) -> dict:
        """Tüm hesaplardan viral tweet'leri topla."""
        stats = {
            "total_accounts": len(accounts),
            "processed": 0,
            "total_tweets_fetched": 0,
            "total_viral": 0,
            "total_saved": 0,
            "errors": [],
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        for i, account in enumerate(accounts):
            handle = account["handle"]
            niche = account.get("niche", "")
            language = account.get("language", "tr")

            logger.info(f"\n{'='*60}")
            logger.info(f"[{i+1}/{len(accounts)}] @{handle} ({niche}, {language})")
            logger.info(f"{'='*60}")

            try:
                # Tweet'leri çek
                tweets = await self.collect_user_tweets(handle, limit=200)
                stats["total_tweets_fetched"] += len(tweets)

                if not tweets:
                    logger.warning(f"⚠️ @{handle} - Tweet bulunamadı")
                    stats["processed"] += 1
                    await asyncio.sleep(DELAY_BETWEEN_USERS)
                    continue

                # Viral filtrele
                viral = await self.filter_viral(tweets, min_likes=min_likes)
                stats["total_viral"] += len(viral)

                # Normalize et
                normalized = []
                for t in viral:
                    n = self._normalize_tweet(t, niche=niche, language=language)
                    if n:
                        normalized.append(n)

                # Kaydet
                if normalized and not dry_run:
                    saved = await self.save_to_supabase(normalized)
                    stats["total_saved"] += saved
                elif normalized and dry_run:
                    logger.info(f"🏃 DRY RUN: {len(normalized)} tweet kaydedilecekti")
                    stats["total_saved"] += len(normalized)

                stats["processed"] += 1

            except Exception as e:
                logger.error(f"❌ @{handle} - Beklenmeyen hata: {e}")
                stats["errors"].append({"handle": handle, "error": str(e)})
                stats["processed"] += 1

            # Rate limiting
            await asyncio.sleep(DELAY_BETWEEN_USERS)

        stats["finished_at"] = datetime.now(timezone.utc).isoformat()
        return stats


# ─── Hesap Listesi ────────────────────────────────────────────────────────────

def load_accounts(
    accounts_file: Path = ACCOUNTS_FILE,
    niche: Optional[str] = None,
    handle: Optional[str] = None,
) -> List[dict]:
    """Hesap listesini yükle ve filtrele."""
    if not accounts_file.exists():
        logger.error(f"Hesap dosyası bulunamadı: {accounts_file}")
        return []

    with open(accounts_file) as f:
        data = json.load(f)

    accounts = data.get("accounts", [])

    if handle:
        accounts = [a for a in accounts if a["handle"].lower() == handle.lower()]
    elif niche:
        accounts = [a for a in accounts if a.get("niche") == niche]

    # Önceliğe göre sırala
    accounts.sort(key=lambda a: a.get("priority", 99))
    return accounts


# ─── CLI ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Viral Tweet Collector")
    parser.add_argument("--niche", type=str, help="Sadece belirli niş (tech, finans, ...)")
    parser.add_argument("--handle", type=str, help="Tek hesap")
    parser.add_argument("--min-likes", type=int, default=DEFAULT_MIN_LIKES, help="Minimum like eşiği")
    parser.add_argument("--dry-run", action="store_true", help="Kaydetmeden test et")
    parser.add_argument("--verbose", "-v", action="store_true", help="Detaylı log")
    args = parser.parse_args()

    # Logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    # Supabase key kontrolü
    if not SUPABASE_KEY:
        logger.error("SUPABASE_SERVICE_KEY env değişkeni ayarlanmamış!")
        sys.exit(1)

    # Hesapları yükle
    accounts = load_accounts(niche=args.niche, handle=args.handle)
    if not accounts:
        logger.error("Toplanacak hesap bulunamadı!")
        sys.exit(1)

    logger.info(f"🚀 Viral Tweet Collector başlatılıyor...")
    logger.info(f"📋 {len(accounts)} hesap, min_likes={args.min_likes}, dry_run={args.dry_run}")

    # Topla
    collector = TweetCollector(SUPABASE_URL, SUPABASE_KEY)
    try:
        stats = await collector.collect_all(
            accounts,
            min_likes=args.min_likes,
            dry_run=args.dry_run,
        )
    finally:
        await collector.close()

    # Sonuçları göster
    logger.info(f"\n{'='*60}")
    logger.info(f"📊 SONUÇLAR")
    logger.info(f"{'='*60}")
    logger.info(f"  Toplam hesap: {stats['total_accounts']}")
    logger.info(f"  İşlenen: {stats['processed']}")
    logger.info(f"  Çekilen tweet: {stats['total_tweets_fetched']}")
    logger.info(f"  Viral tweet: {stats['total_viral']}")
    logger.info(f"  Kaydedilen: {stats['total_saved']}")
    if stats["errors"]:
        logger.warning(f"  Hatalar: {len(stats['errors'])}")
        for err in stats["errors"]:
            logger.warning(f"    - @{err['handle']}: {err['error']}")


if __name__ == "__main__":
    asyncio.run(main())
