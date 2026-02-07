# ContentFactory - Prompt Builder
# Combines all prompt components into final prompt

from .system_identity import SYSTEM_IDENTITY
from .personas import PERSONAS
from .tones import TONES
from .knowledge import KNOWLEDGE_MODES
# Hooks are now integrated into personas, not imported separately
from .quality import (
    QUALITY_CRITERIA,
    BANNED_PATTERNS,
    APEX_MODE,
    STYLE_CLONE_INTEGRATION,
    LENGTH_CONSTRAINTS,
    REPLY_MODES,
    ARTICLE_STYLES
)

from .linkedin import LINKEDIN_PERSONAS, LINKEDIN_FORMATS, LINKEDIN_FORMAT_PROMPTS, LINKEDIN_SYSTEM_PROMPT
from .instagram import INSTAGRAM_FORMATS, INSTAGRAM_FORMAT_PROMPTS, INSTAGRAM_SYSTEM_PROMPT
from .blog import BLOG_STYLES, BLOG_FORMAT_PROMPTS, BLOG_SYSTEM_PROMPT
from .youtube import YOUTUBE_FORMATS, YOUTUBE_FORMAT_PROMPTS, YOUTUBE_SYSTEM_PROMPT
from .tiktok import TIKTOK_FORMATS, TIKTOK_FORMAT_PROMPTS, TIKTOK_SYSTEM_PROMPT

TASK_DEFINITIONS = {
    "tweet": """## 🎯 GÖREV: TWEET ÜRET

Verilen konuya göre tweet (veya thread) üreteceksin.

### Beklentiler:
- Dikkat çekici bir hook ile başla (scroll-stopper)
- Ana mesajı net ve punch'lı ver
- Değer kat - okuyucu bir şey öğrenmeli veya hissetmeli
- Gerekirse CTA (Call to Action) ekle
- Thread ise her tweet bağımsız değer versin
""",
    
    "quote": """## 🎯 GÖREV: QUOTE TWEET YAZ

Verilen orijinal tweet'e quote tweet yazacaksın.

### Beklentiler:
- Orijinal tweet'e değer katacak bir yorum yap
- Sadece "katılıyorum" veya "harika" gibi boş yorumlar YASAK
- Kendi perspektifini ekle
- Orijinal tweet'in bağlamını anla ve ona göre yanıt ver
- Quote'un kendi başına da değerli olması lazım

### Orijinal Tweet:
{original_tweet}
""",
    
    "reply": """## 🎯 GÖREV: REPLY YAZ

Verilen tweet'e reply yazacaksın.

### Beklentiler:
- Tweet'in bağlamına uygun yanıt ver
- Belirlenen reply moduna sadık kal
- Konuşma başlatacak veya değer katacak şekilde yaz
- Gereksiz yere uzatma
- Authentic ol, yapay övgü/eleştiri yapma

### Reply Atacağın Tweet:
{original_tweet}
""",
    
    "article": """## 🎯 GÖREV: X ARTICLE YAZ

X/Twitter'ın uzun form Article formatında içerik üreteceksin.

### Beklentiler:
- Dikkat çekici başlık (verilmemişse sen oluştur)
- Güçlü bir giriş paragrafı ile başla (hook!)
- Mantıklı akış ve bölümleme yap
- Her bölüm değer versin
- Sonuç ve takeaway'ler ekle
- Okunabilir format (headers, paragraphs, spacing)
""",

    "linkedin": """## 🎯 GÖREV: LINKEDIN POST ÜRET

LinkedIn platformu için profesyonel içerik üreteceksin.

### Beklentiler:
- İlk 2-3 satır hook (see more tıklaması için)
- Kısa paragraflar, satır araları
- Profesyonel ama insani ton
- Net insight veya takeaway
- Hashtag en fazla 3, sonunda
""",

    "instagram": """## 🎯 GÖREV: INSTAGRAM İÇERİĞİ ÜRET

Instagram platformu için içerik üreteceksin.

### Beklentiler:
- Hook ile başla (caption kesilir)
- Görsel ile uyumlu metin
- Kısa, okunabilir paragraflar
- Engagement odaklı CTA
""",

    "blog": """## 🎯 GÖREV: BLOG İÇERİĞİ ÜRET

Blog formatında içerik üreteceksin.

### Beklentiler:
- SEO uyumlu başlık ve yapı
- Hook ile başlayan giriş
- H2/H3 ile yapılandırılmış bölümler
- Örnekler ve verilerle desteklenmiş
- Actionable sonuç
""",

    "youtube": """## 🎯 GÖREV: YOUTUBE İÇERİĞİ ÜRET

YouTube platformu için içerik üreteceksin.

### Beklentiler:
- CTR optimize başlık
- İlk 30 saniye hook
- Retention odaklı yapı
- Open loop'lar ve re-engagement hook'lar
""",

    "tiktok": """## 🎯 GÖREV: TIKTOK İÇERİĞİ ÜRET

TikTok platformu için kısa form video içeriği üreteceksin.

### Beklentiler:
- İlk 1-3 saniye scroll durdurucu hook
- Hızlı tempo, dolgu yok
- Loop-friendly yapı
- Text overlay önerileri
"""
}


