"""
Style Lab v2 - Style-Enhanced Prompt Builder
Tüm v2 katmanlarını birleştiren prompt builder.
Mevcut build_final_prompt'a dokunmadan, style_profile aktif olduğunda kullanılır.
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
    Style Lab v2 prompt builder.
    Mevcut builder.py fonksiyonlarını re-use eder + v2 katmanları ekler.
    """
    # Lazy imports (circular import önleme)
    from .system_identity import SYSTEM_IDENTITY
    from .algorithm import (
        ALGORITHM_KNOWLEDGE, ALGORITHM_KNOWLEDGE_COMPACT,
        CTA_STRATEGIES, HOOK_FORMULAS, CONTENT_RULES,
    )
    from .quality import QUALITY_CRITERIA, APEX_MODE
    from .builder import (
        TASK_DEFINITIONS,
        build_persona_section,
        build_tone_section,
        build_knowledge_section,
        build_length_section,
        build_reply_mode_section,
    )

    sections = []

    # ─── 0. HARD BLOCK (en üstte, model ilk bunu görmeli) ───
    sections.append(_build_hard_block())

    # ─── 1. SYSTEM IDENTITY ───
    sections.append(SYSTEM_IDENTITY)

    # ─── 2. ALGORITHM KNOWLEDGE ───
    is_twitter = content_type in ("tweet", "quote", "reply")
    if is_twitter:
        sections.append(ALGORITHM_KNOWLEDGE)
        sections.append(CONTENT_RULES)
    else:
        sections.append(ALGORITHM_KNOWLEDGE_COMPACT)

    # ─── 3. TASK DEFINITION ───
    task = TASK_DEFINITIONS.get(content_type, TASK_DEFINITIONS["tweet"])
    if original_tweet and "{original_tweet}" in task:
        task = task.format(original_tweet=original_tweet)
    sections.append(task)

    # ─── 4. STİL DNA (v2 - fingerprint'ten) ───
    sections.append(_build_style_dna_section(style_fingerprint))

    # ─── 5. MİKRO KURALLAR (v2 - somut, aksiyonel) ───
    sections.append(_build_micro_rules_section(style_fingerprint))

    # ─── 6. VİRAL PATTERN INSIGHT'LAR (v2) ───
    sections.append(_build_viral_insights_section(viral_patterns))

    # ─── 7. CONSTRAINT'LER (v2 - StyleConstraints.to_prompt()) ───
    if constraints:
        sections.append(constraints.to_prompt())

    # ─── 8. RAG ÖRNEKLERİ (v2 - engagement metadata ile) ───
    sections.append(_build_rag_examples_section(reference_tweets))

    # ─── 9. PERSONA + TONE ───
    sections.append(build_persona_section(persona))
    if is_twitter:
        sections.append(HOOK_FORMULAS)
    sections.append(build_tone_section(tone))

    # ─── 10. KNOWLEDGE MODE ───
    if knowledge:
        sections.append(build_knowledge_section(knowledge))

    # ─── 11. LENGTH ───
    sections.append(build_length_section(content_type, length))

    # ─── 12. REPLY MODE ───
    if content_type == "reply" and reply_mode:
        sections.append(build_reply_mode_section(reply_mode))

    # ─── 13. APEX MODE ───
    if is_apex:
        sections.append(APEX_MODE)

    # ─── 14. LANGUAGE ───
    lang_map = {
        "auto": "Konunun diline göre otomatik olarak Türkçe veya İngilizce yaz. Konu Türkçe ise Türkçe, İngilizce ise İngilizce.",
        "tr": "Kesinlikle TÜRKÇE yaz. Tüm içerik Türkçe olmalı.",
        "en": "Write in ENGLISH only. All content must be in English."
    }
    sections.append(f"## 🌐 DİL\n\n{lang_map.get(language, lang_map['auto'])}")

    # ─── 15. ADDITIONAL CONTEXT ───
    combined = additional_context or ""
    if image_context:
        combined = f"{combined}\n\n{image_context}" if combined else image_context
    if combined:
        sections.append(f"## 💡 EK BAĞLAM (Kullanıcıdan)\n\n{combined}")

    # ─── 16. TOPIC ───
    if topic:
        sections.append(f"## 📌 KONU\n\n{topic}")

    # ─── 17. CTA STRATEGIES ───
    sections.append(CTA_STRATEGIES)

    # ─── 18. QUALITY CRITERIA ───
    sections.append(QUALITY_CRITERIA)

    # ─── 19. OUTPUT INSTRUCTIONS ───
    sections.append("""
## ÇIKTI

Sadece içeriğin kendisini yaz. Açıklama, meta bilgi, "İşte tweet:" gibi girişler yasak.
Thread ise numaralandır (1/, 2/, 3/). Tek içerik ise düz metin.
Karakter sayısını verilen aralıkta tut.
Her varyant gerçekten FARKLI olsun — farklı hook, farklı açı, farklı yapı.
""")

    return "\n\n---\n\n".join(s for s in sections if s)


