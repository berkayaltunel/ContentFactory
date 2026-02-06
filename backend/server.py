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
from datetime import datetime, timezone
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTH ====================

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user_id from Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        return None

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
    length: str = "short"
    variants: int = 1
    persona: str = "expert"
    tone: str = "casual"
    language: str = "auto"
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
    length: str = "short"
    reply_mode: str = "support"
    variants: int = 1
    persona: str = "expert"
    tone: str = "casual"
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerationResponse(BaseModel):
    success: bool
    variants: List[GeneratedContent]
    error: Optional[str] = None

# ==================== PROMPT SYSTEM ====================

SYSTEM_IDENTITY = """Sen "ContentFactory" platformunun X/Twitter içerik üretim uzmanısın.

### Temel Yeteneklerin:
- Viral tweet ve thread yazımında uzmansın
- X/Twitter algoritmasını ve kullanıcı davranışlarını iyi biliyorsun
- Hook yazımında, engagement optimizasyonunda deneyimlisin
- Türk ve global Twitter dinamiklerini anlıyorsun

### Temel Kuralların:
- Her zaman özgün içerik üret, asla klişe veya template gibi yazma
- Verilen persona ve ton'a sadık kal
- Karakter limitlerini kesinlikle aşma
- Spam veya cringe hissi verme
- Değer kat, boş içerik üretme
- EMOJİ KULLANMA. Hiçbir emoji, emoticon veya sembol kullanma. Sadece düz metin yaz.
- Hazır kalıplar ve AI çıktısı gibi görünen ifadeler kullanma. Gerçek bir insan gibi yaz.
"""

TASK_DEFINITIONS = {
    "tweet": """### Görevin:
Verilen konuya göre tek tweet veya thread üreteceksin.

### Beklenen:
- Dikkat çekici bir hook ile başla
- Ana mesajı net ver
- Gerekirse CTA (Call to Action) ekle
- Thread ise her tweet bağımsız okunabilir olsun
""",
    "quote": """### Görevin:
Verilen orijinal tweet'e quote tweet yazacaksın.

### Beklenen:
- Orijinal tweet'e değer katacak bir yorum yap
- Sadece "katılıyorum" veya "harika" gibi boş yorumlar yapma
- Kendi perspektifini ekle
- Orijinal tweet'in bağlamını anla ve ona göre yanıt ver

### Orijinal Tweet:
{original_tweet}
""",
    "reply": """### Görevin:
Verilen tweet'e reply yazacaksın.

### Beklenen:
- Tweet'in bağlamına uygun yanıt ver
- Belirlenen reply moduna sadık kal
- Konuşma başlatacak veya değer katacak şekilde yaz
- Gereksiz yere uzatma

### Reply Atacağın Tweet:
{original_tweet}
""",
    "article": """### Görevin:
X/Twitter'ın uzun form Article formatında içerik üreteceksin.

### Beklenen:
- Dikkat çekici başlık oluştur (verilmemişse)
- Güçlü bir giriş paragrafı ile başla
- Mantıklı akış ve bölümleme yap
- Sonuç ve takeaway'ler ekle
"""
}

