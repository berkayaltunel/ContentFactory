"""Twitter scraping service using Bird CLI + GraphQL fallback"""
import subprocess
import json
import os
import re
import logging
import shutil
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Tek seferde çekilecek max tweet (Bird CLI güvenli limit)
BIRD_BATCH_SIZE = 50

def _has_bird() -> bool:
    return shutil.which("bird") is not None

class TwitterScraper:
    def __init__(self):
        # Cookie store'dan oku, env fallback cookie_store içinde
        try:
            from services.cookie_store import cookie_store
            cookies = cookie_store.get_cookies()
            self.auth_token = cookies.get('auth_token')
            self.ct0 = cookies.get('ct0')
            self._cookie_store = cookie_store
        except Exception:
            self.auth_token = os.environ.get('AUTH_TOKEN')
            self.ct0 = os.environ.get('CT0')
            self._cookie_store = None
        
        if not self.auth_token or not self.ct0:
            logger.warning("Twitter credentials not configured")

        self.has_bird = _has_bird()
        if self.has_bird:
            logger.info("Bird CLI detected")
        else:
            logger.info("Bird CLI not found, will use GraphQL fallback")

        # GraphQL client (lazy init)
        self._graphql = None

    def _get_graphql(self):
        """Lazy init GraphQL client."""
        if not self._graphql:
            from services.twitter_graphql import TwitterGraphQL
            self.refresh_cookies()
            self._graphql = TwitterGraphQL(self.auth_token, self.ct0)
        return self._graphql

    def refresh_cookies(self):
        """Re-read cookies from store (useful after update)."""
        if self._cookie_store:
            cookies = self._cookie_store.get_cookies()
            self.auth_token = cookies.get('auth_token')
            self.ct0 = cookies.get('ct0')
            # Reset graphql client so it picks up new cookies
            self._graphql = None
    
    def _run_bird(self, args: List[str], timeout: int = 30) -> Optional[list]:
        """Run bird CLI command and return JSON output"""
        if not self.has_bird:
            return None

        self.refresh_cookies()
        if not self.auth_token or not self.ct0:
            raise Exception("Twitter credentials not configured")
        
        env = os.environ.copy()
        env['AUTH_TOKEN'] = self.auth_token
        env['CT0'] = self.ct0
        
        cmd = ['bird'] + args + ['--json']
        
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout, env=env
            )
            
            if result.returncode != 0:
                logger.error(f"Bird command failed: {result.stderr}")
                return None
            
            output = result.stdout.strip()
            
            # NDJSON parse
            lines = output.split("\n")
            ndjson_results = []
            for line in lines:
                line = line.strip()
                if line.startswith("{"):
                    try:
                        ndjson_results.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            
            if ndjson_results:
                return ndjson_results
            
            # Normal JSON array parse
            json_start = output.find("[")
            if json_start != -1:
                json_str = output[json_start:]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    last_valid = json_str.rfind("}")
                    while last_valid > 0:
                        try:
                            candidate = json_str[:last_valid + 1]
                            if not candidate.endswith("]"):
                                candidate = candidate.rstrip(",") + "]"
                            parsed = json.loads(candidate)
                            logger.info(f"Recovered {len(parsed)} items from truncated JSON")
                            return parsed
                        except json.JSONDecodeError:
                            last_valid = json_str.rfind("}", 0, last_valid)
            
            return None
            
        except subprocess.TimeoutExpired:
            logger.error("Bird command timed out")
            return None
        except Exception as e:
            logger.error(f"Bird command error: {e}")
            return None
    
    # ----------------------------------------------------------------
    # SYNC methods (Bird CLI only — used by non-async callers)
    # ----------------------------------------------------------------
    def get_user_info(self, username: str) -> Optional[dict]:
        """Get user info by username (sync, Bird CLI only)"""
        result = self._run_bird(['user-tweets', f'@{username}', '-n', '1'])
        if result and len(result) > 0:
            author = result[0].get('author', {})
            return {
                'username': author.get('username'),
                'name': author.get('name'),
                'user_id': result[0].get('authorId')
            }
        return None
    
    def get_user_tweets(self, username: str, count: int = 100) -> List[dict]:
        """Fetch user tweets (sync, Bird CLI only)"""
        all_raw = []
        remaining = count
        
        while remaining > 0:
            batch_size = min(remaining, BIRD_BATCH_SIZE)
            args = ['user-tweets', f'@{username}', '-n', str(batch_size)]
            result = self._run_bird(args, timeout=60)
            
            if not result or len(result) == 0:
                break
            
            all_raw.extend(result)
            remaining -= len(result)
            
            if len(result) < batch_size:
                break
            
            if remaining > 0:
                full_result = self._run_bird(
                    ['user-tweets', f'@{username}', '-n', str(count)], timeout=90
                )
                if full_result and len(full_result) > len(all_raw):
                    all_raw = full_result
                break
        
        return self._normalize_tweets(all_raw)
    
    # ----------------------------------------------------------------
    # ASYNC methods (GraphQL fallback — used by FastAPI routes)
    # ----------------------------------------------------------------
    async def get_user_info_async(self, username: str) -> Optional[dict]:
        """Get user info (async, with GraphQL fallback)"""
        # Try Bird first
        result = self._run_bird(['user-tweets', f'@{username}', '-n', '1'])
        if result and len(result) > 0:
            author = result[0].get('author', {})
            bird_avatar = (author.get('avatar_url') or author.get('profile_image_url') or '').replace('_normal.', '_400x400.')
            return {
                'username': author.get('username'),
                'name': author.get('name'),
                'user_id': result[0].get('authorId'),
                'avatar_url': bird_avatar,
            }
        
        # GraphQL fallback
        logger.info(f"Bird unavailable, using GraphQL for @{username} user info")
        gql = self._get_graphql()
        from services.twitter_graphql import QUERY_IDS, USER_BY_SCREEN_NAME_FEATURES
        
        user_data = await gql._graphql_request(
            QUERY_IDS["UserByScreenName"], "UserByScreenName",
            variables={"screen_name": username, "withSafetyModeUserFields": True},
            features=USER_BY_SCREEN_NAME_FEATURES,
        )
        
        if not user_data:
            return None
        
        try:
            user_result = user_data["data"]["user"]["result"]
            core = user_result.get("core", {})
            legacy = user_result.get("legacy", {})
            avatar = user_result.get("avatar", {})
            avatar_url = (avatar.get("image_url") or legacy.get("profile_image_url_https") or legacy.get("profile_image_url") or "").replace("_normal.", "_400x400.")
            return {
                'username': legacy.get('screen_name') or core.get('screen_name', username),
                'name': core.get('name') or legacy.get('name', ''),
                'user_id': user_result.get('rest_id'),
                'avatar_url': avatar_url,
                'bio': legacy.get('description', ''),
                'followers': legacy.get('followers_count', 0),
                'following': legacy.get('friends_count', 0),
                'tweet_count': legacy.get('statuses_count', 0),
                'listed_count': legacy.get('listed_count', 0),
                'is_verified': user_result.get('is_blue_verified', False),
            }
        except (KeyError, TypeError) as e:
            logger.error(f"Failed to parse user info for @{username}: {e}")
            return None
    
    async def get_user_tweets_async(self, username: str, count: int = 200) -> List[dict]:
        """Fetch user tweets (async, with GraphQL fallback)"""
        # Try Bird first
        result = self._run_bird(['user-tweets', f'@{username}', '-n', str(count)], timeout=90)
        if result and len(result) > 0:
            return self._normalize_tweets(result)
        
        # GraphQL fallback
        logger.info(f"Bird unavailable, using GraphQL for @{username} tweets (count={count})")
        gql = self._get_graphql()
        max_pages = max(1, count // 20)  # ~20 tweets per page
        raw_tweets = await gql.get_user_tweets(username, count=count, max_pages=max_pages)
        
        return self._normalize_tweets(raw_tweets)
    
    # ----------------------------------------------------------------
    # Shared helpers
    # ----------------------------------------------------------------
    def _normalize_tweets(self, raw_tweets: list) -> List[dict]:
        """Normalize raw tweet dicts into standard format for source_tweets table."""
        seen_ids = set()
        tweets = []
        for tweet in raw_tweets:
            tid = tweet.get('id')
            if tid and tid in seen_ids:
                continue
            if tid:
                seen_ids.add(tid)
            
            # Skip RTs
            if tweet.get('retweetedTweet') or tweet.get('retweeted_status_result'):
                continue
            
            # Skip very short tweets (likely replies like teşekkürler, aynen)
            text = tweet.get('text', '')
            word_count = len(text.split())
            if word_count < 4 and not tweet.get('media'):
                continue
            
            # Skip tweets that are just links
            if text.startswith('http') and word_count <= 2:
                continue
            
            tweets.append({
                'tweet_id': tid,
                'content': tweet.get('text', ''),
                'likes': tweet.get('likeCount', 0),
                'retweets': tweet.get('retweetCount', 0),
                'replies': tweet.get('replyCount', 0),
                'is_thread': tweet.get('conversationId') == tid and tweet.get('replyCount', 0) > 0,
                'has_media': bool(tweet.get('media')),
                'tweet_created_at': tweet.get('createdAt')
            })
        
        logger.info(f"Normalized {len(tweets)} tweets from {len(raw_tweets)} raw")
        return tweets
    
    def fetch_tweet_by_url(self, url: str) -> Optional[dict]:
        """Fetch a single tweet by URL"""
        result = self._run_bird(['read', url])
        
        if result and isinstance(result, list) and len(result) > 0:
            tweet = result[0]
        elif result and isinstance(result, dict):
            tweet = result
        else:
            return None
        
        return {
            'tweet_id': tweet.get('id'),
            'content': tweet.get('text', ''),
            'author_username': tweet.get('author', {}).get('username'),
            'author_name': tweet.get('author', {}).get('name'),
            'likes': tweet.get('likeCount', 0),
            'retweets': tweet.get('retweetCount', 0),
            'replies': tweet.get('replyCount', 0)
        }


# Singleton instance
scraper = TwitterScraper()
