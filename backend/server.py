from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import re
import httpx
from datetime import datetime, timezone
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== SECURITY: .env validation ====================
import sys

if not os.environ.get('COOKIE_ENCRYPTION_KEY'):
    print("FATAL: COOKIE_ENCRYPTION_KEY is not set in .env. Server cannot start.", file=sys.stderr)
    sys.exit(1)

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)

# OpenAI client
openai_api_key = os.environ.get('OPENAI_API_KEY')
openai_client = None
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)

# Create the main app
app = FastAPI(docs_url=None if not os.environ.get("DEBUG") else "/docs", redoc_url=None)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== PROMPT SYSTEM ====================
# Import from modular prompt system
from prompts.builder import (
    build_final_prompt,
    PERSONAS,
    TONES,
    KNOWLEDGE_MODES,
    LENGTH_CONSTRAINTS,
    REPLY_MODES,
    ARTICLE_STYLES
)

# ==================== AUTH ====================
from middleware.auth import require_auth, optional_auth
from middleware.rate_limit import rate_limit
from middleware.input_sanitizer import sanitize_generation_request
from middleware.token_tracker import check_token_budget, record_token_usage

# ==================== MODELS ====================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Content Generation Models
class TweetGenerateRequest(BaseModel):
    topic: str
    mode: str = "classic"
    length: str = "punch"
    variants: int = 1
    persona: str = "otorite"
    tone: str = "natural"
    knowledge: Optional[str] = None  # insider, contrarian, hidden, expert
    language: str = "auto"
    additional_context: Optional[str] = None
    style_profile_id: Optional[str] = None
    image_url: Optional[str] = None  # For image attachment
    image_base64: Optional[str] = None  # Base64 encoded image for vision analysis

class QuoteGenerateRequest(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    length: str = "punch"
    variants: int = 1
    persona: str = "otorite"
    tone: str = "natural"
    knowledge: Optional[str] = None
    language: str = "auto"
    additional_context: Optional[str] = None

class ReplyGenerateRequest(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    length: str = "punch"
    reply_mode: str = "support"
    variants: int = 1
    persona: str = "otorite"
    tone: str = "natural"
    knowledge: Optional[str] = None
    language: str = "auto"
    additional_context: Optional[str] = None

class ArticleGenerateRequest(BaseModel):
    topic: str
    title: Optional[str] = None
    length: str = "standard"
    style: str = "authority"
    language: str = "auto"
    reference_links: Optional[List[str]] = None
    additional_context: Optional[str] = None

class GeneratedContent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    variant_index: int = 0
    character_count: int = 0
    media_suggestion: Optional[dict] = None  # For video/media suggestions
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerationResponse(BaseModel):
    success: bool
    variants: List[GeneratedContent]
    error: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

async def analyze_image_with_vision(image_base64: str) -> str:
    """Analyze an uploaded image with GPT-4o vision and return a description."""
    if not openai_client or not image_base64:
        return ""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Bu görseli kısaca analiz et. Ne görüyorsun? Renkleri, objeleri, ortamı, duyguyu ve varsa metni belirt. Max 3 cümle, Türkçe yaz."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_base64}
                        }
                    ]
                }
            ],
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Vision analysis error: {str(e)}")
        return ""

async def generate_with_openai(system_prompt: str, user_prompt: str, variants: int = 1, user_id: str = None) -> tuple[List[str], int]:
    """Generate content using OpenAI API. Returns (results, total_tokens_used)."""
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Check token budget if user_id provided
    if user_id:
        check_token_budget(user_id)

    results = []
    total_tokens = 0

    for i in range(variants):
        try:
            variant_prompt = user_prompt
            if variants > 1:
                approaches = [
                    "Kişisel deneyim/gözlem açısından yaz. 'Ben...' veya 'Gördüğüm kadarıyla...' ile başla.",
                    "Contrarian/karşıt bir açıdan yaz. Herkesin kabul ettiği bir şeyi sorgula.",
                    "Spesifik bir veri, rakam veya örnek üzerinden git. Somut ol.",
                    "Kısa ve keskin bir iddia ortaya koy. Açıklama yapma, sadece söyle.",
                    "Bir karşılaştırma veya analoji üzerinden anlat."
                ]
                variant_prompt += f"\n\nBu {i+1}. varyant. Yaklaşım: {approaches[i % len(approaches)]}"

            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": variant_prompt}
                ],
                temperature=0.85 + (i * 0.05),
                max_tokens=3000
            )

            content = response.choices[0].message.content.strip()
            results.append(content)

            # Track token usage
            if response.usage:
                total_tokens += response.usage.total_tokens

        except Exception as e:
            logger.error(f"OpenAI API error (internal)")
            raise HTTPException(status_code=500, detail="AI üretimi başarısız oldu")

    # Record token usage
    if user_id and total_tokens > 0:
        record_token_usage(user_id, total_tokens)

    return results, total_tokens

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"status": "ok"}

