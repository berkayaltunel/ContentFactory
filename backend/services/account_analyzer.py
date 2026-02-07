"""Account Analysis Service - Bird CLI + GPT-4o"""
import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from openai import OpenAI
from supabase import create_client

logger = logging.getLogger(__name__)

supabase_url = os.environ.get('SUPABASE_URL', '')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
supabase = create_client(supabase_url, supabase_key) if supabase_url else None

openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY', ''))


class AccountAnalyzer:
    async def scrape_account(self, username: str) -> dict:
        """Scrape account tweets via Bird CLI (uses existing TwitterScraper)"""
        from services.twitter_scraper import scraper
        
        username = username.lstrip('@')
        tweets = await asyncio.to_thread(scraper.get_user_tweets, username, 100)
        user_info = await asyncio.to_thread(scraper.get_user_info, username)
        
        return {
            "username": username,
            "user_info": user_info,
            "tweets": tweets,
            "tweet_count": len(tweets),
        }

    async def analyze_account(self, username: str, tweets: list) -> dict:
        """Analyze account with GPT-4o"""
        if not tweets:
            return {"error": "No tweets found"}

        # Prepare tweet data for analysis
        tweets_text = ""
        for i, t in enumerate(tweets[:80]):
            tweets_text += f"\n[{i+1}] ({t.get('likes',0)}❤ {t.get('retweets',0)}🔁 {t.get('replies',0)}💬) {t.get('content','')[:300]}"
            if t.get('tweet_created_at'):
                tweets_text += f" | {t['tweet_created_at']}"

        prompt = f"""@{username} kullanıcısının son {len(tweets)} tweet'ini analiz et:

{tweets_text}

Detaylı analiz yap ve JSON formatında döndür:
{{
  "overall_score": 0-100,
  "dimensions": {{
    "content_quality": 0-100,
    "engagement_rate": 0-100,
    "consistency": 0-100,
    "creativity": 0-100,
    "community": 0-100,
    "growth_potential": 0-100
  }},
  "content_types": {{
    "opinion": yüzde,
    "informative": yüzde,
    "promotional": yüzde,
    "personal": yüzde,
    "thread": yüzde,
    "engagement_bait": yüzde
  }},
  "tone_analysis": "genel ton açıklaması (1-2 cümle)",
  "posting_frequency": "günlük/haftalık ortalama",
  "best_posting_hours": [en iyi saatler listesi],
  "posting_heatmap": [
    {{"day": "Pazartesi", "hours": {{"9": count, "10": count, ...}}}},
    ...7 gün
  ],
  "top_tweets": [
    {{"content": "tweet metni", "likes": X, "retweets": X, "replies": X, "why_good": "neden iyi"}}
  ],
  "hashtag_strategy": "hashtag kullanımı analizi",
  "strengths": [
    {{"title": "Güçlü yön başlığı", "description": "Açıklama"}}
  ],
  "weaknesses": [
    {{"title": "Zayıf yön başlığı", "description": "Açıklama"}}
  ],
  "recommendations": [
    {{"title": "Öneri başlığı", "description": "Detaylı öneri", "priority": "high|medium|low"}}
  ],
  "growth_tips": "3-5 cümle büyüme stratejisi özeti",
  "similar_accounts": ["benzer hesap önerileri"]
}}

Tüm metinler Türkçe olsun. Top 5 tweet seç (engagement bazlı). Posting heatmap'te gerçek veriye dayanarak tahmin yap."""

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sen bir sosyal medya analisti ve büyüme stratejistisin. Detaylı, aksiyon alınabilir analizler üretiyorsun. JSON formatında yanıt ver."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            analysis = json.loads(response.choices[0].message.content.strip())
            return analysis

        except Exception as e:
            logger.error(f"Account analysis failed: {e}")
            return {"error": str(e)}

    async def full_analysis(self, username: str) -> dict:
        """Complete analysis pipeline: scrape + analyze + save"""
        username = username.lstrip('@')

        # Scrape
        scrape_result = await self.scrape_account(username)
        if not scrape_result.get("tweets"):
            return {"success": False, "error": f"@{username} için tweet bulunamadı"}

        # Analyze
        analysis = await self.analyze_account(username, scrape_result["tweets"])
        if analysis.get("error"):
            return {"success": False, "error": analysis["error"]}

        # Build result
        result = {
            "id": str(uuid.uuid4()),
            "username": username,
            "user_info": scrape_result.get("user_info"),
            "tweet_count_analyzed": scrape_result["tweet_count"],
            "analysis": analysis,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save to Supabase
        try:
            supabase.table("account_analyses").insert({
                "id": result["id"],
                "username": username,
                "tweet_count": scrape_result["tweet_count"],
                "overall_score": analysis.get("overall_score", 0),
                "analysis": analysis,
                "created_at": result["created_at"],
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to save analysis: {e}")

        result["success"] = True
        return result

    async def compare_accounts(self, usernames: list) -> dict:
        """Compare 2-3 accounts"""
        results = []
        for username in usernames[:3]:
            result = await self.full_analysis(username)
            results.append(result)

        comparison_data = []
        for r in results:
            if r.get("success"):
                comparison_data.append({
                    "username": r["username"],
                    "overall_score": r["analysis"].get("overall_score", 0),
                    "dimensions": r["analysis"].get("dimensions", {}),
                    "strengths_count": len(r["analysis"].get("strengths", [])),
                    "weaknesses_count": len(r["analysis"].get("weaknesses", [])),
                })

        return {
            "success": True,
            "accounts": results,
            "comparison": comparison_data,
        }


# Singleton
account_analyzer = AccountAnalyzer()
