from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
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
from datetime import datetime, timezone, timedelta
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

# Model config (env'den okunur, kod değiştirmeden swap edilebilir)
MODEL_CONTENT = os.environ.get('MODEL_CONTENT', 'gpt-4o')       # İçerik üretimi (tweet, post, article)
MODEL_VISION = os.environ.get('MODEL_VISION', 'gpt-4o')         # Görsel analiz
MODEL_ANALYSIS = os.environ.get('MODEL_ANALYSIS', 'gpt-4o-mini')  # Trend analizi, skorlama

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

# Log model config at startup
logger.info(f"🤖 Model config: content={MODEL_CONTENT}, vision={MODEL_VISION}, analysis={MODEL_ANALYSIS}")

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
from prompts.builder_v3 import build_final_prompt_v3

def _select_builder(engine: str = "v3"):
    """Return the appropriate prompt builder based on engine param."""
    if engine == "v3":
        return build_final_prompt_v3
    return build_final_prompt

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
class SimilarTweetsRequest(BaseModel):
    query: str
    style_profile_id: Optional[str] = None
    source_ids: Optional[List[str]] = None
    limit: int = 30

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
    direction: Optional[str] = None  # Kullanıcının yönlendirmesi (ör: "buna katılmıyorum")
    style_profile_id: Optional[str] = None

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
    direction: Optional[str] = None  # Kullanıcının yönlendirmesi
    style_profile_id: Optional[str] = None

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
    generation_id: Optional[str] = None
    error: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

async def analyze_image_with_vision(image_base64: str) -> str:
    """Analyze an uploaded image with GPT-4o vision and return a description."""
    if not openai_client or not image_base64:
        return ""
    
    try:
        response = openai_client.chat.completions.create(
            model=MODEL_VISION,
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
                variant_prompt += f"\n\nBu {i+1}. varyant. Aynı konu, aynı ton, aynı karakter ama farklı bir ifade ve hook kullan. Önceki varyantlardan farklı kelimeler ve cümle yapıları seç."

            response = openai_client.chat.completions.create(
                model=MODEL_CONTENT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": variant_prompt}
                ],
                temperature=0.8 + (i * 0.05),
                max_tokens=3000
            )

            raw_content = response.choices[0].message.content
            content = raw_content.strip() if raw_content else ""
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

@api_router.get("/models")
async def get_models():
    """Aktif model konfigürasyonu"""
    return {
        "content": MODEL_CONTENT,
        "vision": MODEL_VISION,
        "analysis": MODEL_ANALYSIS,
    }

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

# ==================== SIMILAR TWEETS (RAG) ====================

@api_router.post("/similar-tweets")
async def find_similar_tweets(request: SimilarTweetsRequest, user=Depends(require_auth)):
    """Find similar tweets using embedding similarity search"""
    from embed_tweets import get_similar_tweets
    
    source_ids = request.source_ids or []
    
    # If style_profile_id provided, get source_ids from profile
    if request.style_profile_id and not source_ids:
        profile = supabase.table("style_profiles").select("source_ids").eq("id", request.style_profile_id).eq("user_id", user.id).execute()
        if profile.data:
            source_ids = profile.data[0].get("source_ids", [])
    
    # If still no source_ids, get all user's sources
    if not source_ids:
        sources = supabase.table("style_sources").select("id").eq("user_id", user.id).execute()
        source_ids = [s["id"] for s in (sources.data or [])]
    
    if not source_ids:
        return {"tweets": [], "count": 0}
    
    tweets = get_similar_tweets(request.query, source_ids, limit=request.limit)
    return {"tweets": tweets, "count": len(tweets)}

# ==================== CONTENT GENERATION ROUTES ====================