@api_router.get("/auth/check")
async def auth_check(user=Depends(require_auth)):
    """Frontend login sonrası whitelist kontrolü. 200 dönerse kullanıcı geçerli."""
    return {
        "authorized": True,
        "user_id": user.id,
        "email": user.email,
    }

@api_router.get("/health")
async def health_check():
    return {"status": "ok"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, user=Depends(require_auth)):
    status_obj = StatusCheck(client_name=input.client_name)
    supabase.table("status_checks").insert({
        "id": status_obj.id,
        "client_name": status_obj.client_name,
        "timestamp": status_obj.timestamp.isoformat(),
        "user_id": user.id
    }).execute()
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(user=Depends(require_auth)):
    result = supabase.table("status_checks").select("*").eq("user_id", user.id).limit(100).execute()
    return result.data

# ==================== METADATA ROUTES ====================

@api_router.get("/meta/personas")
async def get_personas():
    """Return available personas for frontend"""
    return [
        {"id": key, "name": val["name"], "label": val["label"], "description": val["description"]}
        for key, val in PERSONAS.items()
    ]

@api_router.get("/meta/tones")
async def get_tones():
    """Return available tones for frontend"""
    return [
        {"id": key, "name": val["name"], "label": val["label"], "description": val["description"]}
        for key, val in TONES.items()
    ]

@api_router.get("/meta/knowledge-modes")
async def get_knowledge_modes():
    """Return available knowledge modes for frontend"""
    return [
        {"id": key, "name": val["name"], "label": val["label"], "description": val["description"]}
        for key, val in KNOWLEDGE_MODES.items()
    ]

@api_router.get("/meta/lengths/{content_type}")
async def get_lengths(content_type: str):
    """Return available lengths for a content type"""
    type_constraints = LENGTH_CONSTRAINTS.get(content_type, LENGTH_CONSTRAINTS["tweet"])
    return [
        {"id": key, "label": val["label"], "chars": val["chars"]}
        for key, val in type_constraints.items()
    ]

@api_router.get("/meta/reply-modes")
async def get_reply_modes():
    """Return available reply modes for frontend"""
    return [
        {"id": key, "name": val["name"], "approach": val["approach"]}
        for key, val in REPLY_MODES.items()
    ]

@api_router.get("/meta/article-styles")
async def get_article_styles():
    """Return available article styles for frontend"""
    return [
        {"id": key, "name": val["name"], "structure": val["structure"], "guidance": val["guidance"]}
        for key, val in ARTICLE_STYLES.items()
    ]

# ==================== TWEET FETCH ROUTE ====================

def extract_tweet_id(url_or_id: str) -> Optional[str]:
    """Extract tweet ID from URL or return as-is if it's an ID"""
    # Direct ID
    if url_or_id.isdigit():
        return url_or_id
    # URL patterns
    match = re.search(r'/status/(\d+)', url_or_id)
    if match:
        return match.group(1)
    return None

@api_router.get("/tweet/fetch")
async def fetch_tweet(url: str):
    """Fetch tweet content from Twitter syndication API"""
    tweet_id = extract_tweet_id(url)
    if not tweet_id:
        raise HTTPException(status_code=400, detail="Geçersiz tweet URL'si veya ID'si")
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # Use FxTwitter API (open source Twitter proxy, no auth needed)
            resp = await client.get(
                f"https://api.fxtwitter.com/status/{tweet_id}",
                headers={"User-Agent": "ContentFactory/1.0"}
            )
            
            if resp.status_code == 200:
                data = resp.json()
                tweet = data.get("tweet")
                if tweet:
                    author = tweet.get("author", {})
                    
                    media = []
                    for m in (tweet.get("media", {}).get("all", []) or []):
                        media.append({
                            "type": m.get("type", "photo"),
                            "url": m.get("url", ""),
                            "thumbnail": m.get("thumbnail_url", m.get("url", "")),
                        })
                    
                    return {
                        "success": True,
                        "tweet": {
                            "id": tweet_id,
                            "text": tweet.get("text", ""),
                            "author": {
                                "name": author.get("name", ""),
                                "username": author.get("screen_name", ""),
                                "avatar": author.get("avatar_url", ""),
                            },
                            "created_at": tweet.get("created_at", ""),
                            "metrics": {
                                "likes": tweet.get("likes", 0),
                                "retweets": tweet.get("retweets", 0),
                                "replies": tweet.get("replies", 0),
                            },
                            "media": media,
                        }
                    }
            
            raise HTTPException(status_code=404, detail="Tweet bulunamadı. Silinmiş veya gizli olabilir.")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tweet fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Tweet çekilemedi. Lütfen tekrar deneyin.")