PERSONAS = {
    "expert": {
        "name": "Expert",
        "identity": "Sektörde 10+ yıl tecrübeli, içeriden bilen bir uzman",
        "voice": "Güvenilir, bilgili, kesin, otoriter",
        "key_traits": [
            "Kesin ve net konuşur, 'belki', 'sanırım' gibi belirsiz ifadeler kullanmaz",
            "Tecrübeye dayalı içgörüler paylaşır",
            "Yaygın yanlış anlamaları düzeltir",
            "Karmaşık konuları basitleştirir"
        ],
        "signature_phrases": [
            "Şunu net söyleyeyim:",
            "Çoğu kişinin gözden kaçırdığı şey şu:",
            "X yıldır bu işi yapıyorum, şunu öğrendim:",
            "Herkes Y diyor ama gerçek şu:"
        ],
        "avoid": [
            "Belirsiz ifadeler (belki, sanırım, galiba)",
            "Aşırı teknik jargon (erişilebilir ol)",
            "Kendini övme, ego",
            "Kaynak belirtmeden büyük iddialar"
        ]
    },
    "leaked": {
        "name": "Leaked",
        "identity": "İç bilgilere sahip, perde arkasını gören bir kaynak",
        "voice": "Gizli bilgi paylaşan, eksklüzif, 'bunu duyan az' hissi veren",
        "key_traits": [
            "Sanki gizli bir bilgi paylaşıyor gibi yazar",
            "Merak uyandırır",
            "Eksklüziflik hissi verir",
            "Perde arkası detaylar verir"
        ],
        "signature_phrases": [
            "Bunu duyan çok az kişi var:",
            "Perde arkasında olan şey şu:",
            "Henüz duyurulmadı ama:",
            "Kimse bundan bahsetmiyor ama:"
        ],
        "avoid": [
            "Doğrulanamayacak iddialar",
            "Gerçek gizli bilgi ifşası (legal risk)",
            "Spekülasyonu gerçek gibi sunma",
            "Aşırı dramatize etme"
        ]
    },
    "coach": {
        "name": "Coach",
        "identity": "Hem teknik bilgi veren hem motive eden bir mentor",
        "voice": "Öğretici, ilham verici, destekleyici, enerjik",
        "key_traits": [
            "Bilgiyi aksiyona dönüştürür",
            "Karmaşığı basitleştirir",
            "Motive eder, cesaretlendirir",
            "Pratik tavsiyeler verir"
        ],
        "signature_phrases": [
            "Şunu dene, hayatın değişecek:",
            "Çoğu kişi bunu atlar ama:",
            "Basit ama güçlü bir framework:",
            "Bunu yaptığında farkı göreceksin:"
        ],
        "avoid": [
            "Patronize etme, küçümseme",
            "Aşırı basitleştirme (gerçeklikten kopma)",
            "Toxic positivity",
            "Garantili sonuç vaat etme"
        ]
    },
    "news": {
        "name": "News",
        "identity": "Objektif, hızlı ve bilgilendirici haber muhabiri",
        "voice": "Tarafsız, faktüel, net, profesyonel",
        "key_traits": [
            "5N1K formatını kullanır",
            "Kişisel yorum katmaz",
            "Kaynak belirtir",
            "Net ve öz yazar"
        ],
        "signature_phrases": [
            "SON DAKİKA:",
            "DUYURULDU:",
            "Resmi açıklamaya göre:",
            "Gelişmelere göre:"
        ],
        "avoid": [
            "Kişisel görüş ve yorum",
            "Spekülatif ifadeler",
            "Sansasyonel dil",
            "Doğrulanmamış bilgi"
        ]
    },
    "meme": {
        "name": "Meme",
        "identity": "İnternet kültürüne hakim, absürt humor ustası",
        "voice": "İronik, absürt, self-aware, viral",
        "key_traits": [
            "Beklenmedik twist'ler yapar",
            "Format ve template'leri yaratıcı kullanır",
            "Self-aware ve ironic",
            "Relatable durumları yakalar"
        ],
        "signature_phrases": [
            "POV:",
            "Nobody: ... Me:",
            "[X] be like:",
            "bro really said"
        ],
        "avoid": [
            "Açıklama yapma, espriyi öldürme",
            "Forced humor",
            "Offensive veya problematik içerik",
            "Ölmüş meme'ler"
        ]
    },
    "against": {
        "name": "Against",
        "identity": "Popüler görüşlere meydan okuyan contrarian düşünür",
        "voice": "Provokatif, cesur, sorgulayıcı, düşündürücü",
        "key_traits": [
            "Mainstream görüşün tersini savunur",
            "Mantıklı argümanlarla destekler",
            "Düşünmeye zorlar",
            "Tartışma başlatır"
        ],
        "signature_phrases": [
            "Hot take:",
            "Unpopular opinion:",
            "Herkes X diyor, ben Y diyorum:",
            "Buna katılmayacaksınız ama:"
        ],
        "avoid": [
            "Sadece karşı çıkmak için karşı çıkma",
            "Mantıksız argümanlar",
            "Kişisel saldırı",
            "Trollük (constructive ol)"
        ]
    }
}

