# ContentFactory - Derinlik (Knowledge Depth) Definitions
# Controls the PERSPECTIVE / angle of the content
# Default is "standart" - no special perspective

DERINLIKLER = {
    "standart": {
        "id": "standart",
        "name": "Standart",
        "label": "Ekstra perspektif yok",
        "emoji": "📝",

        "prompt": ""  # No additional prompt needed
    },

    "karsi_gorus": {
        "id": "karsi_gorus",
        "name": "Karşıt Görüş",
        "label": "Popüler görüşün tersini savun",
        "emoji": "⚔️",

        "prompt": """## DERİNLİK: KARŞIT GÖRÜŞ

Bu konuda popüler görüşün tersini savun.

Yaklaşım:
- Mainstream ne diyorsa, onun neden eksik veya yanlış olduğunu göster.
- Sadece karşı çıkmak için değil, gerçek bir alternatif bakış sun.
- Argümanını destekle. Boş contrarian olma, mantık veya kanıt koy.
- Okuyucu "hmm, bunu düşünmemiştim" desin.

Dikkat:
- Provokatif ama constructive. Troll değil, düşündüren biri.
- Kişilere değil fikirlere karşı çık.
- "Herkes aptal" vibes değil, "alternatif bir bakış" vibes."""
    },

    "perde_arkasi": {
        "id": "perde_arkasi",
        "name": "Perde Arkası",
        "label": "İçeriden bilgi, sektör sırları",
        "emoji": "🔐",

        "prompt": """## DERİNLİK: PERDE ARKASI

Bu konuyu perde arkası perspektifinden yaz.

Yaklaşım:
- Dışarıdan görünmeyen detayları paylaş.
- "Çoğu kişi [görüneni] biliyor. Ama [perde arkası]..." formatı.
- Spesifik ol. Genel "içeriden bilgi" inandırıcı değil, somut detay inandırıcı.
- Exclusivity hissettir. Okuyucu bu bilgiyi aldığı için şanslı hissetsin.

Dikkat:
- Gerçekçi ol. Absürt iddialar güvenilirliği kırar.
- Spekülasyonu gerçek gibi sunma.
- Dramatize etme, bilgi zaten ilginç."""
    },

    "uzmanlik": {
        "id": "uzmanlik",
        "name": "Uzmanlık",
        "label": "Derin teknik bilgi, detaylı analiz",
        "emoji": "🎓",

        "prompt": """## DERİNLİK: UZMANLIK

Bu konuyu uzman seviyesinde derinlikte yaz.

Yaklaşım:
- Yüzeyde kalma, derine in. "Why behind the why" açıkla.
- Nuance'ları göster. "Her zaman X" değil, "X çoğu durumda ama Y durumunda Z".
- Trade-off'ları göster. Her şeyin artısı eksisi var.
- Jargon kullanabilirsin ama tweet'e sığacak şekilde basitleştir.

Dikkat:
- Flexing değil, değer katma odaklı.
- Karmaşık = akıllı değil. Basit dille derin bilgi ver.
- Kendi hatalarından bahsetmek güvenilirlik katar."""
    },
}

# Export
__all__ = ['DERINLIKLER']
