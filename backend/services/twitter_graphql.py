"""
Twitter GraphQL API client - Bird CLI'ın Python karşılığı.
macOS'ta Bird CLI varsa onu kullanır, yoksa (Linux/Hetzner) direkt HTTP ile çalışır.
"""
import subprocess
import json
import os
import logging
import shutil
from typing import List, Optional
import httpx

logger = logging.getLogger(__name__)

# Twitter GraphQL endpoints
TWITTER_API_BASE = "https://x.com/i/api/graphql"

# Known query IDs (Bird CLI'dan reverse-engineered, periyodik güncelleme gerekebilir)
QUERY_IDS = {
    "UserByScreenName": "AWbeRIdkLtqTRN7yL_H8yw",
    "UserTweets": "SURb7otVJKay5ECsD8ffXA",
    "TweetDetail": "XL2NEfLK2TBJfbT_KsXlbA",
    "Viewer": "178EtFdhcGqmoyzKL4muaA",
    "SearchTimeline": "IzA05zAvo7MGeZrkQmIVvw",
}

# Default features for most GraphQL endpoints (UserTweets, TweetDetail, etc.)
# Son güncelleme: 2026-02-11 — Twitter'ın zorunlu kıldığı tüm features
DEFAULT_FEATURES = {
    # Core tweet features
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "premium_content_api_read_enabled": False,
    "communities_web_enable_tweet_community_results_fetch": True,
    "c9s_tweet_anatomy_moderator_badge_enabled": True,
    "articles_preview_enabled": True,
    "responsive_web_edit_tweet_api_enabled": True,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
    "view_counts_everywhere_api_enabled": True,
    "longform_notetweets_consumption_enabled": True,
    "longform_notetweets_rich_text_read_enabled": True,
    "longform_notetweets_inline_media_enabled": True,
    "responsive_web_twitter_article_tweet_consumption_enabled": True,
    "tweet_awards_web_tipping_enabled": False,
    "freedom_of_speech_not_reach_fetch_enabled": True,
    "standardized_nudges_misinfo": True,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
    "responsive_web_enhance_cards_enabled": False,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    # Profile/subscription features
    "rweb_tipjar_consumption_enabled": True,
    "responsive_web_twitter_article_notes_tab_enabled": True,
    "responsive_web_profile_redirect_enabled": True,
    "profile_label_improvements_pcf_label_in_post_enabled": True,
    "subscriptions_feature_can_gift_premium": True,
    "subscriptions_verification_info_verified_since_enabled": True,
    "subscriptions_verification_info_is_identity_verified_enabled": True,
    "hidden_profile_subscriptions_enabled": True,
    "highlights_tweets_tab_ui_enabled": True,
    # Video
    "rweb_video_screen_enabled": True,
    # Post CTA
    "post_ctas_fetch_enabled": True,
    # Jetfuel
    "responsive_web_jetfuel_frame": False,
    # Grok features (2026-02, tümü zorunlu ama değerleri false yeterli)
    "responsive_web_grok_analysis_button_from_backend": False,
    "responsive_web_grok_image_annotation_enabled": False,
    "responsive_web_grok_imagine_annotation_enabled": False,
    "responsive_web_grok_annotations_enabled": False,
    "responsive_web_grok_analyze_button_fetch_trends_enabled": False,
    "responsive_web_grok_analyze_post_followups_enabled": False,
    "responsive_web_grok_share_attachment_enabled": False,
    "responsive_web_grok_show_grok_translated_post": False,
    "responsive_web_grok_community_note_auto_translation_is_enabled": False,
}

# UserByScreenName endpoint'i için minimal zorunlu feature seti
USER_BY_SCREEN_NAME_FEATURES = {
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "rweb_tipjar_consumption_enabled": True,
    "subscriptions_verification_info_verified_since_enabled": True,
    "responsive_web_twitter_article_notes_tab_enabled": True,
    "responsive_web_profile_redirect_enabled": True,
    "profile_label_improvements_pcf_label_in_post_enabled": True,
    "verified_phone_label_enabled": False,
    "hidden_profile_subscriptions_enabled": True,
    "highlights_tweets_tab_ui_enabled": True,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "subscriptions_verification_info_is_identity_verified_enabled": True,
    "subscriptions_feature_can_gift_premium": True,
}

# Required headers for Twitter GraphQL
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Client-Language": "en",
}


def _has_bird_cli() -> bool:
    """Check if Bird CLI is available."""
    return shutil.which("bird") is not None


def _build_cookies(auth_token: str, ct0: str) -> dict:
    """Build cookie dict for requests."""
    return {
        "auth_token": auth_token,
        "ct0": ct0,
    }


def _build_headers(ct0: str) -> dict:
    """Build headers with CSRF token."""
    headers = DEFAULT_HEADERS.copy()
    headers["X-Csrf-Token"] = ct0
    return headers


