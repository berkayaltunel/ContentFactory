"""Style Profiles API routes - v3 (Tek adım stil profili)"""
from fastapi import APIRouter, HTTPException, Depends
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from services.twitter_scraper import scraper
from services.style_analyzer import analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/styles", tags=["styles"])


# ============ Models ============

class CreateFromHandleRequest(BaseModel):
    twitter_username: str

class CreateProfileRequest(BaseModel):
    name: str
    source_ids: List[str]

class ProfileResponse(BaseModel):
    id: str
    name: str
    twitter_username: Optional[str] = None
    twitter_display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    source_ids: List[str] = []
    tweet_count: int = 0
    style_summary: Optional[dict] = None
    created_at: str


def get_supabase():
    from server import supabase
    return supabase


# ============ Endpoints ============

@router.post("/create-from-handle", response_model=ProfileResponse)
async def create_from_handle(request: CreateFromHandleRequest, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Tek adımda: handle gir → tweet çek → analiz et → stil profili oluştur"""
    username = request.twitter_username.lstrip('@').strip()
    
    if not username:
        raise HTTPException(status_code=400, detail="Kullanıcı adı girin")
    
    # Check if user already has a profile for this handle
    existing = supabase.table("style_profiles").select("id,name,style_fingerprint").eq("user_id", user.id).execute()
    for p in (existing.data or []):
        fp = p.get("style_fingerprint") or {}
        if fp.get("twitter_username", "").lower() == username.lower():
            raise HTTPException(status_code=400, detail=f"@{username} için zaten bir stil profiliniz var")
    
    # 1. Get user info (avatar, display name)
    logger.info(f"[StyleLab] Fetching user info for @{username}")
    user_info = await scraper.get_user_info_async(username)
    
    if not user_info:
        raise HTTPException(status_code=404, detail=f"@{username} bulunamadı")
    
    display_name = user_info.get('name', username)
    avatar_url = user_info.get('avatar_url', '')
    
    # 2. Create source record (hidden from user, used internally for tweets)
    source_id = str(uuid.uuid4())
    source_data = {
        "id": source_id,
        "user_id": user.id,
        "twitter_username": username,
        "twitter_user_id": user_info.get('user_id'),
        "twitter_display_name": display_name,
        "tweet_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if source already exists
    existing_source = supabase.table("style_sources").select("id").eq("twitter_username", username).eq("user_id", user.id).execute()
    if existing_source.data:
        source_id = existing_source.data[0]["id"]
    else:
        supabase.table("style_sources").insert(source_data).execute()
    
    # 3. Fetch tweets
    logger.info(f"[StyleLab] Fetching tweets for @{username}")
    tweets = await scraper.get_user_tweets_async(username, count=500)
    
    if not tweets:
        raise HTTPException(status_code=400, detail=f"@{username} için tweet bulunamadı")
    
    # 4. Save tweets
    # Delete old tweets for this source first
    supabase.table("source_tweets").delete().eq("source_id", source_id).execute()
    
    tweet_records = []
    for tweet in tweets:
        tweet_records.append({
            "id": str(uuid.uuid4()),
            "source_id": source_id,
            "tweet_id": tweet['tweet_id'],
            "content": tweet['content'],
            "likes": tweet['likes'],
            "retweets": tweet['retweets'],
            "replies": tweet['replies'],
            "is_thread": tweet.get('is_thread', False),
            "has_media": tweet.get('has_media', False),
            "tweet_created_at": tweet.get('tweet_created_at'),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    if tweet_records:
        for i in range(0, len(tweet_records), 50):
            batch = tweet_records[i:i+50]
            try:
                supabase.table("source_tweets").insert(batch).execute()
            except Exception as e:
                logger.error(f"Failed to insert tweets batch: {e}")
    
    # Update source tweet count
    supabase.table("style_sources").update({
        "tweet_count": len(tweet_records),
        "last_scraped_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", source_id).execute()
    
    # 5. Analyze style
    logger.info(f"[StyleLab] Analyzing {len(tweet_records)} tweets")
    fingerprint = analyzer.analyze(tweet_records)
    
    # Store twitter info in fingerprint
    fingerprint['twitter_username'] = username
    fingerprint['twitter_display_name'] = display_name
    fingerprint['avatar_url'] = avatar_url
    
    # 6. AI deep analysis (optional, don't fail if it errors)
    try:
        from server import openai_client
        ai_analysis = analyzer.deep_analyze_with_ai(tweet_records, openai_client)
        if ai_analysis:
            fingerprint['ai_analysis'] = ai_analysis
            logger.info(f"[StyleLab] AI analysis complete")
    except Exception as e:
        logger.warning(f"[StyleLab] AI analysis skipped: {e}")
    
    # 7. Create profile
    profile_id = str(uuid.uuid4())
    profile_name = f"{display_name} Style"
    
    profile_data = {
        "id": profile_id,
        "user_id": user.id,
        "name": profile_name,
        "source_ids": [source_id],
        "style_fingerprint": fingerprint,
        "example_tweets": fingerprint.get('example_tweets', []),
        "tweet_count": len(tweet_records),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase.table("style_profiles").insert(profile_data).execute()
    
    # 8. Auto-embed tweets (background, don't fail)
    try:
        from embed_tweets import embed_tweets_for_source_sync
        embed_tweets_for_source_sync(source_id)
        logger.info(f"[StyleLab] Tweets embedded for @{username}")
    except Exception as e:
        logger.warning(f"[StyleLab] Auto-embed skipped: {e}")
    
    return ProfileResponse(
        id=profile_id,
        name=profile_name,
        twitter_username=username,
        twitter_display_name=display_name,
        avatar_url=avatar_url,
        source_ids=[source_id],
        tweet_count=len(tweet_records),
        style_summary={
            "tweet_count": fingerprint.get('tweet_count', 0),
            "avg_length": fingerprint.get('avg_length', 0),
            "avg_likes": fingerprint.get('avg_engagement', {}).get('likes', 0),
        },
        created_at=profile_data['created_at']
    )


@router.get("/list", response_model=List[ProfileResponse])
async def list_profiles(user=Depends(require_auth), supabase=Depends(get_supabase)):
    """List all style profiles"""
    result = supabase.table("style_profiles").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    
    # Hide system profiles
    HIDDEN_PROFILE_IDS = {"dd1a9608-1441-4b72-bf28-83e11d4c5a60", "f3935ab1-3728-4b79-9fa9-fb895a2b4903"}
    
    profiles = []
    for row in (result.data or []):
        if row.get("id") in HIDDEN_PROFILE_IDS:
            continue
        
        fp = row.get('style_fingerprint', {}) or {}
        
        profiles.append(ProfileResponse(
            id=row['id'],
            name=row['name'],
            twitter_username=fp.get('twitter_username', ''),
            twitter_display_name=fp.get('twitter_display_name', ''),
            avatar_url=fp.get('avatar_url', ''),
            source_ids=row.get('source_ids', []),
            tweet_count=row.get('tweet_count', 0) or fp.get('tweet_count', 0),
            style_summary={
                "tweet_count": fp.get('tweet_count', 0),
                "avg_length": fp.get('avg_length', 0),
                "avg_likes": fp.get('avg_engagement', {}).get('likes', 0),
            },
            created_at=row['created_at']
        ))
    
    return profiles


@router.post("/create", response_model=ProfileResponse)
async def create_style_profile(request: CreateProfileRequest, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Create a style profile from existing sources (legacy)"""
    for source_id in request.source_ids:
        check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
        if not check.data:
            raise HTTPException(status_code=403, detail="Bu kaynak size ait değil")
    
    all_tweets = []
    for source_id in request.source_ids:
        result = supabase.table("source_tweets").select("*").eq("source_id", source_id).execute()
        all_tweets.extend(result.data)
    
    if not all_tweets:
        raise HTTPException(status_code=400, detail="Tweet bulunamadı")
    
    fingerprint = analyzer.analyze(all_tweets)
    
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
    
    fp = fingerprint
    return ProfileResponse(
        id=profile_id,
        name=request.name,
        source_ids=request.source_ids,
        tweet_count=fp.get('tweet_count', 0),
        style_summary={
            "tweet_count": fp.get('tweet_count', 0),
            "avg_length": fp.get('avg_length', 0),
            "avg_likes": fp.get('avg_engagement', {}).get('likes', 0),
        },
        created_at=profile_data['created_at']
    )


@router.get("/{profile_id}")
async def get_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get full profile"""
    result = supabase.table("style_profiles").select("*").eq("id", profile_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    return result.data[0]


@router.get("/{profile_id}/prompt")
async def get_style_prompt(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get the style prompt for generation"""
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


# System profiles that cannot be deleted
PROTECTED_PROFILE_IDS = {"dd1a9608-1441-4b72-bf28-83e11d4c5a60"}  # BeatstoBytes shitpost


@router.delete("/{profile_id}")
async def delete_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Delete a style profile"""
    if profile_id in PROTECTED_PROFILE_IDS:
        raise HTTPException(status_code=403, detail="Bu profil sistem tarafından korunuyor ve silinemez")
    result = supabase.table("style_profiles").delete().eq("id", profile_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    return {"success": True}


@router.post("/{profile_id}/refresh")
async def refresh_style_profile(profile_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Refresh: re-fetch tweets and re-analyze"""
    result = supabase.table("style_profiles").select("*").eq("id", profile_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    
    profile = result.data[0]
    source_ids = profile.get('source_ids', [])
    fp = profile.get('style_fingerprint', {}) or {}
    username = fp.get('twitter_username', '')
    
    if not username and source_ids:
        # Legacy profile: get username from source
        src = supabase.table("style_sources").select("twitter_username").eq("id", source_ids[0]).execute()
        if src.data:
            username = src.data[0].get('twitter_username', '')
    
    if not username:
        raise HTTPException(status_code=400, detail="Twitter kullanıcı adı bulunamadı")
    
    # Re-fetch user info for updated avatar
    user_info = await scraper.get_user_info_async(username)
    avatar_url = user_info.get('avatar_url', '') if user_info else fp.get('avatar_url', '')
    display_name = user_info.get('name', '') if user_info else fp.get('twitter_display_name', '')
    
    # Re-fetch tweets
    logger.info(f"[StyleLab] Refreshing tweets for @{username}")
    tweets = await scraper.get_user_tweets_async(username, count=500)
    
    all_tweets = []
    errors = []
    
    if tweets:
        source_id = source_ids[0] if source_ids else str(uuid.uuid4())
        
        # Delete old tweets
        supabase.table("source_tweets").delete().eq("source_id", source_id).execute()
        
        tweet_records = []
        for tweet in tweets:
            tweet_records.append({
                "id": str(uuid.uuid4()),
                "source_id": source_id,
                "tweet_id": tweet['tweet_id'],
                "content": tweet['content'],
                "likes": tweet['likes'],
                "retweets": tweet['retweets'],
                "replies": tweet['replies'],
                "is_thread": tweet.get('is_thread', False),
                "has_media": tweet.get('has_media', False),
                "tweet_created_at": tweet.get('tweet_created_at'),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        for i in range(0, len(tweet_records), 50):
            batch = tweet_records[i:i+50]
            try:
                supabase.table("source_tweets").insert(batch).execute()
            except Exception as e:
                logger.error(f"Batch insert error: {e}")
        
        all_tweets = tweet_records
        
        supabase.table("style_sources").update({
            "tweet_count": len(tweet_records),
            "last_scraped_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", source_id).execute()
        
        # Auto-embed
        try:
            from embed_tweets import embed_tweets_for_source_sync
            embed_tweets_for_source_sync(source_id)
        except Exception as e:
            logger.warning(f"Auto-embed skipped: {e}")
    else:
        errors.append(f"@{username}: tweet çekilemedi")
        # Use existing tweets
        if source_ids:
            existing = supabase.table("source_tweets").select("*").eq("source_id", source_ids[0]).execute()
            all_tweets = existing.data or []
    
    if not all_tweets:
        raise HTTPException(status_code=500, detail="Tweet bulunamadı")
    
    # Re-analyze
    fingerprint = analyzer.analyze(all_tweets)
    fingerprint['twitter_username'] = username
    fingerprint['twitter_display_name'] = display_name
    fingerprint['avatar_url'] = avatar_url
    
    # AI analysis
    try:
        from server import openai_client
        ai_analysis = analyzer.deep_analyze_with_ai(all_tweets, openai_client)
        if ai_analysis:
            fingerprint['ai_analysis'] = ai_analysis
    except Exception as e:
        logger.warning(f"AI analysis skipped: {e}")
    
    # Update profile
    supabase.table("style_profiles").update({
        "style_fingerprint": fingerprint,
        "example_tweets": fingerprint.get('example_tweets', []),
        "tweet_count": len(all_tweets),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", profile_id).eq("user_id", user.id).execute()
    
    return {
        "success": True,
        "profile_id": profile_id,
        "tweets_analyzed": len(all_tweets),
        "errors": errors if errors else None,
    }


@router.post("/analyze-source/{source_id}")
async def analyze_source(source_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Analyze a single source (legacy)"""
    source_check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
    if not source_check.data:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    
    result = supabase.table("source_tweets").select("*").eq("source_id", source_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tweet bulunamadı")
    
    fingerprint = analyzer.analyze(result.data)
    style_prompt = analyzer.generate_style_prompt(fingerprint)
    
    return {
        "source_id": source_id,
        "fingerprint": fingerprint,
        "style_prompt": style_prompt
    }