# ==================== CONTENT GENERATION ROUTES ====================

@api_router.post("/generate/tweet", response_model=GenerationResponse)
async def generate_tweet(request: TweetGenerateRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate tweet content"""
    try:
        # Input sanitization
        sanitize_generation_request(request)

        # Fetch style prompt if style_profile_id provided (scoped to current user)
        style_prompt = None
        if request.style_profile_id:
            from services.style_analyzer import analyzer
            result = supabase.table("style_profiles").select("*").eq("id", request.style_profile_id).eq("user_id", user.id).execute()
            if result.data:
                fingerprint = result.data[0].get('style_fingerprint', {})
                style_prompt = analyzer.generate_style_prompt(fingerprint)
        
        # Analyze image if provided
        image_context = None
        if request.image_base64:
            image_description = await analyze_image_with_vision(request.image_base64)
            if image_description:
                image_context = f"Kullanıcı bir görsel ekledi. Görselde: {image_description}. Bu görselle uyumlu, görseli referans alan bir tweet yaz."
        
        # Combine additional context with image context
        combined_context = request.additional_context or ""
        if image_context:
            combined_context = f"{combined_context}\n\n{image_context}" if combined_context else image_context
        
        # Build the complete prompt using modular system
        system_prompt = build_final_prompt(
            content_type="tweet",
            topic=request.topic,
            persona=request.persona,
            tone=request.tone,
            knowledge=request.knowledge,
            length=request.length,
            language=request.language,
            additional_context=combined_context if combined_context else None,
            is_apex=(request.mode == "ultra" or request.mode == "apex"),
            style_prompt=style_prompt
        )

        contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        # Log to database
        supabase.table("generations").insert({
            "type": "tweet",
            "user_id": user.id,
            "topic": request.topic,
            "mode": request.mode,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
            "knowledge": request.knowledge,
            "language": request.language,
            "additional_context": request.additional_context,
            "is_ultra": request.mode in ["ultra", "apex"],
            "variant_count": request.variants,
            "variants": [v.model_dump(mode="json") for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tweet generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/quote", response_model=GenerationResponse)
async def generate_quote(request: QuoteGenerateRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate quote tweet content"""
    try:
        sanitize_generation_request(request)

        if not request.tweet_content:
            return GenerationResponse(
                success=False,
                variants=[],
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )

        system_prompt = build_final_prompt(
            content_type="quote",
            persona=request.persona,
            tone=request.tone,
            knowledge=request.knowledge,
            length=request.length,
            language=request.language,
            original_tweet=request.tweet_content,
            additional_context=request.additional_context
        )

        contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "quote",
            "user_id": user.id,
            "tweet_url": request.tweet_url,
            "tweet_content": request.tweet_content,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
            "knowledge": request.knowledge,
            "language": request.language,
            "additional_context": request.additional_context,
            "variant_count": request.variants,
            "variants": [v.model_dump(mode="json") for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/reply", response_model=GenerationResponse)
async def generate_reply(request: ReplyGenerateRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate reply content"""
    try:
        sanitize_generation_request(request)

        if not request.tweet_content:
            return GenerationResponse(
                success=False,
                variants=[],
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )

        system_prompt = build_final_prompt(
            content_type="reply",
            persona=request.persona,
            tone=request.tone,
            knowledge=request.knowledge,
            length=request.length,
            language=request.language,
            original_tweet=request.tweet_content,
            reply_mode=request.reply_mode,
            additional_context=request.additional_context
        )

        contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "reply",
            "user_id": user.id,
            "tweet_url": request.tweet_url,
            "tweet_content": request.tweet_content,
            "reply_mode": request.reply_mode,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
            "knowledge": request.knowledge,
            "language": request.language,
            "additional_context": request.additional_context,
            "variant_count": request.variants,
            "variants": [v.model_dump(mode="json") for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reply generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/article", response_model=GenerationResponse)
async def generate_article(request: ArticleGenerateRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate X article content"""
    try:
        sanitize_generation_request(request)

        topic = request.topic
        if request.title:
            topic = f"Başlık: {request.title}\n\nKonu: {topic}"

        system_prompt = build_final_prompt(
            content_type="article",
            topic=topic,
            persona="otorite",
            tone="polished",
            length=request.length,
            language=request.language,
            article_style=request.style,
            references=request.reference_links,
            additional_context=request.additional_context
        )

        contents, tokens_used = await generate_with_openai(system_prompt, "Makaleyi yaz.", 1, user_id=user.id)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "article",
            "user_id": user.id,
            "topic": request.topic,
            "title": request.title,
            "length": request.length,
            "style": request.style,
            "language": request.language,
            "reference_links": request.reference_links or [],
            "additional_context": request.additional_context,
            "variant_count": 1,
            "variants": [v.model_dump(mode="json") for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.get("/generations/history")
async def get_generation_history(limit: int = 50, content_type: Optional[str] = None, user=Depends(require_auth)):
    """Get generation history"""
    query = supabase.table("generations").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
    if content_type:
        query = query.eq("type", content_type)
    result = query.execute()
    return result.data

@api_router.get("/user/stats")
async def get_user_stats(user=Depends(require_auth)):
    """Get user statistics"""
    try:
        gen_query = supabase.table("generations").select("id", count="exact").eq("user_id", user.id)
        tweet_query = supabase.table("generations").select("id", count="exact").eq("type", "tweet").eq("user_id", user.id)
        fav_query = supabase.table("favorites").select("id", count="exact").eq("user_id", user.id)

        return {
            "generations": gen_query.execute().count or 0,
            "tweets": tweet_query.execute().count or 0,
            "favorites": fav_query.execute().count or 0
        }
    except Exception:
        return {"generations": 0, "tweets": 0, "favorites": 0}

@api_router.get("/favorites")
async def get_favorites(limit: int = 50, user=Depends(require_auth)):
    """Get user favorites"""
    try:
        query = supabase.table("favorites").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
        result = query.execute()
        return result.data
    except Exception:
        return []

@api_router.post("/favorites")
async def add_favorite(content: dict, user=Depends(require_auth)):
    """Add content to favorites"""
    favorite_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "content": content.get("content", ""),
        "type": content.get("type", "tweet"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("favorites").insert(favorite_doc).execute()
    return {"success": True, "id": favorite_doc["id"]}

@api_router.delete("/favorites/{favorite_id}")
async def remove_favorite(favorite_id: str, user=Depends(require_auth)):
    """Remove content from favorites"""
    supabase.table("favorites").delete().eq("id", favorite_id).eq("user_id", user.id).execute()
    return {"success": True}

# Include sources router
from routes.sources import router as sources_router
api_router.include_router(sources_router)

# Include styles router
from routes.styles import router as styles_router
api_router.include_router(styles_router)

# Include repurpose router
from routes.repurpose import router as repurpose_router
api_router.include_router(repurpose_router)

# Include coach router
from routes.coach import router as coach_router
api_router.include_router(coach_router)

# Include new platform routers
from routes.linkedin import router as linkedin_router
api_router.include_router(linkedin_router)

from routes.instagram import router as instagram_router
api_router.include_router(instagram_router)

from routes.blog import router as blog_router
api_router.include_router(blog_router)

from routes.youtube import router as youtube_router
api_router.include_router(youtube_router)

from routes.tiktok import router as tiktok_router
api_router.include_router(tiktok_router)

from routes.trends import router as trends_router
api_router.include_router(trends_router)

from routes.account_analysis import router as analysis_router
api_router.include_router(analysis_router)

# Include trends router
from routes.trends import router as trends_router
api_router.include_router(trends_router)

# Include account analysis router
from routes.account_analysis import router as account_analysis_router
api_router.include_router(account_analysis_router)

# Include media router
from routes.media import router as media_router
api_router.include_router(media_router)

# Include settings router
from routes.settings import router as settings_router
api_router.include_router(settings_router)

# Include posting times router
from routes.posting_times import router as posting_times_router
api_router.include_router(posting_times_router)

# Include cookie management router
from routes.cookies import router as cookies_router
api_router.include_router(cookies_router)

# Include admin router
from routes.admin import router as admin_router
api_router.include_router(admin_router)

# Include the router in the main app
app.include_router(api_router)

# ==================== MIDDLEWARE (order matters: last added = first executed) ====================
from middleware.security import SecurityMiddleware, ALLOWED_ORIGINS as SEC_ORIGINS
from middleware.request_size import RequestSizeLimitMiddleware
from middleware.replay_protection import ReplayProtectionMiddleware
from middleware.audit_log import AuditLogMiddleware

# CORS - use security middleware's origin list (no wildcard!)
_cors_origins = list(SEC_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://frontend-.*\.vercel\.app",
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-TH-Client", "X-Requested-With", "X-Admin-Key", "X-TH-Timestamp", "X-TH-Nonce"],
)

# Middleware stack (last added = first executed)
# Order: AuditLog -> Security -> ReplayProtection -> RequestSize -> CORS
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(ReplayProtectionMiddleware)
app.add_middleware(SecurityMiddleware)
app.add_middleware(AuditLogMiddleware)

# ==================== STARTUP: DB Cleanup Task ====================
from middleware.db_cleanup import start_cleanup_task

@app.on_event("startup")
async def startup_event():
    start_cleanup_task(supabase)
