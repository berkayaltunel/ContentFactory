"""
Style Lab v3 - Ghost Writer Prompt Builder
Stil profili aktif olduğunda kullanılır.
build_final_prompt()'a DOKUNULMAZ, sadece build_style_enhanced_prompt() değişir.
"""


def build_style_enhanced_prompt(
    content_type: str,  # tweet, quote, reply
    topic: str,
    style_fingerprint: dict,
    viral_patterns: dict,
    constraints,  # StyleConstraints instance
    reference_tweets: list,  # RAG'den gelen tweet'ler
    persona: str = "otorite",
    tone: str = "natural",
    knowledge: str = None,
    length: str = "punch",
    language: str = "auto",
    original_tweet: str = None,
    reply_mode: str = None,
    additional_context: str = None,
    is_apex: bool = False,
    image_context: str = None,
) -> str:
    """
    Style Lab v3 Ghost Writer prompt builder.
    Mevcut builder.py fonksiyonlarını re-use eder + v3 Ghost Writer katmanı ekler.
    """
    # Lazy imports (circular import önleme)
    from .builder import (
        TASK_DEFINITIONS,
        build_persona_section,
        build_tone_section,
        build_knowledge_section,
        build_length_section,
        build_reply_mode_section,
    )

    sections = []

    # ─── 1. GHOST WRITER IDENTITY (en başta) ───
    sections.append(_build_ghost_writer_identity())

    # ─── 2. RAG ÖRNEKLER (öne taşındı, sadeleştirildi) ───
    sections.append(_build_rag_examples_section(reference_tweets))

    # ─── 3. STİL DNA (fingerprint'ten) ───
    sections.append(_build_style_dna_section(style_fingerprint))

    # ─── 4. MİKRO KURALLAR ───
    sections.append(_build_micro_rules_section(style_fingerprint))

    # ─── 5. TYPING HABITS RULES ───
    sections.append(_build_typing_habits_section(style_fingerprint))

    # ─── 6. HARD BLOCK (sadece en kritikler) ───
    sections.append(_build_hard_block())

    # ─── 7. TASK DEFINITION ───
    task = TASK_DEFINITIONS.get(content_type, TASK_DEFINITIONS["tweet"])
    if original_tweet and "{original_tweet}" in task:
        task = task.format(original_tweet=original_tweet)
    sections.append(task)

    # ─── 8. PERSONA + TONE (sadeleştirilmiş) ───
    sections.append(build_persona_section(persona))
    sections.append(build_tone_section(tone))

    # ─── 9. TOPIC ───
    if topic:
        sections.append(f"## KONU\n\n{topic}")

    # ─── 10. OUTPUT INSTRUCTIONS (kısa) ───
    sections.append("""## ÇIKTI

Sadece içeriği yaz. Açıklama, meta bilgi, "İşte tweet:" gibi girişler yasak.
Her varyant gerçekten FARKLI olsun: farklı hook, farklı açı, farklı yapı.
Karakter sayısını verilen aralıkta tut.""")

    # ─── EK: CONSTRAINT'LER ───
    if constraints:
        sections.append(constraints.to_prompt())

    # ─── EK: KNOWLEDGE MODE ───
    if knowledge:
        sections.append(build_knowledge_section(knowledge))

    # ─── EK: LENGTH ───
    sections.append(build_length_section(content_type, length))

    # ─── EK: REPLY MODE ───
    if content_type == "reply" and reply_mode:
        sections.append(build_reply_mode_section(reply_mode))

    # ─── EK: APEX MODE ───
    if is_apex:
        from .quality import APEX_MODE
        sections.append(APEX_MODE)

    # ─── EK: LANGUAGE ───
    lang_map = {
        "auto": "Konunun diline göre otomatik olarak Türkçe veya İngilizce yaz.",
        "tr": "Kesinlikle TÜRKÇE yaz.",
        "en": "Write in ENGLISH only."
    }
    sections.append(f"## DİL\n\n{lang_map.get(language, lang_map['auto'])}")

    # ─── EK: ADDITIONAL CONTEXT ───
    combined = additional_context or ""
    if image_context:
        combined = f"{combined}\n\n{image_context}" if combined else image_context
    if combined:
        sections.append(f"## EK BAĞLAM\n\n{combined}")

    # ─── EK: QUALITY (3 satır) ───
    sections.append("""## KALİTE
- Klişe ve jenerik ifadelerden kaçın, spesifik ol.
- Okuyucunun ilk 3 saniyede ilgisini çek.
- Doğal ve insan gibi yaz, yapay hissettirme.""")

    return "\n\n---\n\n".join(s for s in sections if s)


