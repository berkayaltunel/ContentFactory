from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client
openai_api_key = os.environ.get('OPENAI_API_KEY')
openai_client = None
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    mode: str = "classic"  # classic or apex
    length: str = "short"  # micro, short, medium, rush, thread
    variants: int = 1
    persona: str = "expert"  # expert, leaked, coach, news, meme, against
    tone: str = "casual"  # casual, unfiltered, structured, absurd
    language: str = "auto"  # auto, tr, en
    additional_context: Optional[str] = None

class QuoteGenerateRequest(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    length: str = "short"
    variants: int = 1
    persona: str = "expert"
    tone: str = "casual"
    language: str = "auto"
    additional_context: Optional[str] = None

class ReplyGenerateRequest(BaseModel):
    tweet_url: str
    tweet_content: Optional[str] = None
    length: str = "short"  # micro, short, medium
    reply_mode: str = "support"  # support, challenge, question, expand, joke
    variants: int = 1
    persona: str = "expert"
    tone: str = "casual"
    language: str = "auto"
    additional_context: Optional[str] = None

class ArticleGenerateRequest(BaseModel):
    topic: str
    title: Optional[str] = None
    length: str = "standard"  # brief, standard, deep
    style: str = "authority"  # raw, authority, story, tutorial, opinion
    language: str = "auto"
    reference_links: Optional[List[str]] = None
    additional_context: Optional[str] = None

class GeneratedContent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    variant_index: int = 0
    character_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerationResponse(BaseModel):
    success: bool
    variants: List[GeneratedContent]
    error: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_length_range(length: str, content_type: str = "tweet") -> tuple:
    """Get character range based on length setting"""
    if content_type == "tweet":
        ranges = {
            "micro": (50, 100),
            "short": (140, 280),
            "medium": (400, 600),
            "rush": (700, 1000),
            "thread": (1000, 2000)
        }
    elif content_type == "reply":
        ranges = {
            "micro": (50, 100),
            "short": (140, 280),
            "medium": (400, 600)
        }
    elif content_type == "article":
        ranges = {
            "brief": (1500, 2000),
            "standard": (3000, 3500),
            "deep": (5000, 7000)
        }
    else:
        ranges = {"short": (140, 280)}
    
    return ranges.get(length, (140, 280))

def build_system_prompt(persona: str, tone: str, language: str) -> str:
    """Build system prompt based on persona and tone settings"""
    
    persona_descriptions = {
        "expert": "Sen alanında uzman, otoriter bir perspektife sahip içerik üreticisisin. İçeriden bilgi veren, güvenilir bir ses tonun var.",
        "leaked": "Sen özel ve sızdırılmış bilgi vibe'ı veren bir içerik üreticisisin. Sanki insider bilgiye sahipmiş gibi yazıyorsun.",
        "coach": "Sen hem teknik bilgi hem de motivasyon veren bir koç gibi içerik üretiyorsun. İlham verici ve eğitici bir tarzın var.",
        "news": "Sen haber formatında, objektif ve bilgilendirici içerik üreten bir gazeteci gibi yazıyorsun.",
        "meme": "Sen absürt, viral ve komik içerik üreten bir meme lordusun. Beklenmedik twist'ler ve espri kullanıyorsun.",
        "against": "Sen zıt görüş savunan, contrarian bir bakış açısına sahipsin. Popüler fikirlere meydan okuyorsun."
    }
    
    tone_descriptions = {
        "casual": "Doğal, rahat ve samimi bir dil kullan. Yapay veya kurumsal olma.",
        "unfiltered": "Ham, filtresiz düşüncelerini yaz. Düzenlenmemiş, spontan ol.",
        "structured": "Tez → Kanıt → İçgörü formatını takip et. Mantıklı ve organize ol.",
        "absurd": "Şok → Tırmandır → Twist formatını kullan. Beklenmedik ve absürt ol."
    }
    
    language_instruction = {
        "auto": "Konunun diline göre otomatik olarak Türkçe veya İngilizce yaz.",
        "tr": "Kesinlikle Türkçe yaz.",
        "en": "Write in English only."
    }
    
    return f"""Sen ContentFactory için içerik üreten bir AI asistansın.

KARAKTER:
{persona_descriptions.get(persona, persona_descriptions['expert'])}

TON:
{tone_descriptions.get(tone, tone_descriptions['casual'])}

DİL:
{language_instruction.get(language, language_instruction['auto'])}

ÖNEMLİ KURALLAR:
- Emoji kullanımını minimumda tut
- Hashtag kullanma (kullanıcı kendisi ekleyebilir)
- Doğal ve insan gibi yaz
- Verilen karakter sınırlarına uy
- Her varyant birbirinden farklı ve benzersiz olsun
"""

async def generate_with_openai(system_prompt: str, user_prompt: str, variants: int = 1) -> List[str]:
    """Generate content using OpenAI API"""
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    results = []
    
    for i in range(variants):
        try:
            variant_prompt = user_prompt
            if variants > 1:
                variant_prompt += f"\n\n(Bu {i+1}. varyant. Diğerlerinden farklı bir yaklaşım kullan.)"
            
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": variant_prompt}
                ],
                temperature=0.8 + (i * 0.1),  # Slightly increase temperature for variety
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            results.append(content)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    return results

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "ContentFactory API"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": openai_client is not None
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ==================== CONTENT GENERATION ROUTES ====================