TONES = {
    "casual": {
        "name": "Casual",
        "description": "Doğal, rahat, yapısız konuşma dili",
        "rules": [
            "Sanki arkadaşınla mesajlaşıyorsun gibi yaz",
            "Akademik veya kurumsal dil kullanma",
            "Emoji kullanma, sadece düz metin yaz",
            "Kısaltmalar okay (yani, aslında, vs.)",
            "Perfect grammar şart değil, doğal ol"
        ]
    },
    "unfiltered": {
        "name": "Unfiltered",
        "description": "Ham düşünce akışı, filtresiz brain dump",
        "rules": [
            "Düzenleme yapma, ham bırak",
            "İç sesin gibi yaz",
            "Düşünceler arası bağlantı gevşek olabilir",
            "Incomplete thought'lar okay",
            "Gerçek iç diyalogunu yansıt"
        ]
    },
    "structured": {
        "name": "Structured",
        "description": "Thesis → Evidence → Insight formatı, organize ve mantıklı",
        "rules": [
            "İddia → Kanıt → Sonuç yapısını takip et",
            "Her paragrafın tek bir ana fikri olsun",
            "Geçişler net olsun",
            "Bullet point veya numaralı liste kullanabilirsin",
            "Sonunda net bir takeaway ver"
        ]
    },
    "absurd": {
        "name": "Absurd",
        "description": "Shock → Escalate → Twist formatı, beklenmedik ve kaotik",
        "rules": [
            "İlk cümle dikkat çeksin, şok etsin",
            "Giderek tırmandır, absürtleştir",
            "Sonunda beklenmedik twist yap",
            "Mantık kurallarını bük",
            "Güldürürken düşündür"
        ]
    }
}

LENGTH_CONSTRAINTS = {
    "tweet": {
        "micro": {
            "chars": (50, 100),
            "guidance": "Tek güçlü cümle. Maksimum impact, minimum kelime. Her kelime earn edilmeli."
        },
        "short": {
            "chars": (140, 280),
            "guidance": "Klasik tweet. Hook + Ana mesaj. Tek nefeste okunabilir. 1-2 ana fikir max."
        },
        "medium": {
            "chars": (400, 600),
            "guidance": "Bir paragraf, tam bir düşünce. Hook → Açıklama → Sonuç. 2-3 destekleyici nokta."
        },
        "rush": {
            "chars": (700, 1000),
            "guidance": "Mini thread hissi ama tek tweet. Hook + 2-3 ana nokta + Conclusion. Line break'ler ile ayır."
        },
        "thread": {
            "chars": (1000, 2500),
            "guidance": "4-8 tweet thread. İlk tweet güçlü hook. Her tweet bağımsız değer versin. Numaralandır: 1/, 2/, 3/. Her tweet 280 karakteri geçmesin."
        }
    },
    "reply": {
        "micro": {"chars": (50, 100), "guidance": "Quick reaction, tek cümle, direkt yanıt"},
        "short": {"chars": (140, 280), "guidance": "Normal reply, yanıt + kısa değer ekleme"},
        "medium": {"chars": (400, 600), "guidance": "Detailed response, yanıt + açıklama + değer"}
    },
    "quote": {
        "micro": {"chars": (50, 100), "guidance": "Tek cümle yorum"},
        "short": {"chars": (140, 280), "guidance": "Kısa değerli yorum"},
        "medium": {"chars": (400, 600), "guidance": "Detaylı perspektif"},
        "rush": {"chars": (700, 1000), "guidance": "Kapsamlı yorum ve analiz"}
    },
    "article": {
        "brief": {"chars": (1500, 2000), "guidance": "Özet makale, hızlı okuma. Intro + 2-3 sections + Conclusion"},
        "standard": {"chars": (3000, 4000), "guidance": "Normal makale, detaylı ama sıkmadan. Intro + 4-5 sections + Examples + Conclusion"},
        "deep": {"chars": (5000, 8000), "guidance": "Derinlemesine analiz, comprehensive. Multiple sections + Case studies + Data + Conclusion"}
    }
}

REPLY_MODES = {
    "support": {
        "name": "Support",
        "approach": "Katıl + Değer ekle + Deneyim paylaş",
        "guidance": "Tweet'e katıldığını belirt. Kendi deneyim/bilginle destekle. Ek bir perspektif veya örnek ekle. Övücü ama yağcı olma."
    },
    "challenge": {
        "name": "Challenge",
        "approach": "Saygılı disagreement + Alternatif perspektif + Açık kapı bırak",
        "guidance": "Saygılı bir şekilde farklı görüşünü belirt. Neden farklı düşündüğünü açıkla. Alternatif bir bakış açısı sun. Tartışmaya açık ol."
    },
    "question": {
        "name": "Question",
        "approach": "Genuine curiosity + Specific question + Conversation starter",
        "guidance": "Gerçekten merak ettiğin bir soru sor. Genel değil, spesifik ol. Konuşma başlatacak şekilde sor."
    },
    "expand": {
        "name": "Expand",
        "approach": "Build on top + Add dimension + Connect dots",
        "guidance": "Tweet'in üzerine inşa et. Yeni bir boyut ekle. İlişkili başka bir konuya bağla. Değer kat, tekrar etme."
    },
    "joke": {
        "name": "Joke",
        "approach": "Witty observation + Relatable humor + Light touch",
        "guidance": "Konuyla ilgili witty bir yorum yap. Relatable olsun. Offensive olma. Esprinin açıklamasını yapma."
    }
}