# ═══════════════════════════════════════════
# V3 GHOST WRITER SECTION BUILDERS
# ═══════════════════════════════════════════

def _build_ghost_writer_identity() -> str:
    """Ghost Writer kimlik tanımı: en başta, modelin rolünü belirler"""
    return """## GHOST WRITER

Sen bu kişisin. Aşağıdaki tweet'leri SEN yazdın.
Yeni tweet yazarken birebir aynı tarzda yaz.
Aynı kelime tercihleri, aynı cümle yapısı, aynı noktalama, aynı enerji.
Senden farklı biri gibi yazarsan BAŞARISIZ olursun."""


def _build_hard_block() -> str:
    """Sadece en kritik yasaklar"""
    return """## YASAKLAR

Aşağıdaki kalıpları ASLA kullanma:
- "devrim", "çığır açan", "game changer", "oyun değiştirici"
- "hazır mısınız", "hazır olun", "yeni bir dönem/çağ"
- "inovasyon", "transformasyon", "paradigma"
- "muhteşem", "harika", "inanılmaz", "olağanüstü"
- "siz ne düşünüyorsunuz", "hadi bakalım", "düşünmek lazım"

Bunun yerine spesifik, somut, günlük dilde yaz."""


def _build_style_dna_section(fp: dict) -> str:
    """Fingerprint'ten stil DNA'sı çıkar"""
    if not fp:
        return ""

    lines = ["## STİL DNA'SI (Bu kişinin yazım kimliği)"]
    lines.append("")
    lines.append("Bu kişi gibi yaz. Aşağıdaki DNA haritasını takip et:")
    lines.append("")

    # Ortalama uzunluk
    avg_len = fp.get('avg_length', 0)
    if avg_len:
        lines.append(f"- Ortalama tweet uzunluğu: ~{int(avg_len)} karakter")

    # Cümle yapısı
    sent = fp.get('sentence_architecture', {})
    if sent:
        avg_w = sent.get('avg_words_per_sentence', 0)
        spt = sent.get('sentences_per_tweet', 0)
        if spt:
            lines.append(f"- Cümle/tweet: ~{round(spt, 1)}")
        if avg_w:
            desc = 'kısa ve keskin' if avg_w < 8 else 'orta' if avg_w < 15 else 'uzun ve detaylı'
            lines.append(f"- Kelime/cümle: ~{round(avg_w, 1)} ({desc})")

    # Açılış stili
    opening = fp.get('opening_psychology', {})
    if opening:
        dom = opening.get('dominant_opening', '')
        pattern_names = {
            'question': 'Soru ile açar',
            'story': 'Hikaye/anekdot ile açar',
            'data': 'Veri/rakam ile açar',
            'direct_address': 'Okuyucuya direkt seslenarak açar',
            'contrast': 'Zıtlık/kontrast ile açar',
            'bold_claim': 'Cesur bir iddia ile açar',
            'provocation': 'Provokatif giriş yapar',
            'mystery': 'Merak uyandırarak başlar',
        }
        if dom in pattern_names:
            lines.append(f"- Açılış stili: {pattern_names[dom]}")

    # Kapanış stili
    closing = fp.get('closing_strategy', {})
    if closing:
        dom_close = closing.get('dominant_closing', '')
        close_names = {
            'question_cta': 'Soru sorarak bitirir',
            'statement': 'Net ifadeyle bitirir',
            'incomplete': 'Yarım bırakır (...)',
            'emoji_close': 'Emoji ile bitirir',
            'no_close': 'Doğal bırakır',
            'call_to_action': 'Aksiyon çağrısı ile bitirir',
        }
        if dom_close in close_names:
            lines.append(f"- Kapanış stili: {close_names[dom_close]}")

    # Dil karışımı
    lang = fp.get('language_mix', {})
    if lang:
        style = lang.get('language_style', '')
        en_pct = lang.get('english_word_pct', 0)
        style_names = {
            'pure_turkish': 'Saf Türkçe',
            'mostly_turkish': f'Türkçe ağırlıklı, %{int(en_pct)} İngilizce',
            'mixed': f'Türkçe/İngilizce karışık (%{int(en_pct)} EN)',
            'mostly_english': 'Ağırlıklı İngilizce',
        }
        if style in style_names:
            lines.append(f"- Dil: {style_names[style]}")

    # Emoji stratejisi
    emoji = fp.get('emoji_strategy', {})
    if emoji:
        e_style = emoji.get('style', '')
        if e_style == 'no_emoji':
            lines.append("- Emoji: KULLANMAZ")
        elif e_style == 'light':
            top = emoji.get('top_emojis', [])[:3]
            lines.append(f"- Emoji: Nadiren{' (' + ' '.join(top) + ')' if top else ''}")
        elif e_style in ('moderate', 'heavy'):
            top = emoji.get('top_emojis', [])[:5]
            lines.append(f"- Emoji: Sık{' (' + ' '.join(top) + ')' if top else ''}")

    # Noktalama DNA'sı
    punct = fp.get('punctuation_dna', {})
    if punct:
        traits = []
        if punct.get('comma_per_tweet', 0) > 2:
            traits.append("virgül sever")
        if punct.get('ellipsis_per_tweet', 0) > 0.3:
            traits.append("üç nokta kullanır")
        if punct.get('exclamation_per_tweet', 0) < 0.1:
            traits.append("ünlem kullanmaz")
        elif punct.get('exclamation_per_tweet', 0) > 1:
            traits.append("ünlem sever")
        no_punct = punct.get('tweets_ending_no_punct', 0)
        if no_punct > 50:
            traits.append("noktalama olmadan bitirir")
        if traits:
            lines.append(f"- Noktalama: {', '.join(traits)}")

    # Büyük/küçük harf
    cap = fp.get('capitalization', {})
    if cap:
        if cap.get('starts_lowercase_pct', 0) > 70:
            lines.append("- Büyük harf: Küçük harfle başlar")
        if cap.get('uses_all_caps_emphasis_pct', 0) > 15:
            lines.append("- Vurgulama: BÜYÜK HARF ile vurgular")

    # Satır yapısı
    line_struct = fp.get('line_structure', {})
    if line_struct:
        ml_pct = line_struct.get('multiline_pct', 0)
        if ml_pct > 50:
            avg_lines = line_struct.get('avg_lines_per_tweet', 3)
            lines.append(f"- Format: Çok satırlı (~{round(avg_lines)} satır)")
        elif ml_pct < 15:
            lines.append("- Format: Tek blok, satır kırmaz")

    # Typing habits entegrasyonu
    habits = fp.get('typing_habits', {})
    if habits:
        ts = habits.get('typing_style', '')
        if ts:
            style_desc = {
                'formal': 'Formal, düzgün yazım',
                'casual': 'Rahat, günlük yazım',
                'lazy': 'Lazy typing, kuralları umursamaz',
                'chaotic': 'Kaotik, tutarsız yazım',
            }
            lines.append(f"- Yazım tarzı: {style_desc.get(ts, ts)}")

    return '\n'.join(lines) if len(lines) > 3 else ""