@api_router.post("/generate/tweet", response_model=GenerationResponse)
async def generate_tweet(request: TweetGenerateRequest, engine: str = "v3", _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate tweet content"""
    try:
        # Input sanitization
        sanitize_generation_request(request)

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

        # ── Style Lab v2 pipeline ──
        if request.style_profile_id:
            result = supabase.table("style_profiles").select("*").eq("id", request.style_profile_id).eq("user_id", user.id).execute()
            if result.data:
                fingerprint = result.data[0].get('style_fingerprint', {})
                viral_patterns = result.data[0].get('viral_patterns', {})
                source_ids = result.data[0].get('source_ids', [])

                # Constraint engine
                from services.style_constraints import StyleConstraints
                constraints = StyleConstraints(fingerprint, viral_patterns)

                # Smart RAG (async)
                reference_tweets = []
                try:
                    from services.style_rag import get_style_examples
                    import openai as _openai
                    openai_async = _openai.AsyncOpenAI()
                    reference_tweets = await get_style_examples(
                        topic=request.topic,
                        source_id=source_ids[0] if source_ids else None,
                        supabase_client=supabase,
                        openai_client=openai_async,
                        limit=8,
                        strategy="hybrid"
                    )
                    logger.info(f"Style RAG v2: {len(reference_tweets)} referans tweet bulundu")
                except Exception as e:
                    logger.warning(f"Style RAG v2 başarısız (devam ediliyor): {e}")

                # Style-enhanced prompt
                from prompts.style_prompt_v2 import build_style_enhanced_prompt
                system_prompt = build_style_enhanced_prompt(
                    content_type="tweet",
                    topic=request.topic,
                    style_fingerprint=fingerprint,
                    viral_patterns=viral_patterns,
                    constraints=constraints,
                    reference_tweets=reference_tweets,
                    persona=request.persona,
                    tone=request.tone,
                    knowledge=request.knowledge,
                    length=request.length,
                    language=request.language,
                    additional_context=combined_context if combined_context else None,
                    is_apex=(request.mode in ["ultra", "apex"]),
                    image_context=image_context,
                )

                # Multi-shot: min 5 variant üret
                gen_count = max(request.variants, 5)
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", gen_count, user_id=user.id)

                # Ranking
                from services.style_ranker import StyleRanker
                ranker = StyleRanker()
                ranked = ranker.rank(contents, fingerprint, constraints, reference_tweets)
                top = ranker.get_top_variants(ranked, count=max(request.variants, 3))

                variants = []
                for i, (text, score, breakdown) in enumerate(top):
                    variants.append(GeneratedContent(content=text, variant_index=i, character_count=len(text)))
                logger.info(f"Style v2 tweet: {gen_count} üretildi, {len(top)} seçildi (top score: {top[0][1] if top else 0})")
            else:
                # Profile bulunamadı, v1'e fallback
                logger.warning(f"Style profile {request.style_profile_id} bulunamadı, v1 pipeline kullanılıyor")
                system_prompt = _select_builder(engine)(
                    content_type="tweet", topic=request.topic, persona=request.persona,
                    tone=request.tone, knowledge=request.knowledge, length=request.length,
                    language=request.language, additional_context=combined_context if combined_context else None,
                    is_apex=(request.mode in ["ultra", "apex"]), platform="twitter"
                )
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
                variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]
        else:
            # ── v1 pipeline (style profile yok) ──
            system_prompt = _select_builder(engine)(
                content_type="tweet",
                topic=request.topic,
                persona=request.persona,
                tone=request.tone,
                knowledge=request.knowledge,
                length=request.length,
                language=request.language,
                additional_context=combined_context if combined_context else None,
                is_apex=(request.mode == "ultra" or request.mode == "apex"),
                platform="twitter"
            )
            contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
            variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]

        # Log to database
        gen_result = supabase.table("generations").insert({
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
        gen_id = gen_result.data[0]["id"] if gen_result.data else None

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tweet generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/quote", response_model=GenerationResponse)
async def generate_quote(request: QuoteGenerateRequest, engine: str = "v3", _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate quote tweet content"""
    try:
        sanitize_generation_request(request)

        if not request.tweet_content:
            return GenerationResponse(
                success=False,
                variants=[],
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )

        # Direction varsa additional_context'e ekle
        quote_context = request.additional_context or ""
        if request.direction:
            direction_text = f"\n\nKullanıcının yönlendirmesi: {request.direction}"
            quote_context = f"{quote_context}{direction_text}" if quote_context else request.direction

        # ── Style Lab v2 pipeline (quote) ──
        if request.style_profile_id:
            result = supabase.table("style_profiles").select("*").eq("id", request.style_profile_id).eq("user_id", user.id).execute()
            if result.data:
                fingerprint = result.data[0].get('style_fingerprint', {})
                viral_patterns = result.data[0].get('viral_patterns', {})
                source_ids = result.data[0].get('source_ids', [])

                from services.style_constraints import StyleConstraints
                constraints = StyleConstraints(fingerprint, viral_patterns)

                reference_tweets = []
                try:
                    from services.style_rag import get_style_examples
                    import openai as _openai
                    openai_async = _openai.AsyncOpenAI()
                    reference_tweets = await get_style_examples(
                        topic=request.tweet_content or "",
                        source_id=source_ids[0] if source_ids else None,
                        supabase_client=supabase, openai_client=openai_async,
                        limit=8, strategy="hybrid"
                    )
                except Exception as e:
                    logger.warning(f"Style RAG v2 (quote) başarısız: {e}")

                from prompts.style_prompt_v2 import build_style_enhanced_prompt
                system_prompt = build_style_enhanced_prompt(
                    content_type="quote",
                    topic=request.tweet_content or "",
                    style_fingerprint=fingerprint,
                    viral_patterns=viral_patterns,
                    constraints=constraints,
                    reference_tweets=reference_tweets,
                    persona=request.persona, tone=request.tone,
                    knowledge=request.knowledge, length=request.length,
                    language=request.language,
                    original_tweet=request.tweet_content,
                    additional_context=quote_context if quote_context else None,
                    is_apex=False,
                )

                gen_count = max(request.variants, 5)
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", gen_count, user_id=user.id)

                from services.style_ranker import StyleRanker
                ranker = StyleRanker()
                ranked = ranker.rank(contents, fingerprint, constraints, reference_tweets)
                top = ranker.get_top_variants(ranked, count=max(request.variants, 3))
                variants = [GeneratedContent(content=text, variant_index=i, character_count=len(text)) for i, (text, score, breakdown) in enumerate(top)]
                logger.info(f"Style v2 quote: {gen_count} üretildi, {len(top)} seçildi")
            else:
                system_prompt = _select_builder(engine)(
                    content_type="quote", persona=request.persona, tone=request.tone,
                    knowledge=request.knowledge, length=request.length, language=request.language,
                    original_tweet=request.tweet_content, additional_context=quote_context if quote_context else None, platform="twitter"
                )
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
                variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]
        else:
            # ── v1 pipeline ──
            system_prompt = _select_builder(engine)(
                content_type="quote",
                persona=request.persona, tone=request.tone,
                knowledge=request.knowledge, length=request.length,
                language=request.language, original_tweet=request.tweet_content,
                additional_context=quote_context if quote_context else None,
                platform="twitter"
            )
            contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
            variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]

        gen_result = supabase.table("generations").insert({
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
        gen_id = gen_result.data[0]["id"] if gen_result.data else None

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/reply", response_model=GenerationResponse)
async def generate_reply(request: ReplyGenerateRequest, engine: str = "v3", _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate reply content"""
    try:
        sanitize_generation_request(request)

        if not request.tweet_content:
            return GenerationResponse(
                success=False,
                variants=[],
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )

        # Direction varsa additional_context'e ekle
        reply_context = request.additional_context or ""
        if request.direction:
            direction_text = f"\n\nKullanıcının yönlendirmesi: {request.direction}"
            reply_context = f"{reply_context}{direction_text}" if reply_context else request.direction

        # ── Style Lab v2 pipeline (reply) ──
        if request.style_profile_id:
            result = supabase.table("style_profiles").select("*").eq("id", request.style_profile_id).eq("user_id", user.id).execute()
            if result.data:
                fingerprint = result.data[0].get('style_fingerprint', {})
                viral_patterns = result.data[0].get('viral_patterns', {})
                source_ids = result.data[0].get('source_ids', [])

                from services.style_constraints import StyleConstraints
                constraints = StyleConstraints(fingerprint, viral_patterns)

                reference_tweets = []
                try:
                    from services.style_rag import get_style_examples
                    import openai as _openai
                    openai_async = _openai.AsyncOpenAI()
                    reference_tweets = await get_style_examples(
                        topic=request.tweet_content or "",
                        source_id=source_ids[0] if source_ids else None,
                        supabase_client=supabase, openai_client=openai_async,
                        limit=8, strategy="hybrid"
                    )
                except Exception as e:
                    logger.warning(f"Style RAG v2 (reply) başarısız: {e}")

                from prompts.style_prompt_v2 import build_style_enhanced_prompt
                system_prompt = build_style_enhanced_prompt(
                    content_type="reply",
                    topic=request.tweet_content or "",
                    style_fingerprint=fingerprint,
                    viral_patterns=viral_patterns,
                    constraints=constraints,
                    reference_tweets=reference_tweets,
                    persona=request.persona, tone=request.tone,
                    knowledge=request.knowledge, length=request.length,
                    language=request.language,
                    original_tweet=request.tweet_content,
                    reply_mode=request.reply_mode,
                    additional_context=reply_context if reply_context else None,
                    is_apex=False,
                )

                gen_count = max(request.variants, 5)
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", gen_count, user_id=user.id)

                from services.style_ranker import StyleRanker
                ranker = StyleRanker()
                ranked = ranker.rank(contents, fingerprint, constraints, reference_tweets)
                top = ranker.get_top_variants(ranked, count=max(request.variants, 3))
                variants = [GeneratedContent(content=text, variant_index=i, character_count=len(text)) for i, (text, score, breakdown) in enumerate(top)]
                logger.info(f"Style v2 reply: {gen_count} üretildi, {len(top)} seçildi")
            else:
                system_prompt = _select_builder(engine)(
                    content_type="reply", persona=request.persona, tone=request.tone,
                    knowledge=request.knowledge, length=request.length, language=request.language,
                    original_tweet=request.tweet_content, reply_mode=request.reply_mode,
                    additional_context=reply_context if reply_context else None, platform="twitter"
                )
                contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
                variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]
        else:
            # ── v1 pipeline ──
            system_prompt = _select_builder(engine)(
                content_type="reply",
                persona=request.persona, tone=request.tone,
                knowledge=request.knowledge, length=request.length,
                language=request.language, original_tweet=request.tweet_content,
                reply_mode=request.reply_mode,
                additional_context=reply_context if reply_context else None,
                platform="twitter"
            )
            contents, tokens_used = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants, user_id=user.id)
            variants = [GeneratedContent(content=c, variant_index=i, character_count=len(c)) for i, c in enumerate(contents)]

        gen_result = supabase.table("generations").insert({
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
        gen_id = gen_result.data[0]["id"] if gen_result.data else None

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reply generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.post("/generate/article", response_model=GenerationResponse)
async def generate_article(request: ArticleGenerateRequest, engine: str = "v3", _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate X article content"""
    try:
        sanitize_generation_request(request)

        topic = request.topic
        if request.title:
            topic = f"Başlık: {request.title}\n\nKonu: {topic}"

        system_prompt = _select_builder(engine)(
            content_type="article",
            topic=topic,
            persona="otorite",
            tone="polished",
            length=request.length,
            language=request.language,
            article_style=request.style,
            references=request.reference_links,
            additional_context=request.additional_context,
            platform="twitter"
        )

        contents, tokens_used = await generate_with_openai(system_prompt, "Makaleyi yaz.", 1, user_id=user.id)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        gen_result = supabase.table("generations").insert({
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
        gen_id = gen_result.data[0]["id"] if gen_result.data else None

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error="Bir hata oluştu. Lütfen tekrar deneyin.")

@api_router.get("/generations/calendar")
async def get_generation_calendar(year: int = None, month: int = None, user=Depends(require_auth)):
    """Get generation counts grouped by day for calendar view"""
    from datetime import date
    today = date.today()
    y = year or today.year
    m = month or today.month

    # Build date range for the month
    start = f"{y:04d}-{m:02d}-01T00:00:00+00:00"
    if m == 12:
        end = f"{y + 1:04d}-01-01T00:00:00+00:00"
    else:
        end = f"{y:04d}-{m + 1:02d}-01T00:00:00+00:00"

    result = supabase.table("generations") \
        .select("id, type, topic, created_at, variants") \
        .eq("user_id", user.id) \
        .gte("created_at", start) \
        .lt("created_at", end) \
        .order("created_at", desc=True) \
        .execute()

    # Group by day
    days = {}
    for gen in (result.data or []):
        day = gen["created_at"][:10]  # "2026-02-08"
        if day not in days:
            days[day] = {"count": 0, "types": {}, "generations": []}
        days[day]["count"] += 1
        t = gen.get("type", "tweet")
        days[day]["types"][t] = days[day]["types"].get(t, 0) + 1
        # Include minimal generation data for preview
        preview = {
            "id": gen["id"],
            "type": t,
            "topic": gen.get("topic", ""),
            "created_at": gen["created_at"],
        }
        # Get first variant content for preview
        variants = gen.get("variants")
        if variants and isinstance(variants, list) and len(variants) > 0:
            first = variants[0]
            if isinstance(first, dict):
                preview["content"] = first.get("content", "")[:150]
            elif isinstance(first, str):
                preview["content"] = first[:150]
        days[day]["generations"].append(preview)

    # Calculate streak
    streak = 0
    check_date = today
    while True:
        ds = check_date.isoformat()
        if ds in days and days[ds]["count"] > 0:
            streak += 1
            check_date = check_date - __import__('datetime').timedelta(days=1)
        else:
            # If today has no generations, check if yesterday started a streak
            if check_date == today and streak == 0:
                check_date = check_date - __import__('datetime').timedelta(days=1)
                continue
            break

    return {
        "year": y,
        "month": m,
        "days": days,
        "streak": streak,
        "total_this_month": sum(d["count"] for d in days.values())
    }

@api_router.get("/generations/history")
async def get_generation_history(limit: int = 50, content_type: Optional[str] = None, user=Depends(require_auth)):
    """Get generation history with favorite status"""
    query = supabase.table("generations").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
    if content_type:
        query = query.eq("type", content_type)
    result = query.execute()
    generations = result.data or []

    if not generations:
        return []

    # Fetch all active favorites for this user that have a generation_id (exclude soft-deleted)
    fav_result = supabase.table("favorites").select("id, generation_id, variant_index").eq("user_id", user.id).not_.is_("generation_id", "null").is_("deleted_at", "null").execute()
    
    # Build lookup: generation_id -> {variant_index: favorite_id}
    fav_map = {}
    for fav in (fav_result.data or []):
        gid = fav["generation_id"]
        if gid not in fav_map:
            fav_map[gid] = {}
        fav_map[gid][fav["variant_index"]] = fav["id"]

    # Attach favorite info to each generation
    for gen in generations:
        gen["favorited_variants"] = fav_map.get(gen["id"], {})

    return generations

@api_router.get("/user/stats")
async def get_user_stats(user=Depends(require_auth)):
    """Get user statistics"""
    try:
        gen_query = supabase.table("generations").select("id", count="exact").eq("user_id", user.id)
        tweet_query = supabase.table("generations").select("id", count="exact").eq("type", "tweet").eq("user_id", user.id)
        fav_query = supabase.table("favorites").select("id", count="exact").eq("user_id", user.id).is_("deleted_at", "null")

        return {
            "generations": gen_query.execute().count or 0,
            "tweets": tweet_query.execute().count or 0,
            "favorites": fav_query.execute().count or 0
        }
    except Exception:
        return {"generations": 0, "tweets": 0, "favorites": 0}

@api_router.get("/favorites")
async def get_favorites(limit: int = 50, user=Depends(require_auth)):
    """Get user favorites (only active, not soft-deleted)"""
    try:
        query = supabase.table("favorites").select("*").eq("user_id", user.id).is_("deleted_at", "null").order("created_at", desc=True).limit(limit)
        result = query.execute()
        return result.data
    except Exception:
        return []

@api_router.get("/favorites/trash")
async def get_favorites_trash(limit: int = 50, user=Depends(require_auth)):
    """Get soft-deleted favorites (Recently Deleted, 30 gün içinde geri alınabilir)"""
    try:
        query = supabase.table("favorites").select("*").eq("user_id", user.id).not_.is_("deleted_at", "null").order("deleted_at", desc=True).limit(limit)
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
        "generation_id": content.get("generation_id"),
        "variant_index": content.get("variant_index", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("favorites").insert(favorite_doc).execute()
    return {"success": True, "id": favorite_doc["id"]}

@api_router.post("/favorites/toggle")
async def toggle_favorite(content: dict, user=Depends(require_auth)):
    """Toggle favorite on a generation variant"""
    generation_id = content.get("generation_id")
    variant_index = content.get("variant_index", 0)

    if not generation_id:
        raise HTTPException(status_code=400, detail="generation_id gerekli")

    # Check if already favorited (only active ones, not soft-deleted)
    existing = supabase.table("favorites").select("id").eq("user_id", user.id).eq("generation_id", generation_id).eq("variant_index", variant_index).is_("deleted_at", "null").execute()

    if existing.data:
        # Remove
        supabase.table("favorites").delete().eq("id", existing.data[0]["id"]).eq("user_id", user.id).execute()
        return {"success": True, "action": "removed", "favorite_id": None}
    else:
        # Add
        fav_id = str(uuid.uuid4())
        supabase.table("favorites").insert({
            "id": fav_id,
            "user_id": user.id,
            "content": content.get("content", ""),
            "type": content.get("type", "tweet"),
            "generation_id": generation_id,
            "variant_index": variant_index,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return {"success": True, "action": "added", "favorite_id": fav_id}

@api_router.delete("/generations/all")
async def delete_all_generations(user=Depends(require_auth)):
    """Delete ALL generations and their favorites for the user"""
    # Delete all favorites for this user's generations
    supabase.table("favorites").delete().eq("user_id", user.id).not_.is_("generation_id", "null").execute()
    # Delete all generations
    result = supabase.table("generations").select("id", count="exact").eq("user_id", user.id).execute()
    count = result.count or 0
    if count > 0:
        supabase.table("generations").delete().eq("user_id", user.id).execute()
    return {"deleted": count}

@api_router.delete("/generations/bulk")
async def bulk_delete_generations(body: dict, user=Depends(require_auth)):
    """Bulk delete generations by IDs + their favorites"""
    ids = body.get("ids", [])
    if not ids:
        return {"deleted": 0}
    # Delete related favorites
    for gid in ids:
        supabase.table("favorites").delete().eq("user_id", user.id).eq("generation_id", gid).execute()
    # Delete generations
    deleted = 0
    for gid in ids:
        result = supabase.table("generations").delete().eq("id", gid).eq("user_id", user.id).execute()
        if result.data:
            deleted += len(result.data)
    return {"deleted": deleted}

@api_router.delete("/generations/{generation_id}")
async def delete_generation(generation_id: str, user=Depends(require_auth)):
    """Delete a single generation + its favorites"""
    # Delete related favorites
    supabase.table("favorites").delete().eq("user_id", user.id).eq("generation_id", generation_id).execute()
    # Delete the generation
    result = supabase.table("generations").delete().eq("id", generation_id).eq("user_id", user.id).execute()
    count = len(result.data) if result.data else 0
    return {"deleted": count}

@api_router.post("/favorites/{favorite_id}/soft-delete")
async def soft_delete_favorite(favorite_id: str, user=Depends(require_auth)):
    """Soft delete: Çöp kutusuna taşı (30 gün sonra kalıcı silinir)"""
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("favorites").update({"deleted_at": now}).eq("id", favorite_id).eq("user_id", user.id).execute()
    return {"success": True, "action": "soft_deleted"}

@api_router.post("/favorites/{favorite_id}/restore")
async def restore_favorite(favorite_id: str, user=Depends(require_auth)):
    """Geri al: Çöp kutusundan geri getir"""
    supabase.table("favorites").update({"deleted_at": None}).eq("id", favorite_id).eq("user_id", user.id).execute()
    return {"success": True, "action": "restored"}

@api_router.delete("/favorites/all")
async def delete_all_favorites(user=Depends(require_auth)):
    """Soft delete ALL active favorites for the user (çöp kutusuna taşı)"""
    now = datetime.now(timezone.utc).isoformat()
    result = supabase.table("favorites").select("id", count="exact").eq("user_id", user.id).is_("deleted_at", "null").execute()
    count = result.count or (len(result.data) if result.data else 0)
    if count > 0:
        supabase.table("favorites").update({"deleted_at": now}).eq("user_id", user.id).is_("deleted_at", "null").execute()
    return {"deleted": count}

@api_router.delete("/favorites/bulk")
async def bulk_delete_favorites(body: dict, user=Depends(require_auth)):
    """Soft delete favorites by IDs (çöp kutusuna taşı)"""
    ids = body.get("ids", [])
    if not ids:
        return {"deleted": 0}
    now = datetime.now(timezone.utc).isoformat()
    deleted = 0
    for fid in ids:
        result = supabase.table("favorites").update({"deleted_at": now}).eq("id", fid).eq("user_id", user.id).is_("deleted_at", "null").execute()
        if result.data:
            deleted += len(result.data)
    return {"deleted": deleted}

@api_router.delete("/favorites/trash/purge")
async def purge_trash(user=Depends(require_auth)):
    """Çöp kutusundaki tüm favorileri kalıcı sil"""
    result = supabase.table("favorites").select("id", count="exact").eq("user_id", user.id).not_.is_("deleted_at", "null").execute()
    count = result.count or (len(result.data) if result.data else 0)
    if count > 0:
        supabase.table("favorites").delete().eq("user_id", user.id).not_.is_("deleted_at", "null").execute()
    return {"purged": count}

@api_router.post("/favorites/auto-purge")
async def auto_purge_expired_favorites(request: Request):
    """Cron job: 30 günü geçen soft-deleted favorileri kalıcı sil (tüm kullanıcılar)"""
    import os
    secret = request.headers.get("X-Cron-Secret", "")
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    # 30 günden eski silinmişleri bul ve sil
    expired = supabase.table("favorites").select("id", count="exact").not_.is_("deleted_at", "null").lt("deleted_at", cutoff).execute()
    count = expired.count or (len(expired.data) if expired.data else 0)
    if count > 0:
        supabase.table("favorites").delete().not_.is_("deleted_at", "null").lt("deleted_at", cutoff).execute()
    return {"purged": count, "cutoff": cutoff}

@api_router.delete("/favorites/{favorite_id}")
async def remove_favorite(favorite_id: str, user=Depends(require_auth)):
    """Favoriden çıkar (toggle off, hard delete from favorites table)"""
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

# Include accounts router
from routes.accounts import router as accounts_router
api_router.include_router(accounts_router)

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

# Include YouTube Studio router
from routes.youtube_studio import router as youtube_studio_router
api_router.include_router(youtube_studio_router)

# Include the router in the main app
# app.include_router(api_router)  # Moved to end for v2 routes

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


# ==================== V2 MODELS ====================

# ==================== V2 IMPORTS ====================
from prompts.builder_v2 import build_final_prompt_v2, validate_settings
from prompts.etki import ETKILER
from prompts.karakter_v2 import KARAKTERLER, KARAKTER_YAPI_UYUM
from prompts.yapi import YAPILAR
from prompts.acilis import ACILISLAR
from prompts.bitis import BITISLER
from prompts.derinlik import DERINLIKLER
from prompts.smart_defaults import SMART_DEFAULTS, get_smart_defaults

# Model routing config
V2_MODEL_CONFIG = {
    "normal": {
        "model": "google/gemini-3-flash-preview",
        "provider": "openrouter",
        "max_tokens": 2048,
        "temperature_base": 0.8,
    },
    "ultra": {
        "model": "anthropic/claude-sonnet-4.5",
        "provider": "openrouter",
        "max_tokens": 2048,
        "temperature_base": 0.8,
    },
    "shitpost": {
        "model": "mistralai/mistral-large-2512",
        "provider": "openrouter",
        "max_tokens": 1024,
        "temperature_base": 0.85,
    },
}

# Max tokens cap per uzunluk — prevents models from over-generating
UZUNLUK_MAX_TOKENS = {
    "micro": 55,      # 50-100 chars ≈ 25-50 tokens
    "punch": 160,     # 140-280 chars ≈ 70-140 tokens
    "spark": 350,     # 400-600 chars ≈ 200-300 tokens
    "storm": 450,     # 700-1000 chars ≈ 350-500 tokens
    "thread": 2048,   # 1000-2500 chars ≈ 500-1200 tokens
}

# Hard char limits for post-generation check
UZUNLUK_CHAR_LIMITS = {
    "micro": (50, 180),     # 20% tolerance
    "punch": (100, 400),    # 20% tolerance
    "spark": (240, 820),    # 20% tolerance
    "storm": (500, 1300),   # 20% tolerance
    "thread": (800, 3000),  # generous
}
# BeatstoBytes style profile for shitpost mode (auto-injected, hidden from users)
SHITPOST_STYLE_PROFILE_ID = "dd1a9608-1441-4b72-bf28-83e11d4c5a60"
_shitpost_style_cache = {"prompt": None, "examples": None}

def _get_shitpost_style():
    """Get BeatstoBytes style prompt + examples (cached)."""
    if _shitpost_style_cache["prompt"] is None:
        try:
            from services.style_analyzer import analyzer
            result = supabase.table("style_profiles").select("style_fingerprint,example_tweets").eq("id", SHITPOST_STYLE_PROFILE_ID).execute()
            if result.data:
                fp = result.data[0].get("style_fingerprint", {})
                _shitpost_style_cache["prompt"] = analyzer.generate_style_prompt(fp)
                _shitpost_style_cache["examples"] = result.data[0].get("example_tweets", [])
                logger.info(f"Shitpost style loaded: {len(_shitpost_style_cache['prompt'])} chars, {len(_shitpost_style_cache['examples'])} examples")
            else:
                logger.warning("BeatstoBytes profile not found, shitpost style disabled")
                _shitpost_style_cache["prompt"] = ""
                _shitpost_style_cache["examples"] = []
        except Exception as e:
            logger.error(f"Failed to load shitpost style: {e}")
            _shitpost_style_cache["prompt"] = ""
            _shitpost_style_cache["examples"] = []
    return _shitpost_style_cache["prompt"], _shitpost_style_cache["examples"]



# ==================== OPENROUTER CLIENT ====================

_openrouter_client = None

def _get_openrouter_client():
    """Lazy init OpenRouter client (OpenAI-compatible SDK)."""
    global _openrouter_client
    if _openrouter_client is None:
        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_key:
            raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
        _openrouter_client = OpenAI(
            api_key=openrouter_key,
            base_url="https://openrouter.ai/api/v1",
        )
    return _openrouter_client


# ==================== MODEL ROUTING ====================

def get_model_config(etki: str, is_ultra: bool) -> dict:
    """Determine which model to use based on settings."""
    if etki == "shitpost":
        return V2_MODEL_CONFIG["shitpost"]
    elif is_ultra:
        return V2_MODEL_CONFIG["ultra"]
    else:
        return V2_MODEL_CONFIG["normal"]


# ==================== V2 GENERATION ====================

async def generate_with_openrouter(
    system_prompt: str,
    user_prompt: str,
    model_config: dict,
    variants: int = 1,
    user_id: str = None,
    uzunluk: str = "punch",
) -> tuple:
    """Generate content via OpenRouter (OpenAI-compatible API).
    Returns (results, total_tokens_used)."""

    if user_id:
        check_token_budget(user_id)

    client = _get_openrouter_client()
    model = model_config["model"]
    # Cap max_tokens by uzunluk to prevent over-generation
    uzunluk_cap = UZUNLUK_MAX_TOKENS.get(uzunluk, 2048)
    max_tokens = min(model_config["max_tokens"], uzunluk_cap)
    temp_base = model_config.get("temperature_base", 0.8)
    
    # Get char limits for post-generation check
    char_min, char_max = UZUNLUK_CHAR_LIMITS.get(uzunluk, (0, 99999))

    results = []
    total_tokens = 0

    for i in range(variants):
        try:
            variant_prompt = user_prompt
            if variants > 1:
                variant_prompt += f"\n\nBu {i+1}. varyant. Aynı konu, aynı ayarlar ama farklı bir ifade ve hook kullan. Önceki varyantlardan farklı kelimeler ve cümle yapıları seç."

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": variant_prompt}
                ],
                temperature=temp_base + (i * 0.05),
                max_tokens=max_tokens,
            )

            raw_content = response.choices[0].message.content
            content = raw_content.strip() if raw_content else ""

            # Clean up common issues
            content = content.strip('"').strip("'")
            for prefix in ["Tweet:", "tweet:", "Tweet metni:", "Çıktı:", "Output:", "İşte tweet:"]:
                if content.lower().startswith(prefix.lower()):
                    content = content[len(prefix):].strip()

            # Mistral "veya" fix: take only first part if model gave alternatives
            if model_config == V2_MODEL_CONFIG["shitpost"]:
                for splitter in ["\n\nYa da ", "\n\nVeya:", "\n\nVeya\n", "\n\nAlternatif:"]:
                    if splitter in content:
                        content = content.split(splitter)[0].strip()

            # Retry if empty
            if not content or len(content) < 5:
                logger.warning(f"V2 empty output from {model}, retrying...")
                response2 = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": variant_prompt}
                    ],
                    temperature=temp_base + 0.1,
                    max_tokens=max_tokens,
                )
                raw2 = response2.choices[0].message.content
                content = raw2.strip() if raw2 else ""
                if response2.usage:
                    total_tokens += response2.usage.total_tokens

            # Post-generation length enforcement
            if len(content) > char_max and uzunluk in ("micro", "punch", "spark", "storm"):
                logger.warning(f"V2 output too long ({len(content)} chars, max {char_max}) for {uzunluk}. Retrying with stricter prompt...")
                strict_prompt = f"KURAL: Maximum {char_max} karakter. ASLA bu limiti aşma. Kısa ve öz yaz.\n\n" + variant_prompt
                try:
                    response3 = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": strict_prompt}
                        ],
                        temperature=max(temp_base - 0.2, 0.3),
                        max_tokens=max_tokens,
                    )
                    retry_content = response3.choices[0].message.content.strip().strip('"').strip("'")
                    for pfx in ["Tweet:", "tweet:", "Tweet metni:", "Çıktı:", "Output:", "İşte tweet:"]:
                        if retry_content.lower().startswith(pfx.lower()):
                            retry_content = retry_content[len(pfx):].strip()
                    if model_config.get("model", "").startswith("mistral"):
                        for s in ["\n\nYa da ", "\n\nVeya:", "\n\nVeya\n", "\n\nAlternatif:"]:
                            if s in retry_content:
                                retry_content = retry_content.split(s)[0].strip()
                    if retry_content and len(retry_content) <= char_max:
                        logger.info(f"V2 retry succeeded: {len(retry_content)} chars (was {len(content)})")
                        content = retry_content
                    else:
                        # Hard truncate at sentence boundary
                        logger.warning(f"V2 retry still too long ({len(retry_content) if retry_content else 0}), truncating...")
                        sentences = content.replace('\n', '. ').split('. ')
                        truncated = ""
                        for s in sentences:
                            if len(truncated) + len(s) + 2 <= char_max:
                                truncated = (truncated + ". " + s).strip(". ") if truncated else s
                            else:
                                break
                        if truncated and len(truncated) >= char_min:
                            content = truncated + "."
                    if response3.usage:
                        total_tokens += response3.usage.total_tokens
                except Exception as e:
                    logger.warning(f"V2 length retry failed: {e}")

            results.append(content)

            if response.usage:
                total_tokens += response.usage.total_tokens

        except Exception as e:
            logger.error(f"OpenRouter API error ({model}): {e}")
            raise HTTPException(status_code=500, detail="AI üretimi başarısız oldu")

    if user_id and total_tokens > 0:
        record_token_usage(user_id, total_tokens)

    return results, total_tokens


# ==================== V2 REQUEST MODELS ====================

class TweetGenerateRequestV2(BaseModel):
    topic: str
    etki: str = "patlassin"
    karakter: str = "uzman"
    yapi: str = "dogal"
    uzunluk: str = "punch"
    acilis: str = "otomatik"
    bitis: str = "otomatik"
    derinlik: str = "standart"
    language: str = "auto"
    is_ultra: bool = False
    variants: int = 3
    additional_context: Optional[str] = None
    trend_context: Optional[str] = None
    style_profile_id: Optional[str] = None
    image_base64: Optional[str] = None

class QuoteGenerateRequestV2(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    etki: str = "konustursun"
    karakter: str = "uzman"
    yapi: str = "dogal"
    uzunluk: str = "punch"
    acilis: str = "otomatik"
    bitis: str = "otomatik"
    derinlik: str = "standart"
    language: str = "auto"
    is_ultra: bool = False
    variants: int = 3
    additional_context: Optional[str] = None
    direction: Optional[str] = None
    style_profile_id: Optional[str] = None

class ReplyGenerateRequestV2(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    reply_mode: str = "support"
    etki: str = "konustursun"
    karakter: str = "uzman"
    yapi: str = "dogal"
    uzunluk: str = "punch"
    acilis: str = "otomatik"
    bitis: str = "soru"
    derinlik: str = "standart"
    language: str = "auto"
    is_ultra: bool = False
    variants: int = 3
    additional_context: Optional[str] = None
    direction: Optional[str] = None
    style_profile_id: Optional[str] = None


# ==================== V2 ENDPOINTS ====================

@api_router.post("/v2/generate/tweet", response_model=GenerationResponse)
async def generate_tweet_v2(request: TweetGenerateRequestV2, engine: str = "v3", force_model: str = None, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate tweet with v2 settings system (Etki, Karakter, Yapı etc.)"""
    try:
        sanitize_generation_request(request)

        # Validate settings combination
        validation = validate_settings(request.etki, request.karakter, request.yapi)
        if not validation["valid"]:
            logger.warning(f"V2 incompatible settings: {validation['warnings']}")
            # Don't block, just warn in logs

        # Image analysis
        image_context = None
        if request.image_base64:
            image_description = await analyze_image_with_vision(request.image_base64)
            if image_description:
                image_context = f"Kullanıcı bir görsel ekledi. Görselde: {image_description}. Bu görselle uyumlu tweet yaz."

        combined_context = request.additional_context or ""
        if image_context:
            combined_context = f"{combined_context}\n\n{image_context}" if combined_context else image_context

        # Determine model
        if force_model and force_model in V2_MODEL_CONFIG:
            model_config = V2_MODEL_CONFIG[force_model]
            logger.info(f"V2 tweet: force_model={force_model}, model={model_config['model']}")
        else:
            model_config = get_model_config(request.etki, request.is_ultra)
        logger.info(f"V2 tweet: etki={request.etki}, karakter={request.karakter}, yapi={request.yapi}, model={model_config['model']}, ultra={request.is_ultra}")

        # Auto-inject BeatstoBytes style for shitpost
        shitpost_style_prompt = None
        shitpost_examples = None
        if request.etki == "shitpost":
            shitpost_style_prompt, shitpost_examples = _get_shitpost_style()
            logger.info(f"V2 shitpost: injecting BeatstoBytes style ({len(shitpost_style_prompt)} chars, {len(shitpost_examples)} examples)")

        # Build prompt (v2 or v3 engine)
        if engine == "v3":
            system_prompt = build_final_prompt_v3(
                content_type="tweet",
                topic=request.topic,
                persona=request.karakter,
                tone=request.yapi,
                length=request.uzunluk,
                language=request.language,
                is_apex=request.is_ultra,
                additional_context=combined_context if combined_context else None,
                style_prompt=shitpost_style_prompt if shitpost_style_prompt else None,
                example_tweets=shitpost_examples if shitpost_examples else None,
            )
        else:
            system_prompt = build_final_prompt_v2(
                content_type="tweet",
                topic=request.topic,
                etki=request.etki,
                karakter=request.karakter,
                yapi=request.yapi,
                uzunluk=request.uzunluk,
                acilis=request.acilis,
                bitis=request.bitis,
                derinlik=request.derinlik,
                language=request.language,
                is_ultra=request.is_ultra,
                additional_context=combined_context if combined_context else None,
                trend_context=request.trend_context,
                style_prompt=shitpost_style_prompt if shitpost_style_prompt else None,
                example_tweets=shitpost_examples if shitpost_examples else None,
            )

        # Generate via OpenRouter
        contents, tokens_used = await generate_with_openrouter(
            system_prompt, "İçeriği üret.", model_config, request.variants, user_id=user.id,
            uzunluk=request.uzunluk,
        )

        variants = [
            GeneratedContent(content=c, variant_index=i, character_count=len(c))
            for i, c in enumerate(contents)
        ]

        # Log to database
        gen_id = str(uuid.uuid4())
        try:
            supabase.table("generations").insert({
                "id": gen_id,
                "type": "tweet",
                "user_id": user.id,
                "topic": request.topic,
                "mode": "ultra" if request.is_ultra else ("shitpost" if request.etki == "shitpost" else "v2"),
                "length": request.uzunluk,
                "persona": request.karakter,
                "tone": request.yapi,
                "knowledge": request.derinlik if request.derinlik != "standart" else None,
                "language": request.language,
                "additional_context": request.additional_context,
                "is_ultra": request.is_ultra,
                "variants": [v.model_dump(mode="json") for v in variants],
                "tokens_used": tokens_used,
                "model_used": model_config["model"],
            }).execute()
        except Exception as e:
            logger.warning(f"DB log failed: {e}")

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"V2 tweet generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/v2/generate/quote", response_model=GenerationResponse)
async def generate_quote_v2(request: QuoteGenerateRequestV2, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate quote tweet with v2 settings."""
    try:
        sanitize_generation_request(request)

        # Fetch original tweet if needed
        original_content = request.tweet_content or ""
        if not original_content and request.tweet_url:
            original_content = f"[Tweet URL: {request.tweet_url}]"

        model_config = get_model_config(request.etki, request.is_ultra)

        system_prompt = build_final_prompt_v2(
            content_type="quote",
            topic=None,
            etki=request.etki,
            karakter=request.karakter,
            yapi=request.yapi,
            uzunluk=request.uzunluk,
            acilis=request.acilis,
            bitis=request.bitis,
            derinlik=request.derinlik,
            language=request.language,
            is_ultra=request.is_ultra,
            original_tweet=original_content,
            additional_context=request.additional_context or None,
        )

        # Direction'ı user message olarak gönder (daha etkili)
        user_msg = f"Bu tweet'e quote yaz.\n\nKullanıcı talimatı: {request.direction}" if request.direction else "Bu tweet'e quote yaz."

        contents, tokens_used = await generate_with_openrouter(
            system_prompt, user_msg, model_config, request.variants, user_id=user.id, uzunluk=request.uzunluk,
        )

        variants = [
            GeneratedContent(content=c, variant_index=i, character_count=len(c))
            for i, c in enumerate(contents)
        ]

        gen_id = str(uuid.uuid4())
        try:
            supabase.table("generations").insert({
                "id": gen_id, "type": "quote", "user_id": user.id,
                "topic": f"Quote: {request.tweet_url}", "mode": "v2",
                "length": request.uzunluk, "persona": request.karakter,
                "tone": request.yapi, "language": request.language,
                "is_ultra": request.is_ultra,
                "variants": [v.model_dump(mode="json") for v in variants],
                "tokens_used": tokens_used, "model_used": model_config["model"],
            }).execute()
        except Exception as e:
            logger.warning(f"DB log failed: {e}")

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"V2 quote generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/v2/generate/reply", response_model=GenerationResponse)
async def generate_reply_v2(request: ReplyGenerateRequestV2, _=Depends(rate_limit), user=Depends(require_auth)):
    """Generate reply with v2 settings."""
    try:
        sanitize_generation_request(request)

        original_content = request.tweet_content or ""
        if not original_content and request.tweet_url:
            original_content = f"[Tweet URL: {request.tweet_url}]"

        model_config = get_model_config(request.etki, request.is_ultra)

        system_prompt = build_final_prompt_v2(
            content_type="reply",
            topic=None,
            etki=request.etki,
            karakter=request.karakter,
            yapi=request.yapi,
            uzunluk=request.uzunluk,
            acilis=request.acilis,
            bitis=request.bitis,
            derinlik=request.derinlik,
            language=request.language,
            is_ultra=request.is_ultra,
            original_tweet=original_content,
            reply_mode=request.reply_mode,
            additional_context=request.additional_context or None,
        )

        # Direction'ı user message olarak gönder (daha etkili)
        user_msg = f"Bu tweet'e reply yaz.\n\nKullanıcı talimatı: {request.direction}" if request.direction else "Bu tweet'e reply yaz."

        contents, tokens_used = await generate_with_openrouter(
            system_prompt, user_msg, model_config, request.variants, user_id=user.id, uzunluk=request.uzunluk,
        )

        variants = [
            GeneratedContent(content=c, variant_index=i, character_count=len(c))
            for i, c in enumerate(contents)
        ]

        gen_id = str(uuid.uuid4())
        try:
            supabase.table("generations").insert({
                "id": gen_id, "type": "reply", "user_id": user.id,
                "topic": f"Reply: {request.tweet_url}", "mode": "v2",
                "length": request.uzunluk, "persona": request.karakter,
                "tone": request.yapi, "language": request.language,
                "is_ultra": request.is_ultra,
                "variants": [v.model_dump(mode="json") for v in variants],
                "tokens_used": tokens_used, "model_used": model_config["model"],
            }).execute()
        except Exception as e:
            logger.warning(f"DB log failed: {e}")

        return GenerationResponse(success=True, variants=variants, generation_id=gen_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"V2 reply generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== V2 SETTINGS ENDPOINTS ====================

@api_router.get("/v2/settings/defaults")
async def get_settings_defaults(etki: str = "patlassin"):
    """Get smart defaults for a given Etki selection."""
    defaults = get_smart_defaults(etki)
    return {
        "etki": etki,
        "defaults": defaults,
    }


@api_router.get("/v2/settings/options")
async def get_settings_options():
    """Get all available settings options for the UI."""
    return {
        "etki": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in ETKILER.items()],
        "karakter": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in KARAKTERLER.items()],
        "yapi": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in YAPILAR.items()],
        "acilis": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in ACILISLAR.items()],
        "bitis": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in BITISLER.items()],
        "derinlik": [{"id": k, "name": v["name"], "label": v["label"], "emoji": v["emoji"]} for k, v in DERINLIKLER.items()],
        "uzunluk": ["micro", "punch", "spark", "storm", "thread"],
        "karakter_yapi_uyum": KARAKTER_YAPI_UYUM,
        "smart_defaults": SMART_DEFAULTS,
    }


@api_router.post("/v2/settings/validate")
async def validate_settings_endpoint(etki: str = "patlassin", karakter: str = "uzman", yapi: str = "dogal"):
    """Validate a settings combination."""
    return validate_settings(etki, karakter, yapi)
app.include_router(api_router)
