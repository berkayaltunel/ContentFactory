"""Style Sources API routes"""
from fastapi import APIRouter, HTTPException, Depends
from middleware.auth import require_auth
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from services.twitter_scraper import scraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["sources"])

# Models
class AddSourceRequest(BaseModel):
    twitter_username: str

class SourceResponse(BaseModel):
    id: str
    twitter_username: str
    twitter_display_name: Optional[str]
    tweet_count: int
    last_scraped_at: Optional[str]
    created_at: str

class TweetResponse(BaseModel):
    id: str
    tweet_id: str
    content: str
    likes: int
    retweets: int
    replies: int
    is_thread: bool
    has_media: bool

# Dependency to get supabase client
def get_supabase():
    from server import supabase
    return supabase

@router.post("/add", response_model=SourceResponse)
async def add_source(request: AddSourceRequest, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Add a Twitter user as style source and fetch their tweets"""
    username = request.twitter_username.lstrip('@')
    
    # Check if already exists FOR THIS USER
    existing = supabase.table("style_sources").select("*").eq("twitter_username", username).eq("user_id", user.id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"@{username} zaten ekli")
    
    # Get user info
    logger.info(f"Fetching user info for @{username}")
    user_info = scraper.get_user_info(username)
    
    if not user_info:
        raise HTTPException(status_code=404, detail=f"@{username} bulunamadı")
    
    # Create source record
    source_id = str(uuid.uuid4())
    source_data = {
        "id": source_id,
        "user_id": user.id,
        "twitter_username": username,
        "twitter_user_id": user_info.get('user_id'),
        "twitter_display_name": user_info.get('name'),
        "tweet_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase.table("style_sources").insert(source_data).execute()
    
    # Fetch tweets in background (for now, sync)
    logger.info(f"Fetching tweets for @{username}")
    tweets = scraper.get_user_tweets(username, count=200)
    
    # Save tweets
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
            "is_thread": tweet['is_thread'],
            "has_media": tweet['has_media'],
            "tweet_created_at": tweet.get('tweet_created_at'),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    if tweet_records:
        # Insert in batches
        batch_size = 50
        for i in range(0, len(tweet_records), batch_size):
            batch = tweet_records[i:i+batch_size]
            try:
                supabase.table("source_tweets").insert(batch).execute()
            except Exception as e:
                logger.error(f"Failed to insert tweets batch: {e}")
    
    # Update source with tweet count
    supabase.table("style_sources").update({
        "tweet_count": len(tweet_records),
        "last_scraped_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", source_id).execute()
    
    # Auto-embed tweets
    try:
        from embed_tweets import embed_tweets_for_source_sync
        embed_tweets_for_source_sync(source_id)
        logger.info(f"Auto-embedded tweets for source {source_id}")
    except Exception as e:
        logger.warning(f"Auto-embed failed for source {source_id}: {e}")
    
    return SourceResponse(
        id=source_id,
        twitter_username=username,
        twitter_display_name=user_info.get('name'),
        tweet_count=len(tweet_records),
        last_scraped_at=datetime.now(timezone.utc).isoformat(),
        created_at=source_data['created_at']
    )

@router.get("/list", response_model=List[SourceResponse])
async def list_sources(user=Depends(require_auth), supabase=Depends(get_supabase)):
    """List all style sources for this user"""
    result = supabase.table("style_sources").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    
    sources = []
    for row in result.data:
        sources.append(SourceResponse(
            id=row['id'],
            twitter_username=row['twitter_username'],
            twitter_display_name=row.get('twitter_display_name'),
            tweet_count=row.get('tweet_count', 0),
            last_scraped_at=row.get('last_scraped_at'),
            created_at=row['created_at']
        ))
    
    return sources

@router.get("/{source_id}/tweets", response_model=List[TweetResponse])
async def get_source_tweets(source_id: str, limit: int = 50, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Get tweets from a source (verify ownership first)"""
    # Verify source belongs to user
    source_check = supabase.table("style_sources").select("id").eq("id", source_id).eq("user_id", user.id).execute()
    if not source_check.data:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    
    result = supabase.table("source_tweets").select("*").eq("source_id", source_id).order("likes", desc=True).limit(limit).execute()
    
    tweets = []
    for row in result.data:
        tweets.append(TweetResponse(
            id=row['id'],
            tweet_id=row['tweet_id'],
            content=row['content'],
            likes=row.get('likes', 0),
            retweets=row.get('retweets', 0),
            replies=row.get('replies', 0),
            is_thread=row.get('is_thread', False),
            has_media=row.get('has_media', False)
        ))
    
    return tweets

@router.delete("/{source_id}")
async def delete_source(source_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Delete a style source and its tweets (user-scoped)"""
    # Only delete if belongs to user
    result = supabase.table("style_sources").delete().eq("id", source_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    return {"success": True}

@router.post("/{source_id}/refresh")
async def refresh_source(source_id: str, user=Depends(require_auth), supabase=Depends(get_supabase)):
    """Re-fetch tweets for a source (verify ownership)"""
    # Get source - verify belongs to user
    result = supabase.table("style_sources").select("*").eq("id", source_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    
    source = result.data[0]
    username = source['twitter_username']
    
    # Fetch new tweets
    tweets = scraper.get_user_tweets(username, count=200)
    
    # Delete old tweets
    supabase.table("source_tweets").delete().eq("source_id", source_id).execute()
    
    # Insert new tweets
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
            "is_thread": tweet['is_thread'],
            "has_media": tweet['has_media'],
            "tweet_created_at": tweet.get('tweet_created_at'),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    if tweet_records:
        batch_size = 50
        for i in range(0, len(tweet_records), batch_size):
            batch = tweet_records[i:i+batch_size]
            supabase.table("source_tweets").insert(batch).execute()
    
    # Update source
    supabase.table("style_sources").update({
        "tweet_count": len(tweet_records),
        "last_scraped_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", source_id).execute()
    
    # Auto-embed tweets
    try:
        from embed_tweets import embed_tweets_for_source_sync
        embed_tweets_for_source_sync(source_id)
        logger.info(f"Auto-embedded tweets for refreshed source {source_id}")
    except Exception as e:
        logger.warning(f"Auto-embed failed for source {source_id}: {e}")
    
    return {"success": True, "tweet_count": len(tweet_records)}