@api_router.post("/generate/tweet", response_model=GenerationResponse)
async def generate_tweet(request: TweetGenerateRequest):
    """Generate tweet content"""
    try:
        min_chars, max_chars = get_length_range(request.length, "tweet")
        
        system_prompt = build_system_prompt(request.persona, request.tone, request.language)
        
        mode_instruction = ""
        if request.mode == "apex":
            mode_instruction = "APEX MODU: Maksimum viral potansiyel için yaz. Hook çok güçlü olmalı, engagement yaratmalı."
        
        user_prompt = f"""Aşağıdaki konu hakkında tweet yaz:

KONU: {request.topic}

{mode_instruction}

UZUNLUK: {min_chars}-{max_chars} karakter arası

{f'EK BAĞLAM: {request.additional_context}' if request.additional_context else ''}

{'THREAD FORMATI: Birden fazla tweet olarak yaz, her birini numarala (1/, 2/, vb.)' if request.length == 'thread' else 'Sadece tweet metnini yaz, başka bir şey ekleme.'}
"""
        
        contents = await generate_with_openai(system_prompt, user_prompt, request.variants)
        
        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))
        
        # Save to database
        await db.generations.insert_one({
            "type": "tweet",
            "request": request.model_dump(),
            "variants": [v.model_dump() for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return GenerationResponse(success=True, variants=variants)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tweet generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/quote", response_model=GenerationResponse)
async def generate_quote(request: QuoteGenerateRequest):
    """Generate quote tweet content"""
    try:
        if not request.tweet_content:
            return GenerationResponse(
                success=False, 
                variants=[], 
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )
        
        min_chars, max_chars = get_length_range(request.length, "tweet")
        
        system_prompt = build_system_prompt(request.persona, request.tone, request.language)
        
        user_prompt = f"""Aşağıdaki tweet için quote tweet yaz:

ORİJİNAL TWEET:
"{request.tweet_content}"

UZUNLUK: {min_chars}-{max_chars} karakter arası

{f'EK BAĞLAM: {request.additional_context}' if request.additional_context else ''}

Quote tweet metnini yaz. Orijinal tweet'e değer katan, tartışma başlatan veya farklı bir perspektif sunan bir yorum yap.
"""
        
        contents = await generate_with_openai(system_prompt, user_prompt, request.variants)
        
        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))
        
        await db.generations.insert_one({
            "type": "quote",
            "request": request.model_dump(),
            "variants": [v.model_dump() for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return GenerationResponse(success=True, variants=variants)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/reply", response_model=GenerationResponse)
async def generate_reply(request: ReplyGenerateRequest):
    """Generate reply content"""
    try:
        if not request.tweet_content:
            return GenerationResponse(
                success=False, 
                variants=[], 
                error="Tweet içeriği gerekli. Lütfen tweet'i çekin."
            )
        
        min_chars, max_chars = get_length_range(request.length, "reply")
        
        system_prompt = build_system_prompt(request.persona, request.tone, request.language)
        
        reply_mode_instructions = {
            "support": "Destekleyici bir yanıt yaz. Tweet'e katıl ve genişlet.",
            "challenge": "Sorgulayıcı bir yanıt yaz. Nazikçe karşı argüman sun.",
            "question": "Merak uyandıran bir soru sor. Tartışmayı derinleştir.",
            "expand": "Tweet'teki fikri genişlet. Ek bilgi veya perspektif ekle.",
            "joke": "Espri yap. Hafif ve eğlenceli bir yanıt ver."
        }
        
        user_prompt = f"""Aşağıdaki tweet'e yanıt yaz:

ORİJİNAL TWEET:
"{request.tweet_content}"

YANIT MODU: {reply_mode_instructions.get(request.reply_mode, reply_mode_instructions['support'])}

UZUNLUK: {min_chars}-{max_chars} karakter arası

{f'EK BAĞLAM: {request.additional_context}' if request.additional_context else ''}

Sadece yanıt metnini yaz.
"""
        
        contents = await generate_with_openai(system_prompt, user_prompt, request.variants)
        
        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))
        
        await db.generations.insert_one({
            "type": "reply",
            "request": request.model_dump(),
            "variants": [v.model_dump() for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return GenerationResponse(success=True, variants=variants)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reply generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/article", response_model=GenerationResponse)
async def generate_article(request: ArticleGenerateRequest):
    """Generate X article content"""
    try:
        min_chars, max_chars = get_length_range(request.length, "article")
        
        style_instructions = {
            "raw": "Düşünce akışı formatında yaz. Spontan ve kişisel.",
            "authority": "Uzman makalesi formatında yaz. Kapsamlı ve otoriteryan.",
            "story": "Hikaye anlatımı formatında yaz. Narrative ve çekici.",
            "tutorial": "Nasıl yapılır formatında yaz. Adım adım ve pratik.",
            "opinion": "Görüş yazısı formatında yaz. Kişisel bakış açısı ve argümanlar."
        }
        
        system_prompt = f"""Sen ContentFactory için X (Twitter) article yazan bir AI asistansın.

STİL: {style_instructions.get(request.style, style_instructions['authority'])}

DİL: {'Türkçe yaz.' if request.language == 'tr' else 'İngilizce yaz.' if request.language == 'en' else 'Konuya göre otomatik dil seç.'}

FORMAT:
- Güçlü bir başlık oluştur (eğer verilmemişse)
- Alt başlıklar kullan
- Paragrafları kısa tut
- Önemli noktaları vurgula
"""
        
        references_text = ""
        if request.reference_links:
            references_text = f"\nREFERANS LİNKLER: {', '.join(request.reference_links)}"
        
        user_prompt = f"""X Article yaz:

KONU: {request.topic}
{f'BAŞLIK: {request.title}' if request.title else 'BAŞLIK: AI tarafından oluşturulacak'}

UZUNLUK: {min_chars}-{max_chars} karakter arası
{references_text}

{f'EK BAĞLAM: {request.additional_context}' if request.additional_context else ''}

Başlık ve içeriği yaz. Markdown formatı kullanabilirsin.
"""
        
        contents = await generate_with_openai(system_prompt, user_prompt, 1)  # Articles usually single variant
        
        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))
        
        await db.generations.insert_one({
            "type": "article",
            "request": request.model_dump(),
            "variants": [v.model_dump() for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return GenerationResponse(success=True, variants=variants)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.get("/generations/history")
async def get_generation_history(limit: int = 50, content_type: Optional[str] = None):
    """Get generation history"""
    query = {}
    if content_type:
        query["type"] = content_type
    
    generations = await db.generations.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return generations

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