def _build_micro_rules_section(fp: dict) -> str:
    """Somut, aksiyonel mikro kurallar"""
    if not fp:
        return ""

    rules = []

    # Kelime başına aksiyon
    sent = fp.get('sentence_architecture', {})
    avg_words = sent.get('avg_words_per_sentence', 0)
    if avg_words:
        if avg_words < 8:
            rules.append("Kısa cümleler kur. Max 8 kelime/cümle.")
        elif avg_words < 12:
            rules.append("Orta uzunlukta cümleler kur. 8-12 kelime/cümle.")
        else:
            rules.append("Detaylı cümleler kurabilirsin. 12+ kelime/cümle OK.")

    # Hashtag
    ht = fp.get('hashtag_usage', 0)
    if ht < 0.05:
        rules.append("Hashtag KULLANMA.")
    elif ht > 0.3:
        rules.append("Hashtag kullanabilirsin (max 2).")

    # Soru kullanımı
    q_ratio = fp.get('question_ratio', 0)
    if q_ratio > 0.3:
        rules.append("Soru sor: bu kişi tweet'lerin %{:.0f}'inde soru soruyor.".format(q_ratio * 100))
    elif q_ratio < 0.1:
        rules.append("Soru sorma eğilimi düşük. Statement ağırlıklı yaz.")

    if not rules:
        return ""

    header = "## MİKRO KURALLAR\n"
    return header + '\n'.join(f"- {r}" for r in rules)