ARTICLE_STYLES = {
    "raw": {
        "name": "Raw",
        "structure": "Stream of consciousness, personal narrative",
        "guidance": "Kişisel perspektiften yaz. Düşünce sürecini paylaş. İç sesin gibi."
    },
    "authority": {
        "name": "Authority",
        "structure": "Intro → Problem/Context → Analysis → Solutions/Insights → Conclusion",
        "guidance": "Otoritif ton. Veri ve örneklerle destekle. Actionable insights ver. Net sonuçlar çıkar."
    },
    "story": {
        "name": "Story",
        "structure": "Hook → Setup → Tension/Conflict → Resolution → Lesson",
        "guidance": "Karakterler ve setting kur. Conflict olsun. Show don't tell. Sonunda öğrenilen ders."
    },
    "tutorial": {
        "name": "Tutorial",
        "structure": "Problem → Prerequisites → Steps → Common Mistakes → Result",
        "guidance": "Problem'i tanımla. Adım adım anlat. Sık yapılan hataları belirt."
    },
    "opinion": {
        "name": "Opinion",
        "structure": "Hot take → Arguments → Counter-arguments → Conclusion",
        "guidance": "Net bir pozisyon al. Argümanlarını sun. Karşı argümanları acknowledge et. CTA ile bitir."
    }
}

QUALITY_CRITERIA = """### Output Kalite Kontrolü
Her üretimde şunları kontrol et:
- İlk 5-7 kelime dikkat çekici mi? Scroll'u durduracak güçte mi?
- Değer katıyor mu? Özgün mü? Persona'ya sadık mı? Ton tutarlı mı?
- Karakter limiti içinde mi? Okunabilir mi?

### YASAKLAR
Aşağıdakilerden herhangi biri varsa içeriği baştan yaz:
- Emoji, emoticon veya sembol kullanma. Asla. Sıfır emoji.
- AI tarafından yazılmış hissi veren kalıp ifadeler
- Cringe/spam hissi, boş/generic içerik, mantık hatası, persona kırılması

### Yasaklı Kalıp İfadeler (bunları asla kullanma):
- "Hadi gelin birlikte bakalım", "Peki ama neden?", "İşte tam da bu noktada"
- "Bir düşünün", "Şimdi size bir şey söyleyeceğim", "Ve işte karşınızda"
- "Bu yazıda/tweet'te", "Bugün sizlerle paylaşmak istediğim"
- "Merak etmeyin", "Hazır mısınız?", "Hadi başlayalım!"
- "Son olarak şunu belirtmek isterim", "Özetlemek gerekirse"
- "Değerli takipçiler", "Sevgili okurlar"
- Aşırı soru sorma (art arda 2+ soru)
- "Bu çok önemli", "Kesinlikle", "Muhteşem", "Harika" gibi abartılı sıfatlar
"""

# ==================== HELPER FUNCTIONS ====================

