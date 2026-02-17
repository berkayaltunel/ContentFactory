# ContentFactory - Prompt Builder v3
# 5-section architecture: GÖREV → SES → KURALLAR → ÖRNEKLER → SON KONTROL
# Designed for single-pass quality over constraint overload

from .personas import PERSONAS
from .tones import TONES
from .knowledge import KNOWLEDGE_MODES
from .quality import LENGTH_CONSTRAINTS, REPLY_MODES, ARTICLE_STYLES, APEX_MODE

from .linkedin import LINKEDIN_SYSTEM_PROMPT
from .instagram import INSTAGRAM_SYSTEM_PROMPT
from .blog import BLOG_SYSTEM_PROMPT
from .youtube import YOUTUBE_SYSTEM_PROMPT
from .tiktok import TIKTOK_SYSTEM_PROMPT

# ─────────────────────────────────────────────
# SECTION 1: GÖREV (Task)
# ─────────────────────────────────────────────

_TASK_TEMPLATES = {
    "tweet": "Verilen konuya göre tweet yaz. Scroll durdurucu açılış, net mesaj, değer katan içerik.",
    "quote": "Aşağıdaki tweet'e quote tweet yaz. Boş övgü yasak — kendi perspektifini ekle, değer kat.\n\nOrijinal tweet:\n{original_tweet}",
    "reply": "Aşağıdaki tweet'e reply yaz. Bağlama uygun, değer katan, doğal bir yanıt.\n\nReply atacağın tweet:\n{original_tweet}",
    "article": "X/Twitter Article formatında uzun form içerik yaz. Güçlü başlık, hooklu giriş, bölümlenmiş yapı, takeaway'li kapanış.",
    "linkedin": "LinkedIn için profesyonel içerik yaz. İlk 2-3 satır hook, kısa paragraflar, net insight.",
    "instagram": "Instagram için caption yaz. Hook ile başla, kısa paragraflar, engagement odaklı.",
    "blog": "Blog yazısı yaz. SEO uyumlu yapı, örneklerle desteklenmiş, actionable sonuç.",
    "youtube": "YouTube için içerik yaz. CTR optimize başlık, retention odaklı yapı.",
    "tiktok": "TikTok için kısa form video scripti yaz. İlk 1-3 saniye hook, hızlı tempo, loop-friendly.",
}


def _build_gorev(content_type: str, topic: str = None, original_tweet: str = None,
                 reply_mode: str = None, article_style: str = None,
                 references: list = None, additional_context: str = None) -> str:
    """Section 1: GÖREV — ne üretilecek."""
    task = _TASK_TEMPLATES.get(content_type, _TASK_TEMPLATES["tweet"])
    if original_tweet and "{original_tweet}" in task:
        task = task.format(original_tweet=original_tweet)

    parts = [f"## GÖREV\n\n{task}"]

    if reply_mode and reply_mode in REPLY_MODES:
        rm = REPLY_MODES[reply_mode]
        parts.append(f"Reply modu: {rm['name']} — {rm['approach']}")

    if article_style and article_style in ARTICLE_STYLES:
        ast = ARTICLE_STYLES[article_style]
        parts.append(f"Makale stili: {ast['name']} — {ast['structure']}")

    if references:
        parts.append("Referanslar:\n" + "\n".join(f"• {r}" for r in references))

    if additional_context:
        parts.append(f"Ek bağlam: {additional_context}")

    if topic:
        parts.append(f"Konu: {topic}")

    return "\n\n".join(parts)


# ─────────────────────────────────────────────
# SECTION 2: SES (Voice = Style > Persona > Tone)
# ─────────────────────────────────────────────

_PLATFORM_PROMPTS = {
    "linkedin": LINKEDIN_SYSTEM_PROMPT,
    "instagram": INSTAGRAM_SYSTEM_PROMPT,
    "blog": BLOG_SYSTEM_PROMPT,
    "youtube": YOUTUBE_SYSTEM_PROMPT,
    "tiktok": TIKTOK_SYSTEM_PROMPT,
}

def _extract_persona_essence(persona_id: str) -> str:
    """Persona'nın özünü 3-5 cümleye sıkıştır."""
    if not persona_id:
        return ""
    p = PERSONAS.get(persona_id, PERSONAS.get("otorite"))
    if not p:
        return ""
    identity = p.get("identity", "").strip()
    voice = p.get("voice_characteristics", [])
    voice_str = ", ".join(voice[:3]) if voice else ""
    avoid = p.get("avoid", [])
    avoid_str = ", ".join(avoid[:3]) if avoid else ""

    lines = [f"Persona: {p['name']} — {p['description']}"]
    if identity:
        # Take first 2 sentences of identity
        sentences = [s.strip() for s in identity.replace("\n", " ").split(".") if s.strip()]
        lines.append(". ".join(sentences[:2]) + ".")
    if voice_str:
        lines.append(f"Ses: {voice_str}.")
    if avoid_str:
        lines.append(f"Kaçın: {avoid_str}.")
    return "\n".join(lines)


