"""
Twitter Trend Fetcher — Multi-signal trend intelligence.

Tier 1: Resmi AI hesapları (her tweet potansiyel haber)
Tier 2: Key people (CEO/CTO/Researcher, GPT filtreli)
Tier 3: Keyword search (community buzz, min engagement filtreli)

TwitterGraphQL üzerinden çalışır (cookie-based, Hetzner'de 3 cookie rotation).
"""
import os
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from services.twitter_graphql import TwitterGraphQL, QUERY_IDS, DEFAULT_FEATURES

logger = logging.getLogger(__name__)

# Supabase client
from supabase import create_client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

# Keyword search queries (twclaw search operator syntax'ından ilham)
SEARCH_QUERIES = [
    '"just released" (AI OR LLM OR model) min_faves:500',
    '"open source" (model OR LLM OR AI) min_faves:500',
    '"announcing" (from:AnthropicAI OR from:OpenAI OR from:GoogleDeepMind OR from:MistralAI OR from:MetaAI)',
    '"state of the art" (benchmark OR SOTA) min_faves:300',
    '(API OR SDK) launch (AI OR LLM) min_faves:500',
]

# Tier 2 relevance filter prompt
TIER2_FILTER_PROMPT = (
    "Bu tweet yeni bir AI ürünü, model, API, benchmark sonucu veya önemli teknik gelişme hakkında mı? "
    "Kişisel yorum, şaka, yemek, tatil gibi alakasız içerikse HAYIR de. "
    "Sadece 'EVET' veya 'HAYIR' yaz, başka bir şey yazma."
)


def _init_twitter_client() -> Optional[TwitterGraphQL]:
    """TwitterGraphQL client'ı .env'den cookie'lerle oluştur."""
    auth_token = os.environ.get("AUTH_TOKEN")
    ct0 = os.environ.get("CT0")

    if not auth_token or not ct0:
        logger.error("AUTH_TOKEN veya CT0 env var eksik, Twitter fetch devre dışı")
        return None

    # Multi-cookie support
    extra_cookies = []
    for i in range(2, 10):
        at = os.environ.get(f"TWITTER_AUTH_TOKEN_{i}")
        ct = os.environ.get(f"TWITTER_CT0_{i}")
        if at and ct:
            extra_cookies.append({"auth_token": at, "ct0": ct})

    return TwitterGraphQL(auth_token, ct0, extra_cookies=extra_cookies if extra_cookies else None)


def _get_watch_accounts(tier: Optional[int] = None) -> List[dict]:
    """Supabase'den izlenen hesapları çek."""
    if not supabase:
        return []

    query = supabase.table("twitter_watch_accounts").select("*").eq("active", True)
    if tier:
        query = query.eq("tier", tier)

    result = query.execute()
    return result.data or []


async def _filter_tier2_tweet(tweet_text: str) -> bool:
    """GPT ile Tier 2 tweet'in AI/tech ile ilgili olup olmadığını kontrol et."""
    import httpx

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return True  # Filtre yapamıyorsa geçir

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": TIER2_FILTER_PROMPT},
                        {"role": "user", "content": tweet_text[:500]},
                    ],
                    "max_tokens": 5,
                    "temperature": 0,
                },
            )
            if resp.status_code == 200:
                answer = resp.json()["choices"][0]["message"]["content"].strip().upper()
                return answer.startswith("EVET") or answer.startswith("YES")
    except Exception as e:
        logger.warning(f"Tier 2 filter hatası: {e}")

    return True  # Hata durumunda geçir


async def fetch_account_tweets(
    client: TwitterGraphQL,
    username: str,
    since_tweet_id: Optional[str] = None,
    max_tweets: int = 20,
) -> List[dict]:
    """Bir hesabın son tweet'lerini çek, retweet/reply filtrele."""

    tweets = await client.get_user_tweets(username, count=max_tweets, max_pages=1)

    results = []
    for tweet in tweets:
        tweet_id = tweet.get("id") or tweet.get("tweet_id")

        # since_tweet_id'den eski tweet'leri atla
        if since_tweet_id and tweet_id and str(tweet_id) <= str(since_tweet_id):
            continue

        # Retweet filtrele
        text = tweet.get("text", "")
        if text.startswith("RT @"):
            continue

        # Reply filtrele (kendi thread'leri hariç)
        in_reply_to = tweet.get("in_reply_to_screen_name") or tweet.get("in_reply_to")
        if in_reply_to and in_reply_to.lower() != username.lower():
            continue

        results.append({
            "tweet_id": str(tweet_id),
            "username": username,
            "text": text,
            "likes": tweet.get("favorite_count") or tweet.get("likes", 0),
            "retweets": tweet.get("retweet_count") or tweet.get("retweets", 0),
            "replies": tweet.get("reply_count") or tweet.get("replies", 0),
            "views": tweet.get("views") or tweet.get("impressions", 0),
            "created_at": tweet.get("created_at"),
            "url": f"https://x.com/{username}/status/{tweet_id}",
        })

    return results