class TwitterGraphQL:
    """Direct Twitter GraphQL API client."""

    def __init__(self, auth_token: str, ct0: str):
        self.auth_token = auth_token
        self.ct0 = ct0
        self.use_bird = _has_bird_cli()
        if self.use_bird:
            logger.info("Bird CLI detected, will use it for requests")
        else:
            logger.info("Bird CLI not found, using direct GraphQL HTTP")

    def _bird_run(self, args: List[str], timeout: int = 30) -> Optional[list]:
        """Run bird CLI command."""
        cmd = ["bird"] + args + ["--json", "--auth-token", self.auth_token, "--ct0", self.ct0]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            if result.returncode != 0:
                logger.error(f"Bird CLI error: {result.stderr}")
                return None

            output = result.stdout.strip()

            # NDJSON parse
            lines = output.split("\n")
            ndjson = []
            for line in lines:
                line = line.strip()
                if line.startswith("{"):
                    try:
                        ndjson.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            if ndjson:
                return ndjson

            # Array parse
            idx = output.find("[")
            if idx != -1:
                json_str = output[idx:]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    # Truncated JSON recovery
                    last = json_str.rfind("}")
                    while last > 0:
                        try:
                            candidate = json_str[:last + 1].rstrip(",") + "]"
                            parsed = json.loads(candidate)
                            logger.info(f"Recovered {len(parsed)} items from truncated JSON")
                            return parsed
                        except json.JSONDecodeError:
                            last = json_str.rfind("}", 0, last)
            return None
        except subprocess.TimeoutExpired:
            logger.error("Bird CLI timeout")
            return None
        except Exception as e:
            logger.error(f"Bird CLI error: {e}")
            return None

    async def _graphql_request(self, query_id: str, operation: str, variables: dict, features: Optional[dict] = None, max_retries: int = 5) -> Optional[dict]:
        """Make a direct GraphQL request to Twitter with 429 retry/backoff.
        
        Rate limit window is ~15 min. Backoff: 60s → 120s → 180s → 240s → 300s
        Total max wait: ~15 min (enough to outlast a rate limit window)
        """
        import asyncio as _asyncio

        if features is None:
            features = DEFAULT_FEATURES.copy()

        params = {
            "variables": json.dumps(variables),
            "features": json.dumps(features),
        }

        headers = _build_headers(self.ct0)
        cookies = _build_cookies(self.auth_token, self.ct0)

        url = f"{TWITTER_API_BASE}/{query_id}/{operation}"

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(url, params=params, headers=headers, cookies=cookies)
                    if resp.status_code == 200:
                        return resp.json()
                    elif resp.status_code == 429:
                        if attempt >= max_retries:
                            break  # Don't sleep on last attempt
                        # Rate limited - linear backoff starting at 60s, max 300s
                        wait_secs = min(60 + (60 * attempt), 300)  # 60, 120, 180, 240, 300
                        logger.warning(f"⏳ Rate limited (429), waiting {wait_secs}s (attempt {attempt + 1}/{max_retries + 1})")
                        await _asyncio.sleep(wait_secs)
                        continue
                    else:
                        logger.error(f"Twitter GraphQL {resp.status_code}: {resp.text[:200]}")
                        return None
            except Exception as e:
                logger.error(f"Twitter GraphQL error: {e}")
                return None

        logger.error(f"Twitter GraphQL: max retries exhausted for {operation}")
        return None

    async def whoami(self) -> Optional[dict]:
        """Verify cookies by fetching viewer info."""
        if self.use_bird:
            result = self._bird_run(["whoami"], timeout=15)
            if result:
                return {"valid": True, "data": result}
            # Fallback to HTTP
        
        data = await self._graphql_request(
            QUERY_IDS["Viewer"], "Viewer",
            variables={},
            features={"responsive_web_graphql_exclude_directive_enabled": True}
        )
        if data and "data" in data:
            return {"valid": True, "data": data}
        return {"valid": False, "data": None}

    def get_user_tweets_sync(self, username: str, count: int = 100) -> List[dict]:
        """Sync version: Get user tweets (uses Bird CLI if available)."""
        if self.use_bird:
            result = self._bird_run(
                ["user-tweets", f"@{username}", "-n", str(count)],
                timeout=90,
            )
            return result or []
        
        # For non-Bird environments, caller should use async version
        logger.warning("Sync tweet fetch without Bird CLI not supported, use async")
        return []

    async def get_user_tweets(self, username: str, count: int = 50, max_pages: int = 1) -> List[dict]:
        """Async: Get user tweets via GraphQL with cursor pagination.
        
        Args:
            username: Twitter handle
            count: Total tweets to collect  
            max_pages: Max pagination pages (1=single request ~20 tweets, 5=~100 tweets)
        """
        if self.use_bird:
            result = self._bird_run(
                ["user-tweets", f"@{username}", "-n", str(count)],
                timeout=90,
            )
            return result or []

        # Direct GraphQL: First get user ID
        user_data = await self._graphql_request(
            QUERY_IDS["UserByScreenName"], "UserByScreenName",
            variables={"screen_name": username, "withSafetyModeUserFields": True},
            features=USER_BY_SCREEN_NAME_FEATURES,
        )

        if not user_data:
            return []

        try:
            user_id = user_data["data"]["user"]["result"]["rest_id"]
        except (KeyError, TypeError):
            logger.error("Could not extract user ID")
            return []

        all_tweets = []
        cursor = None
        page_size = min(count, 40)  # Twitter max per request ~40

        for page in range(max_pages):
            variables = {
                "userId": user_id,
                "count": page_size,
                "includePromotedContent": False,
                "withQuickPromoteEligibilityTweetFields": False,
                "withVoice": True,
                "withV2Timeline": True,
            }
            if cursor:
                variables["cursor"] = cursor

            tweets_data = await self._graphql_request(
                QUERY_IDS["UserTweets"], "UserTweets",
                variables=variables,
            )

            if not tweets_data:
                break

            # Parse timeline entries + extract cursor
            page_tweets, next_cursor = self._parse_timeline_entries(tweets_data, username)

            if not page_tweets:
                break

            all_tweets.extend(page_tweets)

            # Check if we have enough or no more pages
            if len(all_tweets) >= count or not next_cursor:
                break

            cursor = next_cursor

            # Rate limit between pages (3s gap to avoid 429)
            if page < max_pages - 1:
                import asyncio
                await asyncio.sleep(3.0)

        logger.info(f"Fetched {len(all_tweets)} tweets for @{username} via GraphQL ({page + 1} pages)")
        return all_tweets[:count]

    def _parse_timeline_entries(self, tweets_data: dict, username: str) -> tuple:
        """Parse timeline response into tweets list + bottom cursor.
        Returns: (tweets, bottom_cursor)
        """
        tweets = []
        bottom_cursor = None

        try:
            user_result = tweets_data["data"]["user"]["result"]
            timeline_obj = user_result.get("timeline_v2") or user_result.get("timeline")
            if not timeline_obj:
                logger.error("No timeline key found in user result")
                return [], None
            instructions = timeline_obj["timeline"]["instructions"]

            for instruction in instructions:
                if instruction.get("type") == "TimelineAddEntries":
                    for entry in instruction.get("entries", []):
                        content = entry.get("content", {})
                        entry_type = content.get("entryType") or content.get("__typename", "")

                        # Tweet entries
                        if entry_type == "TimelineTimelineItem":
                            tweet = self._parse_tweet_entry(content, username)
                            if tweet:
                                tweets.append(tweet)

                        # Cursor entries (for pagination)
                        elif entry_type == "TimelineTimelineCursor":
                            if content.get("cursorType") == "Bottom":
                                bottom_cursor = content.get("value")

                        # Module entries (Twitter sometimes wraps tweets in modules)
                        elif entry_type == "TimelineTimelineModule":
                            for item in content.get("items", []):
                                item_content = item.get("item", {}).get("itemContent", {})
                                if item_content:
                                    tweet = self._parse_tweet_result(
                                        item_content.get("tweet_results", {}).get("result", {}),
                                        username
                                    )
                                    if tweet:
                                        tweets.append(tweet)

        except (KeyError, TypeError) as e:
            logger.error(f"Tweet parse error: {e}")

        return tweets, bottom_cursor

    def _parse_tweet_entry(self, content: dict, username: str) -> Optional[dict]:
        """Parse a single TimelineTimelineItem into a tweet dict."""
        tweet_result = content.get("itemContent", {}).get("tweet_results", {}).get("result", {})
        return self._parse_tweet_result(tweet_result, username)

    def _parse_tweet_result(self, tweet_result: dict, username: str) -> Optional[dict]:
        """Parse a tweet_results.result object into a normalized tweet dict."""
        if not tweet_result:
            return None

        # Handle TweetWithVisibilityResults wrapper
        if tweet_result.get("__typename") == "TweetWithVisibilityResults":
            tweet_result = tweet_result.get("tweet", {})

        legacy = tweet_result.get("legacy", {})
        if not legacy:
            return None

        # Skip retweets
        if legacy.get("retweeted_status_result"):
            return None

        core = tweet_result.get("core", {}).get("user_results", {}).get("result", {}).get("legacy", {})

        # Extract view count (impressions)
        views = tweet_result.get("views", {})
        view_count = 0
        if views and views.get("count"):
            try:
                view_count = int(views["count"])
            except (ValueError, TypeError):
                pass

        # Extract bookmark count
        bookmark_count = legacy.get("bookmark_count", 0) or 0

        # Extract quote count
        quote_count = legacy.get("quote_count", 0) or 0

        return {
            "id": legacy.get("id_str"),
            "text": legacy.get("full_text", ""),
            "createdAt": legacy.get("created_at"),
            "likeCount": legacy.get("favorite_count", 0),
            "retweetCount": legacy.get("retweet_count", 0),
            "replyCount": legacy.get("reply_count", 0),
            "quoteCount": quote_count,
            "bookmarkCount": bookmark_count,
            "views": view_count,
            "conversationId": legacy.get("conversation_id_str"),
            "in_reply_to_status_id_str": legacy.get("in_reply_to_status_id_str"),
            "is_quote_status": legacy.get("is_quote_status", False),
            "author": {
                "username": core.get("screen_name", username),
                "name": core.get("name", ""),
            },
            "authorId": tweet_result.get("rest_id"),
            "media": legacy.get("extended_entities", {}).get("media"),
        }
