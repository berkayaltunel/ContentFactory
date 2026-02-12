#!/usr/bin/env python3
"""
Type Hype - Genişletilmiş Konu Bazlı Viral Tweet Toplama v2
TR ağırlıklı, daha fazla konu, daha düşük eşik.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_apify import (
    ApifyClient, SupabaseClient, parse_apify_tweet,
    load_env, APIFY_ACTOR
)

TOPIC_QUERIES = [
    # ═══ TÜRKÇE (ağırlıklı) ═══
    
    # Genel viral TR
    {"query": "min_faves:1000 lang:tr -filter:retweets since:2023-01-01", "niche": "genel", "max_items": 5000},
    {"query": "min_faves:1500 lang:tr -filter:retweets since:2023-06-01", "niche": "genel", "max_items": 5000},
    {"query": "min_faves:2000 lang:tr -filter:retweets since:2024-01-01", "niche": "genel", "max_items": 5000},

    # Tech / AI / Yazılım
    {"query": "min_faves:500 lang:tr (yazılım OR yazılımcı OR developer OR kodlama OR frontend OR backend) -filter:retweets since:2023-01-01", "niche": "tech", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (yapay zeka OR ChatGPT OR AI OR GPT OR Gemini OR Claude OR LLM) -filter:retweets since:2023-01-01", "niche": "tech", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (startup OR girişimci OR SaaS OR ürün OR teknoloji haberleri) -filter:retweets since:2023-01-01", "niche": "tech", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (iPhone OR Android OR Tesla OR Apple OR Google OR Microsoft) -filter:retweets since:2023-01-01", "niche": "tech", "max_items": 3000},

    # Finans / Ekonomi
    {"query": "min_faves:500 lang:tr (borsa OR BIST OR hisse OR yatırım OR portföy) -filter:retweets since:2023-01-01", "niche": "finans", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (dolar OR euro OR altın OR faiz OR enflasyon OR TCMB) -filter:retweets since:2023-01-01", "niche": "finans", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (ekonomi OR maaş OR asgari ücret OR zam OR vergi OR kira) -filter:retweets since:2023-01-01", "niche": "finans", "max_items": 3000},

    # Kripto
    {"query": "min_faves:500 lang:tr (kripto OR bitcoin OR ethereum OR altcoin OR BTC OR ETH) -filter:retweets since:2023-01-01", "niche": "kripto", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (coin OR token OR DeFi OR NFT OR blockchain OR cüzdan) -filter:retweets since:2023-01-01", "niche": "kripto", "max_items": 3000},

    # Pazarlama / İş / Kariyer
    {"query": "min_faves:500 lang:tr (pazarlama OR marketing OR reklam OR marka OR sosyal medya) -filter:retweets since:2023-01-01", "niche": "pazarlama", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (freelance OR uzaktan çalışma OR kariyer OR iş hayatı OR CV OR mülakat) -filter:retweets since:2023-01-01", "niche": "pazarlama", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (e-ticaret OR Trendyol OR Hepsiburada OR Amazon OR online satış) -filter:retweets since:2023-01-01", "niche": "pazarlama", "max_items": 2000},

    # Kişisel Gelişim / Eğitim
    {"query": "min_faves:500 lang:tr (motivasyon OR başarı OR alışkanlık OR disiplin OR hedef OR azim) -filter:retweets since:2023-01-01", "niche": "kisisel_gelisim", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (kitap OR okumak OR öğrenmek OR kurs OR eğitim OR sertifika) -filter:retweets since:2023-01-01", "niche": "kisisel_gelisim", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (üniversite OR YKS OR sınav OR öğrenci OR mezuniyet OR staj) -filter:retweets since:2023-01-01", "niche": "kisisel_gelisim", "max_items": 2000},

    # Mizah / Günlük hayat
    {"query": "min_faves:1000 lang:tr (komik OR espri OR caps) -filter:retweets -filter:media since:2023-01-01", "niche": "mizah", "max_items": 3000},
    {"query": "min_faves:1000 lang:tr (İstanbul OR Ankara OR trafik OR toplu taşıma OR metro) -filter:retweets since:2023-01-01", "niche": "genel", "max_items": 2000},

    # İçerik üretici
    {"query": "min_faves:500 lang:tr (YouTube OR TikTok OR Instagram OR podcast OR içerik üretici OR influencer) -filter:retweets since:2023-01-01", "niche": "icerik_uretici", "max_items": 3000},
    {"query": "min_faves:500 lang:tr (takipçi OR viral OR algoritma OR reach OR engagement OR büyüme) -filter:retweets since:2023-01-01", "niche": "icerik_uretici", "max_items": 2000},

    # Spor
    {"query": "min_faves:1000 lang:tr (Galatasaray OR Fenerbahçe OR Beşiktaş OR Trabzonspor OR Süper Lig) -filter:retweets since:2023-01-01", "niche": "genel", "max_items": 3000},

    # Sağlık / Yaşam
    {"query": "min_faves:500 lang:tr (sağlık OR diyet OR spor OR fitness OR beslenme OR uyku) -filter:retweets since:2023-01-01", "niche": "kisisel_gelisim", "max_items": 2000},

    # ═══ İNGİLİZCE (destek) ═══
    
    # Genel viral EN
    {"query": "min_faves:5000 lang:en -filter:retweets since:2023-06-01", "niche": "genel", "max_items": 5000},
    
    # AI / Tech EN
    {"query": "min_faves:3000 lang:en (AI OR artificial intelligence OR LLM OR ChatGPT OR machine learning) -filter:retweets since:2023-01-01", "niche": "tech", "max_items": 5000},
    
    # Marketing / Business EN  
    {"query": "min_faves:3000 lang:en (marketing OR startup OR SaaS OR growth OR founder) -filter:retweets since:2023-01-01", "niche": "pazarlama", "max_items": 3000},
    
    # Personal dev EN
    {"query": "min_faves:3000 lang:en (productivity OR mindset OR success OR habits OR self-improvement) -filter:retweets since:2023-01-01", "niche": "kisisel_gelisim", "max_items": 3000},
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_env()

    apify_token = os.environ.get("APIFY_API_TOKEN", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").replace("https://", "").replace("http://", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not apify_token:
        sys.exit("❌ APIFY_API_TOKEN gerekli")

    tr_q = sum(1 for q in TOPIC_QUERIES if "lang:tr" in q["query"])
    en_q = sum(1 for q in TOPIC_QUERIES if "lang:en" in q["query"])
    print(f"🚀 Genişletilmiş Konu Bazlı Collection v2")
    print(f"   {len(TOPIC_QUERIES)} query (TR: {tr_q}, EN: {en_q})")
    print()

    if args.dry_run:
        for i, tq in enumerate(TOPIC_QUERIES):
            lang = "🇹🇷" if "lang:tr" in tq["query"] else "🇬🇧"
            print(f"   {i+1}. {lang} [{tq['niche']}] {tq['query'][:80]}...")
        return

    apify = ApifyClient(apify_token)
    sb = SupabaseClient(f"https://{supabase_url}", supabase_key)

    initial_count = sb.count_tweets()
    print(f"📊 Mevcut DB: {initial_count} tweet\n")

    total_saved = 0
    total_fetched = 0

    for i, tq in enumerate(TOPIC_QUERIES):
        query = tq["query"]
        niche = tq["niche"]
        max_items = tq["max_items"]
        lang_flag = "🇹🇷" if "lang:tr" in query else "🇬🇧"

        print(f"━━━ Query {i+1}/{len(TOPIC_QUERIES)} ━━━")
        print(f"   {lang_flag} [{niche}] {query[:90]}")

        try:
            run_data = apify.start_run([query], max_items)
            run_id = run_data["id"]
            print(f"   🏃 Run: {run_id}")

            result = apify.wait_for_run(run_id)
            status = result.get("status", "UNKNOWN")

            if status != "SUCCEEDED":
                print(f"   ❌ {status}")
                continue

            dataset_id = result.get("defaultDatasetId", "")
            items = apify.get_dataset_items(dataset_id)
            total_fetched += len(items)
            print(f"   📥 {len(items)} tweet çekildi")

            parsed = []
            for item in items:
                tweet = parse_apify_tweet(item, niche)
                if tweet:
                    parsed.append(tweet)

            print(f"   🔍 Filtre: {len(parsed)} geçti, {len(items) - len(parsed)} elendi")

            if parsed:
                saved = sb.upsert_tweets(parsed)
                total_saved += saved
                print(f"   💾 {saved} kaydedildi")

        except Exception as e:
            print(f"   ❌ Hata: {e}")

        if i < len(TOPIC_QUERIES) - 1:
            time.sleep(5)

    final_count = sb.count_tweets()
    print()
    print("=" * 60)
    print(f"📊 SONUÇ: {total_fetched} çekildi → {total_saved} kaydedildi")
    print(f"   DB: {initial_count} → {final_count} (+{final_count - initial_count})")
    print(f"🏁 Tamamlandı!")


if __name__ == "__main__":
    main()