def _extract_tone_essence(tone_id: str) -> str:
    """Ton'un özünü 2-3 cümleye sıkıştır."""
    t = TONES.get(tone_id, TONES.get("natural"))
    if not t:
        return ""
    core = t.get("core_principle", "").strip().replace("\n", " ")
    # Take first sentence of core principle
    sentences = [s.strip() for s in core.split(".") if s.strip()]
    first = ". ".join(sentences[:2]) + "." if sentences else ""

    dos = t.get("dos_and_donts", {}).get("do", [])[:3]
    donts = t.get("dos_and_donts", {}).get("dont", [])[:3]

    lines = [f"Ton: {t['name']} — {t['description']}"]
    if first:
        lines.append(first)
    if dos:
        lines.append("Yap: " + ", ".join(dos) + ".")
    if donts:
        lines.append("Yapma: " + ", ".join(donts) + ".")
    return "\n".join(lines)


def _build_ses(persona: str, tone: str, style_prompt: str = None,
               platform: str = "twitter", content_type: str = "tweet") -> str:
    """Section 2: SES — nasıl seslenecek. Öncelik: stil > persona > ton."""
    parts = ["## SES\n"]

    # Platform-specific voice (non-Twitter platforms have their own system prompts)
    platform_key = content_type if content_type in _PLATFORM_PROMPTS else platform
    if platform_key in _PLATFORM_PROMPTS:
        # Extract first meaningful paragraph from platform prompt
        prompt = _PLATFORM_PROMPTS[platform_key]
        # Take first 500 chars as platform voice essence
        lines = [l.strip() for l in prompt.strip().split("\n") if l.strip() and not l.startswith("#")]
        platform_essence = "\n".join(lines[:8])
        if platform_essence:
            parts.append(f"### Platform Sesi\n{platform_essence}")

    # Style DNA (highest priority)
    if style_prompt:
        parts.append(f"### Stil DNA (EN YÜKSEK ÖNCELİK)\n{style_prompt}\n\nBu kişinin ağzından çıkmış gibi yaz. Kelime seçimi, cümle yapısı, ritim hep bu stilde. Çakışma olursa stil kazanır.")

    # Persona essence
    persona_text = _extract_persona_essence(persona)
    if persona_text:
        parts.append(f"### Karakter\n{persona_text}")

    # Tone essence
    tone_text = _extract_tone_essence(tone)
    if tone_text:
        parts.append(f"### Ton\n{tone_text}")

    # Twitter-specific base voice (only if no platform prompt)
    if platform == "twitter" and content_type in ("tweet", "quote", "reply", "article"):
        if platform_key not in _PLATFORM_PROMPTS:
            parts.append("Gerçek bir Twitter kullanıcısı gibi yaz. Kısa cümleler, spesifik ol, emoji kullanma.")

    return "\n\n".join(parts)


# ─────────────────────────────────────────────
# SECTION 3: KURALLAR (Rules)
# ─────────────────────────────────────────────

def _build_kurallar(content_type: str, length: str, language: str,
                    knowledge: str = None, platform: str = "twitter") -> str:
    """Section 3: KURALLAR — length + platform + language + knowledge, kısa maddeler."""
    rules = ["## KURALLAR\n"]

    # Length
    type_constraints = LENGTH_CONSTRAINTS.get(content_type, LENGTH_CONSTRAINTS.get("tweet", {}))
    length_data = type_constraints.get(length, list(type_constraints.values())[0] if type_constraints else None)
    if length_data:
        min_c, max_c = length_data["chars"]
        rules.append(f"- Uzunluk: {min_c}–{max_c} karakter ({length_data['label']}). Bu aralığın dışına çıkma.")

    # Language
    lang_map = {
        "auto": "- Dil: Konunun diline göre Türkçe veya İngilizce.",
        "tr": "- Dil: Kesinlikle Türkçe yaz.",
        "en": "- Language: Write in English only.",
    }
    rules.append(lang_map.get(language, lang_map["auto"]))

    # Knowledge mode (condensed)
    if knowledge and knowledge in KNOWLEDGE_MODES:
        km = KNOWLEDGE_MODES[knowledge]
        rules.append(f"- Bilgi modu: {km['name']} — {km['description']}")

    # Content type specific
    if content_type == "thread":
        rules.append("- Thread formatı: Her tweet numaralı (1/, 2/, 3/), her biri bağımsız değer versin.")
    elif content_type in ("tweet", "quote", "reply"):
        rules.append("- Sadece içeriği yaz. Açıklama, 'İşte tweet:' gibi girişler yasak.")
        rules.append("- Thread ise numaralandır (1/, 2/, 3/). Tek içerik ise düz metin.")

    return "\n".join(rules)


# ─────────────────────────────────────────────
# SECTION 4: ÖRNEKLER (Examples / Few-shot)
# ─────────────────────────────────────────────