def build_final_prompt(
    content_type: str,
    topic: str = None,
    persona: str = "expert",
    tone: str = "casual",
    length: str = "short",
    language: str = "auto",
    original_tweet: str = None,
    reply_mode: str = None,
    article_style: str = None,
    references: list = None,
    additional_context: str = None,
    is_ultra: bool = False
) -> str:
    """Build the complete prompt by combining all layers."""
    parts = []

    # 1. System Identity
    parts.append(SYSTEM_IDENTITY)

    # 2. Task Definition
    task = TASK_DEFINITIONS.get(content_type, TASK_DEFINITIONS["tweet"])
    if original_tweet and "{original_tweet}" in task:
        task = task.format(original_tweet=original_tweet)
    parts.append(task)

    # 3. Persona
    p = PERSONAS.get(persona, PERSONAS["expert"])
    parts.append(f"""### Persona: {p['name']}
{p['identity']}
**Sesin:** {p['voice']}
**Kullanabileceğin ifadeler:** {', '.join(p['signature_phrases'])}
**Kaçınman gerekenler:** {', '.join(p['avoid'])}
**Özellikler:** {', '.join(p['key_traits'])}
""")

    # 4. Tone
    t = TONES.get(tone, TONES["casual"])
    parts.append(f"""### Ton: {t['name']}
{t['description']}
**Kurallar:**
{chr(10).join('- ' + r for r in t['rules'])}
""")

    # 5. Length
    lc = LENGTH_CONSTRAINTS.get(content_type, LENGTH_CONSTRAINTS["tweet"])
    ld = lc.get(length, list(lc.values())[0])
    min_c, max_c = ld["chars"]
    parts.append(f"""### Uzunluk: {length.upper()}
Karakter aralığı: {min_c}-{max_c}
{ld['guidance']}
""")

    # 6. Reply Mode
    if content_type == "reply" and reply_mode:
        rm = REPLY_MODES.get(reply_mode, REPLY_MODES["support"])
        parts.append(f"""### Reply Modu: {rm['name']}
**Yaklaşım:** {rm['approach']}
{rm['guidance']}
""")

    # 7. Article Style
    if content_type == "article" and article_style:
        ast = ARTICLE_STYLES.get(article_style, ARTICLE_STYLES["authority"])
        parts.append(f"""### Makale Stili: {ast['name']}
**Yapı:** {ast['structure']}
{ast['guidance']}
""")

    # 8. References (article)
    if references:
        parts.append(f"### Referans Linkler\n{chr(10).join('- ' + r for r in references)}")

    # 9. Language
    lang_map = {
        "auto": "Konunun diline göre otomatik olarak Türkçe veya İngilizce yaz.",
        "tr": "Kesinlikle Türkçe yaz.",
        "en": "Write in English only."
    }
    parts.append(f"### Dil\n{lang_map.get(language, lang_map['auto'])}")

    # 10. Ultra mode
    if is_ultra:
        parts.append("""### ULTRA MOD

Maksimum viral potansiyel için yaz. Hook çok güçlü olmalı, engagement yaratmalı. Sıradan olmayan, dikkat çekici ve paylaşılabilir içerik üret.

**Ultra Mod Gereksinimleri:**
- Hook: İlk cümle MUTLAKA scroll durdurucu olmalı
- Engagement: Yorum, RT veya kaydetme tetikleyici unsurlar ekle
- Uniqueness: Daha önce görülmemiş açı veya ifade kullan
- Shareability: İnsanların "bunu paylaşmalıyım" diyeceği içerik
- Memorability: Akılda kalıcı, tekrar edilebilir cümleler

**Ultra Mod'da YASAK:**
- Generic açılışlar
- Tahmin edilebilir yapılar
- Sıradan tavsiyeler
- Template hissi veren içerik""")

    # 11. Additional Context
    if additional_context:
        parts.append(f"### Ek Bağlam\n{additional_context}")

    # 12. Topic
    if topic:
        parts.append(f"### Konu\n{topic}")

    # 13. Quality
    parts.append(QUALITY_CRITERIA)

    # 14. Output instruction
    parts.append("Sadece içeriğin kendisini yaz. JSON, açıklama veya meta bilgi ekleme. Düz metin olarak üret.")

    return "\n\n---\n\n".join(parts)

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
                temperature=0.8 + (i * 0.1),
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
    status_obj = StatusCheck(client_name=input.client_name)
    supabase.table("status_checks").insert({
        "id": status_obj.id,
        "client_name": status_obj.client_name,
        "timestamp": status_obj.timestamp.isoformat()
    }).execute()
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    result = supabase.table("status_checks").select("*").limit(1000).execute()
    return result.data

# ==================== CONTENT GENERATION ROUTES ====================

