#!/bin/bash
# Tüm niche'leri sırayla çalıştır — hedef: her niche'ten min 100 viral tweet
# Dual cookie rotation aktif, 15dk rate limit arası

set -e
cd /opt/contentfactory/backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)

LOG_DIR="/tmp/viral_collect"
mkdir -p "$LOG_DIR"

echo "$(date) - Viral Tweet Collection v3 (hedef: 100+/niche)"
echo "============================================="

# Haber: tekrar tara, daha derin (10 sayfa) + daha düşük eşik (20 like)
echo ""
echo "$(date) - 🚀 haber niche'i (derin tarama, min 20 like)..."
python3 -u scripts/collect_viral_tweets.py \
    --niche haber --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/haber_deep.log"
echo "$(date) - ✅ haber tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Kripto
echo ""
echo "$(date) - 🚀 kripto niche'i..."
python3 -u scripts/collect_viral_tweets.py \
    --niche kripto --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/kripto.log"
echo "$(date) - ✅ kripto tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Mizah
echo ""
echo "$(date) - 🚀 mizah niche'i..."
python3 -u scripts/collect_viral_tweets.py \
    --niche mizah --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/mizah.log"
echo "$(date) - ✅ mizah tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# İçerik üretici
echo ""
echo "$(date) - 🚀 icerik_uretici niche'i..."
python3 -u scripts/collect_viral_tweets.py \
    --niche icerik_uretici --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/icerik_uretici.log"
echo "$(date) - ✅ icerik_uretici tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Finans
echo ""
echo "$(date) - 🚀 finans niche'i..."
python3 -u scripts/collect_viral_tweets.py \
    --niche finans --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/finans.log"
echo "$(date) - ✅ finans tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Tech: tekrar tara (yeni tweet'ler + pagination ile daha derin)
echo ""
echo "$(date) - 🚀 tech niche'i (derin tekrar tarama)..."
python3 -u scripts/collect_viral_tweets.py \
    --niche tech --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/tech_deep.log"
echo "$(date) - ✅ tech tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Pazarlama: tekrar tara (daha derin)
echo ""
echo "$(date) - 🚀 pazarlama niche'i (derin tekrar tarama)..."
python3 -u scripts/collect_viral_tweets.py \
    --niche pazarlama --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/pazarlama_deep.log"
echo "$(date) - ✅ pazarlama tamamlandı"
echo "$(date) - ⏳ 15dk bekleniyor..."
sleep 900

# Kişisel gelişim: tekrar tara
echo ""
echo "$(date) - 🚀 kisisel_gelisim niche'i (derin tekrar tarama)..."
python3 -u scripts/collect_viral_tweets.py \
    --niche kisisel_gelisim --min-likes 1000 --max-pages 10 \
    2>&1 | tee "$LOG_DIR/kisisel_gelisim_deep.log"
echo "$(date) - ✅ kisisel_gelisim tamamlandı"

echo ""
echo "$(date) - 🎉 TÜM NİCHE'LER TAMAMLANDI"
echo "============================================="

# Supabase'den niche bazlı sayılar
python3 -c "
import httpx, os
url = os.environ['SUPABASE_URL'] + '/rest/v1/viral_tweets'
key = os.environ['SUPABASE_SERVICE_KEY']
headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
r = httpx.get(url + '?select=niche', params={'limit': 50000}, headers=headers)
data = r.json()
by_niche = {}
for d in data:
    n = d.get('niche', '?')
    by_niche[n] = by_niche.get(n, 0) + 1
print(f'\nToplam: {len(data)} viral tweet')
for n, c in sorted(by_niche.items(), key=lambda x: -x[1]):
    status = '✅' if c >= 100 else '⚠️'
    print(f'  {status} {n}: {c}')
"