def build_persona_section(persona_id: str) -> str:
    """Build detailed persona section for prompt."""
    p = PERSONAS.get(persona_id, PERSONAS["otorite"])
    
    section = f"""
## 🎭 PERSONA: {p['name'].upper()}

**Tanım:** {p['description']}

### Kimlik:
{p['identity']}

### Ses Karakteristikleri:
{chr(10).join('• ' + trait for trait in p['voice_characteristics'])}

### Yazım Kuralları:
{p['writing_rules']}

### Örnek Yapılar:
{chr(10).join('• ' + pattern for pattern in p['example_patterns'])}

{p.get('hook_guidance', '')}

### KAÇINILACAKLAR:
{chr(10).join('❌ ' + avoid for avoid in p['avoid'])}
"""
    return section


def build_tone_section(tone_id: str) -> str:
    """Build detailed tone section for prompt."""
    t = TONES.get(tone_id, TONES["natural"])
    
    dos = t.get('dos_and_donts', {}).get('do', [])
    donts = t.get('dos_and_donts', {}).get('dont', [])
    
    section = f"""
## 🎨 TON: {t['name'].upper()}

**Tanım:** {t['description']}

### Temel Prensip:
{t['core_principle']}

### Format Kuralları:
{t['format_rules']}

### Örnek Yapılar:
{t['example_structure']}

### YAP:
{chr(10).join('✅ ' + do for do in dos)}

### YAPMA:
{chr(10).join('❌ ' + dont for dont in donts)}
"""
    return section


def build_knowledge_section(knowledge_id: str) -> str:
    """Build knowledge mode section for prompt."""
    if not knowledge_id or knowledge_id not in KNOWLEDGE_MODES:
        return ""
    
    km = KNOWLEDGE_MODES[knowledge_id]
    return km['prompt_injection']


def build_length_section(content_type: str, length_id: str) -> str:
    """Build length constraint section for prompt."""
    type_constraints = LENGTH_CONSTRAINTS.get(content_type, LENGTH_CONSTRAINTS["tweet"])
    length_data = type_constraints.get(length_id, list(type_constraints.values())[0])
    
    min_chars, max_chars = length_data["chars"]
    
    section = f"""
## 📏 UZUNLUK: {length_id.upper()}

**Karakter Aralığı:** {min_chars} - {max_chars} karakter
**Label:** {length_data['label']}

### Kılavuz:
{length_data['guidance']}

### ÖNEMLİ:
- Minimum {min_chars} karakter
- Maximum {max_chars} karakter
- Bu aralığın DIŞINA ÇIKMA
"""
    return section


def build_reply_mode_section(reply_mode: str) -> str:
    """Build reply mode section for prompt."""
    if not reply_mode or reply_mode not in REPLY_MODES:
        return ""
    
    rm = REPLY_MODES[reply_mode]
    
    section = f"""
## 💬 REPLY MODU: {rm['name'].upper()}

**Yaklaşım:** {rm['approach']}

### Detaylı Kılavuz:
{rm['detailed_guidance']}
"""
    return section