async def fetch_keyword_search(
    client: TwitterGraphQL,
    query: str,
    max_results: int = 20,
) -> List[dict]:
    """Twitter search ile keyword bazlı tweet çek."""

    # SearchTimeline GraphQL query
    search_features = DEFAULT_FEATURES.copy()

    variables = {
        "rawQuery": query,
        "count": max_results,
        "querySource": "typed_query",
        "product": "Latest",
    }

    data = await client._graphql_request(
        QUERY_IDS["SearchTimeline"],
        "SearchTimeline",
        variables=variables,
        features=search_features,
    )

    if not data:
        return []

    results = []
    try:
        instructions = data.get("data", {}).get("search_by_raw_query", {}).get("search_timeline", {}).get("timeline", {}).get("instructions", [])

        for instruction in instructions:
            entries = instruction.get("entries", [])
            for entry in entries:
                content = entry.get("content", {})
                tweet_results = None

                # Type: TimelineTimelineItem
                if content.get("entryType") == "TimelineTimelineItem":
                    item_content = content.get("itemContent", {})
                    tweet_results = item_content.get("tweet_results", {}).get("result", {})

                if not tweet_results:
                    continue

                # Handle TweetWithVisibilityResults wrapper
                if tweet_results.get("__typename") == "TweetWithVisibilityResults":
                    tweet_results = tweet_results.get("tweet", tweet_results)

                legacy = tweet_results.get("legacy", {})
                core = tweet_results.get("core", {}).get("user_results", {}).get("result", {})
                user_legacy = core.get("legacy", {})

                tweet_id = legacy.get("id_str") or tweet_results.get("rest_id")
                username = user_legacy.get("screen_name", "unknown")
                text = legacy.get("full_text", "")

                if not tweet_id or text.startswith("RT @"):
                    continue

                results.append({
                    "tweet_id": str(tweet_id),
                    "username": username,
                    "text": text,
                    "likes": legacy.get("favorite_count", 0),
                    "retweets": legacy.get("retweet_count", 0),
                    "replies": legacy.get("reply_count", 0),
                    "views": tweet_results.get("views", {}).get("count", 0),
                    "created_at": legacy.get("created_at"),
                    "url": f"https://x.com/{username}/status/{tweet_id}",
                })
    except Exception as e:
        logger.error(f"Search parse hatası: {e}")

    return results


async def fetch_all_twitter_signals(include_search: bool = False) -> List[dict]:
    """
    Tüm Twitter sinyallerini topla.

    Args:
        include_search: Tier 3 keyword search dahil mi (günde 3 kez çalıştır)

    Returns:
        List of signal dicts with: tweet_id, username, text, likes, tier, url, etc.
    """
    client = _init_twitter_client()
    if not client:
        return []

    all_signals = []

    # --- Tier 1: Resmi hesaplar ---
    tier1_accounts = _get_watch_accounts(tier=1)
    logger.info(f"Tier 1: {len(tier1_accounts)} resmi hesap taranıyor...")

    for account in tier1_accounts:
        username = account["username"]
        since_id = account.get("last_tweet_id")

        try:
            tweets = await fetch_account_tweets(client, username, since_tweet_id=since_id)

            for tweet in tweets:
                tweet["tier"] = 1
                tweet["category"] = account.get("category", "ai_lab")
                all_signals.append(tweet)

            # last_tweet_id güncelle
            if tweets and supabase:
                newest_id = max(t["tweet_id"] for t in tweets)
                supabase.table("twitter_watch_accounts").update(
                    {"last_tweet_id": newest_id}
                ).eq("username", username).execute()

            logger.info(f"  @{username}: {len(tweets)} yeni tweet")
        except Exception as e:
            logger.error(f"  @{username} hatası: {e}")

        await asyncio.sleep(2)  # Rate limit koruması

    # --- Tier 2: Key people (GPT filtreli) ---
    tier2_accounts = _get_watch_accounts(tier=2)
    logger.info(f"Tier 2: {len(tier2_accounts)} key person taranıyor...")

    for account in tier2_accounts:
        username = account["username"]
        since_id = account.get("last_tweet_id")

        try:
            tweets = await fetch_account_tweets(client, username, since_tweet_id=since_id)

            # GPT relevance filtresi
            filtered = []
            for tweet in tweets:
                is_relevant = await _filter_tier2_tweet(tweet["text"])
                if is_relevant:
                    tweet["tier"] = 2
                    tweet["category"] = account.get("category", "researcher")
                    filtered.append(tweet)
                else:
                    logger.debug(f"  @{username} filtered out: {tweet['text'][:60]}...")

            all_signals.extend(filtered)

            # last_tweet_id güncelle (filtrelenmemiş en son tweet)
            if tweets and supabase:
                newest_id = max(t["tweet_id"] for t in tweets)
                supabase.table("twitter_watch_accounts").update(
                    {"last_tweet_id": newest_id}
                ).eq("username", username).execute()

            logger.info(f"  @{username}: {len(tweets)} tweet, {len(filtered)} relevant")
        except Exception as e:
            logger.error(f"  @{username} hatası: {e}")

        await asyncio.sleep(2)

    # --- Tier 3: Keyword search (opsiyonel) ---
    if include_search:
        logger.info(f"Tier 3: {len(SEARCH_QUERIES)} keyword search çalıştırılıyor...")

        for query in SEARCH_QUERIES:
            try:
                tweets = await fetch_keyword_search(client, query, max_results=15)

                for tweet in tweets:
                    # Tier 1/2 hesaplardan gelen tweet'leri duplicate etme
                    if tweet["tweet_id"] in {s["tweet_id"] for s in all_signals}:
                        continue
                    tweet["tier"] = 3
                    tweet["category"] = "community"
                    all_signals.append(tweet)

                logger.info(f"  Search '{query[:40]}...': {len(tweets)} sonuç")
            except Exception as e:
                logger.error(f"  Search hatası: {e}")

            await asyncio.sleep(3)  # Search daha ağır, daha uzun bekle

    logger.info(f"Toplam {len(all_signals)} Twitter sinyali toplandı (T1: {sum(1 for s in all_signals if s.get('tier')==1)}, T2: {sum(1 for s in all_signals if s.get('tier')==2)}, T3: {sum(1 for s in all_signals if s.get('tier')==3)})")
    return all_signals