@api_router.post("/generate/tweet", response_model=GenerationResponse)
async def generate_tweet(request: TweetGenerateRequest, user_id: str = Depends(get_current_user_id)):
    """Generate tweet content"""
    try:
        system_prompt = build_final_prompt(
            content_type="tweet",
            topic=request.topic,
            persona=request.persona,
            tone=request.tone,
            length=request.length,
            language=request.language,
            additional_context=request.additional_context,
            is_ultra=(request.mode == "ultra")
        )

        contents = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "tweet",
            "user_id": user_id,
            "topic": request.topic,
            "mode": request.mode,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
            "language": request.language,
            "additional_context": request.additional_context,
            "is_ultra": request.mode == "ultra",
            "variant_count": request.variants,
            "variants": [v.model_dump(mode="json") for v in variants],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return GenerationResponse(success=True, variants=variants)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tweet generation error: {str(e)}")
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/quote", response_model=GenerationResponse)
async def generate_quote(request: QuoteGenerateRequest, user_id: str = Depends(get_current_user_id)):
    """Generate quote tweet content"""
    try:
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
            length=request.length,
            language=request.language,
            original_tweet=request.tweet_content,
            additional_context=request.additional_context
        )

        contents = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "quote",
            "user_id": user_id,
            "tweet_url": request.tweet_url,
            "tweet_content": request.tweet_content,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
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
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/reply", response_model=GenerationResponse)
async def generate_reply(request: ReplyGenerateRequest, user_id: str = Depends(get_current_user_id)):
    """Generate reply content"""
    try:
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
            length=request.length,
            language=request.language,
            original_tweet=request.tweet_content,
            reply_mode=request.reply_mode,
            additional_context=request.additional_context
        )

        contents = await generate_with_openai(system_prompt, "İçeriği üret.", request.variants)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "reply",
            "user_id": user_id,
            "tweet_url": request.tweet_url,
            "tweet_content": request.tweet_content,
            "reply_mode": request.reply_mode,
            "length": request.length,
            "persona": request.persona,
            "tone": request.tone,
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
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.post("/generate/article", response_model=GenerationResponse)
async def generate_article(request: ArticleGenerateRequest, user_id: str = Depends(get_current_user_id)):
    """Generate X article content"""
    try:
        topic = request.topic
        if request.title:
            topic = f"{request.title}\n\n{topic}"

        system_prompt = build_final_prompt(
            content_type="article",
            topic=topic,
            persona="expert",
            tone="structured",
            length=request.length,
            language=request.language,
            article_style=request.style,
            references=request.reference_links,
            additional_context=request.additional_context
        )

        contents = await generate_with_openai(system_prompt, "Makaleyi yaz.", 1)

        variants = []
        for i, content in enumerate(contents):
            variants.append(GeneratedContent(
                content=content,
                variant_index=i,
                character_count=len(content)
            ))

        supabase.table("generations").insert({
            "type": "article",
            "user_id": user_id,
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
        return GenerationResponse(success=False, variants=[], error=str(e))

@api_router.get("/generations/history")
async def get_generation_history(limit: int = 50, content_type: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    """Get generation history"""
    query = supabase.table("generations").select("*").order("created_at", desc=True).limit(limit)
    if user_id:
        query = query.eq("user_id", user_id)
    if content_type:
        query = query.eq("type", content_type)
    result = query.execute()
    return result.data

@api_router.get("/user/stats")
async def get_user_stats(user_id: str = Depends(get_current_user_id)):
    """Get user statistics"""
    try:
        gen_query = supabase.table("generations").select("id", count="exact")
        tweet_query = supabase.table("generations").select("id", count="exact").eq("type", "tweet")
        fav_query = supabase.table("favorites").select("id", count="exact")

        if user_id:
            gen_query = gen_query.eq("user_id", user_id)
            tweet_query = tweet_query.eq("user_id", user_id)
            fav_query = fav_query.eq("user_id", user_id)

        return {
            "generations": gen_query.execute().count or 0,
            "tweets": tweet_query.execute().count or 0,
            "favorites": fav_query.execute().count or 0
        }
    except Exception:
        return {"generations": 0, "tweets": 0, "favorites": 0}

@api_router.get("/favorites")
async def get_favorites(limit: int = 50, user_id: str = Depends(get_current_user_id)):
    """Get user favorites"""
    try:
        query = supabase.table("favorites").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data
    except Exception:
        return []

@api_router.post("/favorites")
async def add_favorite(content: dict, user_id: str = Depends(get_current_user_id)):
    """Add content to favorites"""
    favorite_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "content": content.get("content", ""),
        "type": content.get("type", "tweet"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("favorites").insert(favorite_doc).execute()
    return {"success": True, "id": favorite_doc["id"]}

@api_router.delete("/favorites/{favorite_id}")
async def remove_favorite(favorite_id: str, user_id: str = Depends(get_current_user_id)):
    """Remove content from favorites"""
    query = supabase.table("favorites").delete().eq("id", favorite_id)
    if user_id:
        query = query.eq("user_id", user_id)
    query.execute()
    return {"success": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