def _build_ornekler(example_tweets: list = None) -> str:
    """Section 4: ÖRNEKLER — few-shot RAG, varsa."""
    if not example_tweets:
        return ""

    tweets = example_tweets[:15]
    lines = ["## ÖRNEKLER\n\nBu kişinin gerçek tweet'leri. Kopyalama, ama aynı kişi yazmış gibi hissettir.\n"]

    for i, tweet in enumerate(tweets, 1):
        content = tweet.get("content", "") if isinstance(tweet, dict) else str(tweet)
        if len(content) > 400:
            content = content[:397] + "..."

        # Engagement tag
        tag = ""
        if isinstance(tweet, dict):
            likes = tweet.get("likes", 0)
            rts = tweet.get("retweets", 0)
            if likes >= 100 or rts >= 20:
                tag = f" [🔥 {likes}♡ {rts}RT]"

        lines.append(f"{i}. {content}{tag}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# SECTION 5: SON KONTROL (Final Checklist)
# ─────────────────────────────────────────────

_BANNED_WORDS = [
    "devrim", "çığır açan", "oyun değiştirici", "game changer",
    "hazır mısınız", "hazır mıyız", "hazır olun",
    "yeni bir dönem", "yeni bir çağ", "yeni bir sayfa",
    "kapıları açıyor", "kapıları açacak", "kapısını açıyor",
    "sınırları zorlayan", "sınırları aşan",
    "inovasyon", "transformasyon", "paradigma",
    "düşünmek lazım", "düşünmek gerek",
    "hadi bakalım", "bir düşünün", "merak etmeyin",
    "siz ne düşünüyorsunuz",
    "muhteşem", "harika", "inanılmaz", "olağanüstü",
]

_BANNED_LIST_STR = ", ".join(f'"{w}"' for w in _BANNED_WORDS)


def _build_son_kontrol() -> str:
    """Section 5: SON KONTROL — yasaklar + kalite, 'göndermeden önce kontrol et' framing."""
    return f"""## SON KONTROL — Göndermeden önce kontrol et

1. **Yasaklı kelimeler:** Şu kelime/kalıpları kullandıysan output geçersiz, baştan yaz:
   {_BANNED_LIST_STR}
   Emoji veya sembol de yasak. Bunlar yerine spesifik, somut, günlük dilde yaz.

2. **AI testi:** Bunu gerçek bir insan tweet atar mıydı? "AI yazmış" hissi varsa baştan yaz.

3. **İlk cümle testi:** İlk cümle sıradan mı? Sıradansa değiştir.

4. **Dolgu testi:** "Bu çok önemli bir gelişme" gibi hiçbir şey söylemeyen cümle varsa sil.

5. **Karakter limiti:** Verilen aralıkta mı? Değilse düzelt."""


# ─────────────────────────────────────────────
# APEX SECTION (optional, appended when active)
# ─────────────────────────────────────────────

_APEX_V3 = """## APEX MODE

Normal mod bilgi verir. Apex mod HİSSETTİRİR.

- İlk cümle: Scroll durdurucu. İddia, çelişki veya şok.
- Gövde: Her cümle bir sonrakini okutacak tension.
- Son cümle: Mic drop. Screenshot'lanacak kadar güçlü.
- Somut, spesifik, kişisel, beklenmedik açı.
- Liste formatı (1. 2. 3.) yasak. Generic tavsiye yasak.
- Birileri bunu screenshot'layıp paylaşır mı? Hayırsa baştan yaz."""


# ─────────────────────────────────────────────
# MAIN BUILDER
# ─────────────────────────────────────────────

def build_final_prompt_v3(
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
    style_prompt: str = None,
    example_tweets: list = None,
    platform: str = "twitter",
    # Accept but ignore v1 extras for compatibility
    **kwargs,
) -> str:
    """
    Build prompt v3: 5-section architecture.
    Same params as build_final_prompt but leaner output.
    
    Sections:
      1. GÖREV — what to produce
      2. SES — voice (style > persona > tone)
      3. KURALLAR — length, platform, language
      4. ÖRNEKLER — few-shot examples (if any)
      5. SON KONTROL — banned words + quality checklist
    """
    sections = []

    # 1. GÖREV
    sections.append(_build_gorev(
        content_type=content_type,
        topic=topic,
        original_tweet=original_tweet,
        reply_mode=reply_mode,
        article_style=article_style,
        references=references,
        additional_context=additional_context,
    ))

    # 2. SES
    sections.append(_build_ses(
        persona=persona,
        tone=tone,
        style_prompt=style_prompt,
        platform=platform,
        content_type=content_type,
    ))

    # 3. KURALLAR
    sections.append(_build_kurallar(
        content_type=content_type,
        length=length,
        language=language,
        knowledge=knowledge,
        platform=platform,
    ))

    # 4. ÖRNEKLER (optional)
    ornekler = _build_ornekler(example_tweets)
    if ornekler:
        sections.append(ornekler)

    # APEX (optional, before final check)
    if is_apex:
        sections.append(_APEX_V3)

    # 5. SON KONTROL (always last)
    sections.append(_build_son_kontrol())

    return "\n\n---\n\n".join(sections)


__all__ = ["build_final_prompt_v3"]