def build_article_style_section(style: str) -> str:
    """Build article style section for prompt."""
    if not style or style not in ARTICLE_STYLES:
        return ""
    
    ast = ARTICLE_STYLES[style]
    
    section = f"""
## 📝 MAKALE STİLİ: {ast['name'].upper()}

**Yapı:** {ast['structure']}

### Kılavuz:
{ast['guidance']}
"""
    return section


def build_style_clone_section(style_prompt: str) -> str:
    """Build style cloning section for prompt."""
    if not style_prompt:
        return ""
    
    section = f"""
## 🎯 STİL KLONLAMA AKTİF

{STYLE_CLONE_INTEGRATION}

### KLONLANACAK STİL PROFİLİ:
{style_prompt}

### ÖNEMLİ:
Bu stil profili, tüm diğer ayarların (persona, ton) ÜSTÜNDEDİR.
Persona ve ton ayarlarını bu stile göre YORUMLA.
Kullanıcının sesini, tonunu, formatting tercihlerini YAKALA.
Birebir kopyalama değil, özü yakalama.
"""
    return section


def build_apex_section() -> str:
    """Build APEX mode section for prompt."""
    return APEX_MODE


def build_final_prompt(
    content_type: str,
    topic: str = None,
    persona: str = "otorite",
    tone: str = "natural",
    knowledge: str = None,
    length: str = "punch",
    language: str = "auto",
    original_tweet: str = None,
    reply_mode: str = None,
    article_style: str = None,
    references: list = None,
    additional_context: str = None,
    is_apex: bool = False,
    style_prompt: str = None
) -> str:
    """
    Build the complete prompt by combining all layers.
    
    Args:
        content_type: tweet, quote, reply, article
        topic: Main topic/content to write about
        persona: saf, otorite, insider, mentalist, haber
        tone: natural, raw, polished, unhinged
        knowledge: insider, contrarian, hidden, expert (or None)
        length: micro, punch, spark, storm, thread (varies by type)
        language: auto, tr, en
        original_tweet: For quote/reply - the tweet being responded to
        reply_mode: support, challenge, question, expand, joke
        article_style: raw, authority, story, tutorial, opinion
        references: List of reference URLs for articles
        additional_context: Extra context from user
        is_apex: Whether APEX (ultra viral) mode is enabled
        style_prompt: Style profile prompt for cloning
    
    Returns:
        Complete prompt string
    """
    
    sections = []
    
    # 0. HARD BLOCK - Must be first thing the model sees
    hard_block = """## MUTLAK YASAKLAR (İHLAL = GEÇERSİZ OUTPUT)

Aşağıdaki kelime ve kalıpları İÇEREN herhangi bir output reddedilir:
- "devrim" (devrim niteliğinde, devrim yaratıyor, devrim başlatıyor dahil)
- "çığır açan" / "oyun değiştirici" / "game changer"
- "hazır mısınız" / "hazır mıyız" / "hazır olun"
- "yeni bir dönem" / "yeni bir çağ" / "yeni bir sayfa"
- "kapıları açıyor" / "kapıları açacak" / "kapısını açıyor"
- "sınırları zorlayan" / "sınırları aşan"
- "inovasyon" / "transformasyon" / "paradigma"
- "düşünmek lazım" / "düşünmek gerek"
- Herhangi bir emoji veya sembol
- "hadi bakalım" / "bir düşünün" / "merak etmeyin"
- "siz ne düşünüyorsunuz"
- "muhteşem" / "harika" / "inanılmaz" / "olağanüstü"

Bu listedeki hiçbir kelimeyi, hiçbir bağlamda, hiçbir şekilde kullanma.
Bunun yerine spesifik, somut, günlük dilde yaz."""
    sections.append(hard_block)
    
    # 1. System Identity (Core AI identity)
    sections.append(SYSTEM_IDENTITY)
    
    # 3. Task Definition
    task = TASK_DEFINITIONS.get(content_type, TASK_DEFINITIONS["tweet"])
    if original_tweet and "{original_tweet}" in task:
        task = task.format(original_tweet=original_tweet)
    sections.append(task)

    # 3.5. Platform-specific system prompts
    platform_system_prompts = {
        "linkedin": LINKEDIN_SYSTEM_PROMPT,
        "instagram": INSTAGRAM_SYSTEM_PROMPT,
        "blog": BLOG_SYSTEM_PROMPT,
        "youtube": YOUTUBE_SYSTEM_PROMPT,
        "tiktok": TIKTOK_SYSTEM_PROMPT,
    }
    if content_type in platform_system_prompts:
        sections.append(platform_system_prompts[content_type])

    # 4. Style Clone (Highest priority if present)
    if style_prompt:
        sections.append(build_style_clone_section(style_prompt))
    
    # 5. Persona
    sections.append(build_persona_section(persona))
    
    # 6. Tone
    sections.append(build_tone_section(tone))
    
    # 7. Knowledge Mode
    if knowledge:
        sections.append(build_knowledge_section(knowledge))
    
    # 8. Length
    sections.append(build_length_section(content_type, length))
    
    # 9. Reply Mode (for replies)
    if content_type == "reply" and reply_mode:
        sections.append(build_reply_mode_section(reply_mode))
    
    # 10. Article Style (for articles)
    if content_type == "article" and article_style:
        sections.append(build_article_style_section(article_style))
    
    # 11. References (for articles)
    if references:
        ref_section = "## 📚 REFERANSLAR\n\nBu kaynaklara göz atılabilir:\n"
        ref_section += chr(10).join(f"• {r}" for r in references)
        sections.append(ref_section)
    
    # 12. APEX Mode (Ultra viral)
    if is_apex:
        sections.append(build_apex_section())
    
    # 13. Language
    lang_map = {
        "auto": "Konunun diline göre otomatik olarak Türkçe veya İngilizce yaz. Konu Türkçe ise Türkçe, İngilizce ise İngilizce.",
        "tr": "Kesinlikle TÜRKÇE yaz. Tüm içerik Türkçe olmalı.",
        "en": "Write in ENGLISH only. All content must be in English."
    }
    sections.append(f"## 🌐 DİL\n\n{lang_map.get(language, lang_map['auto'])}")
    
    # 14. Additional Context
    if additional_context:
        sections.append(f"## 💡 EK BAĞLAM (Kullanıcıdan)\n\n{additional_context}")
    
    # 15. Topic
    if topic:
        sections.append(f"## 📌 KONU\n\n{topic}")
    
    # 16. Quality Criteria
    sections.append(QUALITY_CRITERIA)
    
    # 18. Output Instructions
    output_instruction = """
## ÇIKTI

Sadece içeriğin kendisini yaz. Açıklama, meta bilgi, "İşte tweet:" gibi girişler yasak.
Thread ise numaralandır (1/, 2/, 3/). Tek içerik ise düz metin.
Karakter sayısını verilen aralıkta tut.
"""
    sections.append(output_instruction)
    
    # Combine all sections
    return "\n\n---\n\n".join(sections)


# Export
__all__ = [
    'build_final_prompt',
    'PERSONAS',
    'TONES',
    'KNOWLEDGE_MODES',
    'LENGTH_CONSTRAINTS',
    'REPLY_MODES',
    'ARTICLE_STYLES',
    'LINKEDIN_PERSONAS',
    'LINKEDIN_FORMATS',
    'LINKEDIN_FORMAT_PROMPTS',
    'INSTAGRAM_FORMATS',
    'INSTAGRAM_FORMAT_PROMPTS',
    'BLOG_STYLES',
    'BLOG_FORMAT_PROMPTS',
    'YOUTUBE_FORMATS',
    'YOUTUBE_FORMAT_PROMPTS',
    'TIKTOK_FORMATS',
    'TIKTOK_FORMAT_PROMPTS',
]