# ═══════════════════════════════════════════
# V2 SECTION BUILDERS
# ═══════════════════════════════════════════

def _build_hard_block() -> str:
    return """## MUTLAK YASAKLAR (İHLAL = GEÇERSİZ OUTPUT)

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


def _build_style_dna_section(fp: dict) -> str:
    """Fingerprint'ten stil DNA'sı çıkar — AI'ın analiz etmesi için"""
    if not fp:
        return ""

    lines = ["## 🧬 STİL DNA'SI (Bu kişinin yazım kimliği — EN YÜKSEK ÖNCELİK)"]
    lines.append("")
    lines.append("Bu kişi gibi yaz. Aşağıdaki DNA haritasını takip et:")
    lines.append("")

    # Ortalama uzunluk
    avg_len = fp.get('avg_length', 0)
    if avg_len:
        lines.append(f"- **Ortalama tweet uzunluğu:** ~{int(avg_len)} karakter")

    # Cümle yapısı
    sentence = fp.get('sentence_structure', {})
    if sentence:
        avg_sent = sentence.get('avg_sentences_per_tweet', 0)
        avg_words = sentence.get('avg_words_per_sentence', 0)
        if avg_sent:
            lines.append(f"- **Cümle/tweet:** ~{round(avg_sent, 1)} cümle")
        if avg_words:
            lines.append(f"- **Kelime/cümle:** ~{round(avg_words, 1)} kelime ({'kısa ve keskin' if avg_words < 8 else 'orta' if avg_words < 15 else 'uzun ve detaylı'})")

    # Açılış stili
    opening = fp.get('opening_psychology', {})
    if opening:
        dom = opening.get('dominant_pattern', '')
        dist = opening.get('distribution', {})
        if dom:
            pattern_names = {
                'direct': 'Direkt statement ile açar',
                'question': 'Soru ile açar',
                'story': 'Hikaye/anekdot ile açar',
                'data': 'Veri/rakam ile açar',
                'contrast': 'Zıtlık/kontrast ile açar',
            }
            lines.append(f"- **Açılış stili:** {pattern_names.get(dom, dom)}")
            if dist:
                top3 = sorted(dist.items(), key=lambda x: x[1], reverse=True)[:3]
                dist_str = ", ".join(f"{k}: %{int(v)}" for k, v in top3)
                lines.append(f"  Dağılım: {dist_str}")

    # Kapanış stili
    closing = fp.get('closing_strategy', {})
    if closing:
        dom_close = closing.get('dominant', '')
        if dom_close:
            close_names = {
                'statement': 'Net bir statement ile bitirir',
                'question': 'Soru ile bitirir (reply tetikler)',
                'open': 'Açık uçlu bırakır',
                'cta': 'CTA ile bitirir',
                'punchline': 'Punchline ile bitirir',
            }
            lines.append(f"- **Kapanış stili:** {close_names.get(dom_close, dom_close)}")

    # Dil karışımı
    lang = fp.get('language_mix', {})
    if lang:
        style = lang.get('language_style', '')
        en_pct = lang.get('english_word_pct', 0)
        if style:
            style_names = {
                'pure_turkish': 'Saf Türkçe, İngilizce kelime yok',
                'light_english': f'Türkçe ağırlıklı, %{int(en_pct)} İngilizce teknik terim',
                'heavy_english': f'Yoğun İngilizce karışımı (%{int(en_pct)})',
                'code_switching': 'Türkçe-İngilizce geçişli',
                'pure_english': 'Tamamen İngilizce',
            }
            lines.append(f"- **Dil:** {style_names.get(style, style)}")

    # Emoji stratejisi
    emoji = fp.get('emoji_strategy', {})
    if emoji:
        e_style = emoji.get('style', '')
        if e_style == 'no_emoji':
            lines.append("- **Emoji:** KULLANMAZ")
        elif e_style == 'light':
            top = emoji.get('top_emojis', [])[:3]
            lines.append(f"- **Emoji:** Nadiren kullanır{' (' + ' '.join(top) + ')' if top else ''}")
        elif e_style in ('moderate', 'heavy'):
            top = emoji.get('top_emojis', [])[:5]
            lines.append(f"- **Emoji:** Sık kullanır{' (' + ' '.join(top) + ')' if top else ''}")

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
            lines.append(f"- **Noktalama:** {', '.join(traits)}")

    # Büyük/küçük harf
    cap = fp.get('capitalization', {})
    if cap:
        if cap.get('starts_lowercase_pct', 0) > 70:
            lines.append("- **Büyük harf:** Küçük harfle başlar")
        if cap.get('uses_all_caps_emphasis_pct', 0) > 15:
            lines.append("- **Vurgulama:** BÜYÜK HARF ile vurgular")

    # Satır yapısı
    line_struct = fp.get('line_structure', {})
    if line_struct:
        ml_pct = line_struct.get('multiline_pct', 0)
        if ml_pct > 50:
            avg_lines = line_struct.get('avg_lines_per_tweet', 3)
            lines.append(f"- **Format:** Çok satırlı yazar (~{round(avg_lines)} satır)")
        elif ml_pct < 15:
            lines.append("- **Format:** Tek blok yazar, satır kırmaz")

    return '\n'.join(lines) if len(lines) > 3 else ""


