"""Style Profiles API routes"""
from fastapi import APIRouter, HTTPException, Depends
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from services.style_analyzer import analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/styles", tags=["styles"])


class CreateProfileRequest(BaseModel):
    name: str
    source_ids: List[str]


class ProfileResponse(BaseModel):
    id: str
    name: str
    source_ids: List[str]
    style_summary: Optional[dict] = None
    created_at: str


def get_supabase():
    from server import supabase
    return supabase


@router.post("/create", response_model=ProfileResponse)
async def create_style_profile(request: CreateProfileRequest, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Create a style profile from multiple sources"""
    
    # Verify all source_ids belong to the user
    for source_id in request.source_ids:
        check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
        if not check.data:
            raise HTTPException(status_code=403, detail="Bu kaynak size ait değil")
    
    # Fetch all tweets from sources
    all_tweets = []
    for source_id in request.source_ids:
        result = supabase.table("source_tweets").select("*").eq("source_id", source_id).execute()
        all_tweets.extend(result.data)
    
    if not all_tweets:
        raise HTTPException(status_code=400, detail="No tweets found for selected sources")
    
    # Analyze style
    logger.info(f"Analyzing {len(all_tweets)} tweets for style profile")
    fingerprint = analyzer.analyze(all_tweets)
    
    # Create profile
    profile_id = str(uuid.uuid4())
    profile_data = {
        "id": profile_id,
        "user_id": user.id,
        "name": request.name,
        "source_ids": request.source_ids,
        "style_fingerprint": fingerprint,
        "example_tweets": fingerprint.get('example_tweets', []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase.table("style_profiles").insert(profile_data).execute()
    
    return ProfileResponse(
        id=profile_id,
        name=request.name,
        source_ids=request.source_ids,
        style_summary={
            "tweet_count": fingerprint.get('tweet_count', 0),
            "avg_length": fingerprint.get('avg_length', 0),
            "avg_likes": fingerprint.get('avg_engagement', {}).get('likes', 0),
            "emoji_usage": fingerprint.get('emoji_usage', 0),
            "top_hooks": fingerprint.get('hook_patterns', [])[:3]
        },
        created_at=profile_data['created_at']
    )


@router.get("/list", response_model=List[ProfileResponse])
async def list_profiles(user=Depends(require_auth), supabase=Depends(get_supabase)):
    """List all style profiles for this user"""
    result = supabase.table("style_profiles").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    
    profiles = []
    for row in result.data:
        fingerprint = row.get('style_fingerprint', {})
        profiles.append(ProfileResponse(
            id=row['id'],
            name=row['name'],
            source_ids=row.get('source_ids', []),
            style_summary={
                "tweet_count": fingerprint.get('tweet_count', 0),
                "avg_length": fingerprint.get('avg_length', 0),
                "avg_likes": fingerprint.get('avg_engagement', {}).get('likes', 0),
                "emoji_usage": fingerprint.get('emoji_usage', 0),
                "top_hooks": fingerprint.get('hook_patterns', [])[:3]
            },
            created_at=row['created_at']
        ))
    
    return profiles


@router.get("/{profile_id}")
async def get_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get full profile with fingerprint (user-scoped)"""
    result = supabase.table("style_profiles").select("*").eq("id", profile_id).eq("user_id", user.id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    
    return result.data[0]


@router.get("/{profile_id}/prompt")
async def get_style_prompt(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get the style prompt for generation (user-scoped)"""
    result = supabase.table("style_profiles").select("*").eq("id", profile_id).eq("user_id", user.id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    
    fingerprint = result.data[0].get('style_fingerprint', {})
    prompt = analyzer.generate_style_prompt(fingerprint)
    
    return {
        "profile_id": profile_id,
        "profile_name": result.data[0].get('name'),
        "style_prompt": prompt
    }


@router.delete("/{profile_id}")
async def delete_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Delete a style profile (user-scoped)"""
    result = supabase.table("style_profiles").delete().eq("id", profile_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    return {"success": True}


@router.post("/{profile_id}/refresh")
async def refresh_style_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Refresh a style profile by re-scraping tweets and AI-powered deep analysis (user-scoped)."""
    from services.twitter_scraper import scraper
    
    # Get existing profile - verify belongs to user
    result = supabase.table("style_profiles").select("*").eq("id", profile_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    
    profile = result.data[0]
    source_ids = profile.get('source_ids', [])
    
    if not source_ids:
        raise HTTPException(status_code=400, detail="No sources linked to this profile")
    
    # Verify all sources belong to user
    for source_id in source_ids:
        src_check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
        if not src_check.data:
            raise HTTPException(status_code=403, detail="Bu kaynak size ait değil")
    
    # Get sources and re-scrape
    all_tweets = []
    errors = []
    
    for source_id in source_ids:
        source_result = supabase.table("style_sources").select("*").eq("id", source_id).eq("user_id", user.id).execute()
        if not source_result.data:
            errors.append(f"Source {source_id} not found")
            continue
        
        source = source_result.data[0]
        username = (source.get('twitter_username') or source.get('username', '')).lstrip('@')
        
        if not username:
            errors.append(f"Source {source_id}: username boş")
            continue
        
        try:
            logger.info(f"Scraping 100 tweets from @{username}")
            tweets = scraper.get_user_tweets(username, count=100)
            
            if tweets:
                supabase.table("source_tweets").delete().eq("source_id", source_id).execute()
                
                tweet_records = []
                for tweet in tweets:
                    tweet_records.append({
                        "id": str(uuid.uuid4()),
                        "source_id": source_id,
                        "tweet_id": tweet.get('tweet_id', ''),
                        "content": tweet.get('content', ''),
                        "likes": tweet.get('likes', 0),
                        "retweets": tweet.get('retweets', 0),
                        "replies": tweet.get('replies', 0),
                        "created_at": tweet.get('tweet_created_at', datetime.now(timezone.utc).isoformat())
                    })
                
                for i in range(0, len(tweet_records), 50):
                    batch = tweet_records[i:i+50]
                    supabase.table("source_tweets").insert(batch).execute()
                
                all_tweets.extend(tweets)
                
                supabase.table("style_sources").update({
                    "tweet_count": len(tweets),
                    "last_scraped_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", source_id).execute()
                
                logger.info(f"@{username}: {len(tweets)} tweets saved")
                
        except Exception as e:
            logger.error(f"Error scraping @{username}: {str(e)}")
            errors.append(f"@{username}: {str(e)}")
            existing = supabase.table("source_tweets").select("*").eq("source_id", source_id).execute()
            all_tweets.extend(existing.data)
    
    if not all_tweets:
        raise HTTPException(status_code=500, detail=f"Tweet bulunamadı. Hatalar: {', '.join(errors)}")
    
    # Temel istatistiksel analiz
    logger.info(f"Analyzing {len(all_tweets)} tweets for profile {profile_id}")
    fingerprint = analyzer.analyze(all_tweets)
    
    # GPT-4o ile derinlemesine stil analizi
    try:
        from server import openai_client
        logger.info("Starting AI deep style analysis...")
        ai_analysis = analyzer.deep_analyze_with_ai(all_tweets, openai_client)
        if ai_analysis:
            fingerprint['ai_analysis'] = ai_analysis
            logger.info(f"AI analysis complete ({len(ai_analysis)} chars)")
    except Exception as e:
        logger.error(f"AI analysis failed (using basic analysis): {e}")
    
    # Profili güncelle
    update_data = {
        "style_fingerprint": fingerprint,
        "example_tweets": fingerprint.get('example_tweets', []),
    }
    supabase.table("style_profiles").update(update_data).eq("id", profile_id).eq("user_id", user.id).execute()
    
    return {
        "success": True,
        "profile_id": profile_id,
        "tweets_analyzed": len(all_tweets),
        "sources_refreshed": len(source_ids) - len(errors),
        "errors": errors if errors else None,
        "has_ai_analysis": bool(fingerprint.get('ai_analysis')),
        "style_summary": {
            "tweet_count": fingerprint.get('tweet_count', 0),
            "avg_length": fingerprint.get('avg_length', 0),
            "avg_likes": fingerprint.get('avg_engagement', {}).get('likes', 0),
            "emoji_usage": fingerprint.get('emoji_usage', 0),
            "top_hooks": fingerprint.get('hook_patterns', [])[:3]
        }
    }


@router.post("/analyze-source/{source_id}")
async def analyze_source(source_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Analyze a single source without creating a profile (verify ownership)"""
    # Verify source belongs to user
    source_check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
    if not source_check.data:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    
    result = supabase.table("source_tweets").select("*").eq("source_id", source_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="No tweets found")
    
    fingerprint = analyzer.analyze(result.data)
    style_prompt = analyzer.generate_style_prompt(fingerprint)
    
    return {
        "source_id": source_id,
        "fingerprint": fingerprint,
        "style_prompt": style_prompt
    }