def _build_typing_habits_section(fp: dict) -> str:
    """typing_habits dict'inden somut yazım kuralları üret"""
    habits = fp.get('typing_habits', {})
    if not habits:
        return ""

    rules = []

    # all_lowercase > 50% → küçük harf kuralı
    if habits.get('all_lowercase_pct', 0) > 50:
        rules.append("her şeyi küçük harfle yaz. büyük harf kullanma.")

    # lowercase_after_period > 30% → nokta sonrası küçük harf
    if habits.get('lowercase_after_period_pct', 0) > 30:
        rules.append("nokta koyduktan sonra küçük harfle devam et.")

    # number_suffix > 10% → sayı+ek bitişik
    if habits.get('number_suffix_pct', 0) > 10:
        rules.append("sayıları ekle bitişik yaz: 4üncü, 2nci, 3te")

    # no_comma > 70% → virgül kullanma
    if habits.get('no_comma_tweet_pct', 0) > 70:
        rules.append("virgül kullanma.")

    # informal_contractions varsa → kısaltma kullan
    contractions = habits.get('informal_contractions', {})
    if contractions:
        words = list(contractions.keys())[:5]
        rules.append(f"kısaltma kullan: {', '.join(words)}")

    # missing_apostrophe > 30% → kesme işareti kullanma
    if habits.get('missing_apostrophe_pct', 0) > 30:
        rules.append("kesme işareti kullanma.")

    # no_punctuation_end > 50% → noktalama olmadan bitir
    if habits.get('no_punctuation_end_pct', 0) > 50:
        rules.append("tweet'i noktalama işareti koymadan bitir.")

    if not rules:
        return ""

    header = "## YAZIM ALIŞKANLIKLARI (Bu kişinin yazım tarzını kopyala)\n\n"
    return header + '\n'.join(f"- {r}" for r in rules)


def _build_rag_examples_section(tweets: list) -> str:
    """RAG'den gelen referans tweet'ler: sadeleştirilmiş, engagement metadata YOK"""
    if not tweets:
        return ""

    lines = ["## SENİN TWEET'LERİN (Bu tweet'leri sen yazdın: aynı tarzda devam et)"]
    lines.append("")

    for i, tweet in enumerate(tweets[:15], 1):
        content = tweet.get('content', '') if isinstance(tweet, dict) else str(tweet)
        if len(content) > 400:
            content = content[:397] + "..."
        lines.append(f"{i}. {content}")

    return '\n'.join(lines)