def _build_micro_rules_section(fp: dict) -> str:
    """Somut, aksiyonel mikro kurallar"""
    if not fp:
        return ""

    rules = []

    # Kelime başına aksiyon
    sentence = fp.get('sentence_structure', {})
    avg_words = sentence.get('avg_words_per_sentence', 0)
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

    # Thread eğilimi
    thread_pct = fp.get('thread_ratio', 0)
    if thread_pct and thread_pct > 0.15:
        rules.append("Thread formatını tercih et, konuyu bölümle.")

    # Soru kullanımı
    q_ratio = fp.get('question_ratio', 0)
    if q_ratio > 0.3:
        rules.append("Soru sor — bu kişi tweet'lerin %{:.0f}'inde soru soruyor.".format(q_ratio * 100))
    elif q_ratio < 0.1:
        rules.append("Soru sorma eğilimi düşük. Statement ağırlıklı yaz.")

    if not rules:
        return ""

    header = "## 📏 MİKRO KURALLAR (Bu kişinin yazım kalıpları)\n"
    return header + '\n'.join(f"- {r}" for r in rules)


def _build_viral_insights_section(vp: dict) -> str:
    """Viral pattern'lerden insight'lar"""
    if not vp:
        return ""

    lines = ["## 🔥 VİRAL PATTERN ANALİZİ"]
    lines.append("")

    # Viral vs flop karşılaştırma
    viral_len = vp.get('viral_avg_length', 0)
    flop_len = vp.get('flop_avg_length', 0)
    if viral_len and flop_len:
        if viral_len > flop_len * 1.2:
            lines.append(f"- Viral tweet'ler daha UZUN (~{int(viral_len)} vs ~{int(flop_len)} kar.) → Detay ver")
        elif flop_len > viral_len * 1.2:
            lines.append(f"- Viral tweet'ler daha KISA (~{int(viral_len)} vs ~{int(flop_len)} kar.) → Öz ol")

    # Soru etkisi
    viral_q = vp.get('viral_question_ratio', 0)
    flop_q = vp.get('flop_question_ratio', 0)
    if viral_q > flop_q + 0.1:
        lines.append(f"- Soru içeren tweet'ler daha viral (%{int(viral_q*100)} vs %{int(flop_q*100)}) → Soru sor")

    # Link etkisi
    flop_link = vp.get('flop_link_ratio', 0)
    viral_link = vp.get('viral_link_ratio', 0)
    if flop_link > viral_link + 0.1:
        lines.append(f"- Link içeren tweet'ler flop ediyor (%{int(flop_link*100)}) → Link KOYMA")

    # Insight'lar
    insights = vp.get('insights', [])
    for insight in insights[:5]:
        lines.append(f"- {insight}")

    return '\n'.join(lines) if len(lines) > 2 else ""


def _build_rag_examples_section(tweets: list) -> str:
    """RAG'den gelen referans tweet'ler — engagement metadata ile"""
    if not tweets:
        return ""

    lines = ["## 📝 REFERANS TWEET'LER (Bu kişinin gerçek tweet'leri — engagement skoru ile)"]
    lines.append("")
    lines.append("Bu tweet'leri oku, tarzı yakala, ama kopyalama. Yüksek engagement olanların yapısını referans al.")
    lines.append("")

    for i, tweet in enumerate(tweets[:12], 1):
        content = tweet.get('content', '') if isinstance(tweet, dict) else str(tweet)
        if len(content) > 400:
            content = content[:397] + "..."

        if isinstance(tweet, dict):
            likes = tweet.get('likes', 0) or 0
            retweets = tweet.get('retweets', 0) or 0
            replies = tweet.get('replies', 0) or 0
            algo = tweet.get('algo_score', 0) or 0
            similarity = tweet.get('similarity', 0) or tweet.get('hybrid_score', 0) or 0

            meta_parts = []
            if likes:
                meta_parts.append(f"{likes}❤")
            if retweets:
                meta_parts.append(f"{retweets}🔁")
            if replies:
                meta_parts.append(f"{replies}💬")
            if algo:
                meta_parts.append(f"algo:{int(algo)}")
            if similarity and isinstance(similarity, float) and similarity > 0:
                meta_parts.append(f"sim:{similarity:.2f}")

            meta = f" [{', '.join(meta_parts)}]" if meta_parts else ""
            lines.append(f"{i}. {content}{meta}")
        else:
            lines.append(f"{i}. {content}")

    return '\n'.join(lines)
