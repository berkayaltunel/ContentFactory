"""Twitter scraping service using Bird CLI + GraphQL fallback"""
import subprocess
import json
import os
import re
import logging
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Tek seferde çekilecek max tweet (Bird CLI güvenli limit)
BIRD_BATCH_SIZE = 50

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

        # GraphQL client for Hetzner/Linux fallback
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
        # Always refresh before run to pick up updates
        self.refresh_cookies()

        if not self.auth_token or not self.ct0:
            raise Exception("Twitter credentials not configured")
        
        env = os.environ.copy()
        env['AUTH_TOKEN'] = self.auth_token
        env['CT0'] = self.ct0
        
        cmd = ['bird'] + args + ['--json']
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env
            )
            
            if result.returncode != 0:
                logger.error(f"Bird command failed: {result.stderr}")
                return None
            
            output = result.stdout.strip()
            
            # NDJSON satır satır parse (Bird CLI bazen NDJSON döner)
            lines = output.split('\n')
            ndjson_results = []
            for line in lines:
                line = line.strip()
                if line.startswith('{'):
                    try:
                        ndjson_results.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            
            if ndjson_results:
                return ndjson_results
            
            # Normal JSON array parse
            json_start = output.find('[')
            if json_start != -1:
                json_str = output[json_start:]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    # Truncated JSON: son geçerli objeye kadar kes
                    # Her tweet }{ veya },{ ile ayrılır
                    last_valid = json_str.rfind('}')
                    while last_valid > 0:
                        try:
                            candidate = json_str[:last_valid + 1]
                            # Array'i kapat
                            if not candidate.endswith(']'):
                                candidate = candidate.rstrip(',') + ']'
                            parsed = json.loads(candidate)
                            logger.info(f"Recovered {len(parsed)} items from truncated JSON")
                            return parsed
                        except json.JSONDecodeError:
                            last_valid = json_str.rfind('}', 0, last_valid)
            
            return None
            
        except subprocess.TimeoutExpired:
            logger.error("Bird command timed out")
            return None
        except Exception as e:
            logger.error(f"Bird command error: {e}")
            return None
    
    def get_user_info(self, username: str) -> Optional[dict]:
        """Get user info by username"""
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
        """
        Fetch user's tweets. 
        100+ tweet için batch'ler halinde çeker (Bird CLI güvenli limiti 50).
        """
        all_raw = []
        remaining = count
        cursor = None
        
        while remaining > 0:
            batch_size = min(remaining, BIRD_BATCH_SIZE)
            args = ['user-tweets', f'@{username}', '-n', str(batch_size)]
            
            # cursor varsa (pagination) ekle
            if cursor:
                args += ['--cursor', cursor]
            
            result = self._run_bird(args, timeout=60)
            
            if not result or len(result) == 0:
                break
            
            all_raw.extend(result)
            remaining -= len(result)
            
            # Son tweet'in ID'sini cursor olarak kullan
            # Bird CLI cursor desteği yoksa, seen ID'lerle deduplicate yap
            if len(result) < batch_size:
                break  # Daha fazla tweet yok
            
            # Bird CLI'da cursor yoksa ikinci batch'i farklı yoldan dene
            if not cursor and remaining > 0:
                # Bird CLI cursor desteklemiyorsa, tek seferde max count dene
                logger.info(f"First batch: {len(all_raw)} tweets. Trying full fetch for remaining {remaining}...")
                full_result = self._run_bird(
                    ['user-tweets', f'@{username}', '-n', str(count)],
                    timeout=90
                )
                if full_result and len(full_result) > len(all_raw):
                    all_raw = full_result
                break
        
        # Deduplicate by tweet ID
        seen_ids = set()
        tweets = []
        for tweet in all_raw:
            tid = tweet.get('id')
            if tid and tid in seen_ids:
                continue
            if tid:
                seen_ids.add(tid)
            
            # RT'leri atla
            if tweet.get('retweetedTweet'):
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
        
        logger.info(f"Fetched {len(tweets)} tweets for @{username} (requested {count})")
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
