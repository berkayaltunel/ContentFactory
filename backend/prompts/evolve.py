"""
Content Evolution — Prompt builder for iterative content refinement.
"""

QUICK_TAG_PROMPTS = {
    "shorter": "Daha kısa ve öz yaz. Gereksiz kelimeleri kes, her kelime kazansın.",
    "longer": "Daha detaylı ve derinlemesine yaz. Örnekler, açıklamalar ekle.",
    "bolder": "Daha provokatif bir ton. Tartışmalı bir iddia, zorlayıcı bir soru ile aç.",
    "softer": "Daha yumuşak ve empatik. Okuyucuyu kucaklayan, anlayışlı bir ton.",
    "professional": "Daha kurumsal ve otoriter. Veri, kaynak, uzmanlık hissi ver.",
    "casual": "Daha samimi ve konuşkan. Arkadaşına anlatır gibi, doğal akış.",
    "provocative": "Sınır zorlayan, insanları düşündüren, reply çekecek bir yaklaşım.",
    "informative": "Bilgi yoğun, öğretici. Okuyucu bir şey öğrenmiş hissetsin.",
    "different_opening": "Tamamen farklı bir açılış dene. Soru, istatistik, şok edici bilgi veya alıntı ile başla.",
    "stronger_ending": "Güçlü bir kapanış yap. CTA, düşündürücü soru veya akılda kalıcı cümle ile bitir.",
    "add_hook": "İlk 2 saniyede yakalayan bir hook ekle. Scroll durduran açılış.",
    "simplify": "Sadeleştir. Karmaşık fikirleri basit, anlaşılır cümlelerle anlat.",
}


def build_evolve_prompt(
    selected_variants: list[str],
    feedback: str = "",
    quick_tags: list[str] = None,
    original_topic: str = "",
    platform: str = "twitter",
    content_type: str = "tweet",
    variant_count: int = 3,
    style_prompt: str = "",
) -> str:
    """Build the evolution prompt."""

    # Quick tag instructions
    tag_instructions = ""
    if quick_tags:
        tag_parts = [QUICK_TAG_PROMPTS[tag] for tag in quick_tags if tag in QUICK_TAG_PROMPTS]
        if tag_parts:
            tag_instructions = "\n\nKullanıcının istediği yönlendirmeler:\n" + "\n".join(f"- {p}" for p in tag_parts)

    # User feedback
    feedback_section = ""
    if feedback and feedback.strip():
        feedback_section = f'\n\nKullanıcının detaylı yönlendirmesi:\n"{feedback.strip()}"'

    # Style prompt
    style_section = ""
    if style_prompt and style_prompt.strip():
        style_section = f"\n\nKullanıcının yazım stili profili (bunu koru):\n{style_prompt.strip()}"

    if len(selected_variants) == 1:
        prompt = f"""Kullanıcı aşağıdaki içeriği beğendi ve geliştirmek istiyor.

Orijinal konu: {original_topic}
Platform: {platform}
İçerik türü: {content_type}

--- Beğenilen İçerik ---
{selected_variants[0]}
--- ---
{tag_instructions}{feedback_section}{style_section}

Bu içeriğin ruhunu, tonunu ve ana fikrini koru. Kullanıcının istediği yönde geliştirerek {variant_count} yeni varyant üret.

Kurallar:
- Her varyant farklı bir yaklaşım denesin ama hepsi beğenilen içeriğin ruhunda olsun
- Birebir kopya yapma, her biri özgün olsun
- Platform kurallarına uy ({platform})
- Kullanıcının yönlendirmelerini mutlaka uygula

JSON formatında dön:
{{"variants": [{{"content": "...", "variant_index": 0}}, ...]}}"""
    else:
        variants_text = ""
        for i, v in enumerate(selected_variants):
            variants_text += f"\n--- Beğenilen İçerik {i+1} ---\n{v}\n--- ---\n"

        prompt = f"""Kullanıcı aşağıdaki içerikleri beğendi ve bunların en iyi özelliklerini birleştirmek istiyor.

Orijinal konu: {original_topic}
Platform: {platform}
İçerik türü: {content_type}
{variants_text}
{tag_instructions}{feedback_section}{style_section}

Her iki içeriğin güçlü yanlarını harmanlayarak {variant_count} yeni varyant üret.

Kurallar:
- Her varyant, seçilen içeriklerin en iyi özelliklerini farklı şekillerde birleştirsin
- Birebir kopya yapma, her biri özgün olsun
- Platform kurallarına uy ({platform})
- Kullanıcının yönlendirmelerini mutlaka uygula

JSON formatında dön:
{{"variants": [{{"content": "...", "variant_index": 0}}, ...]}}"""

    return prompt
