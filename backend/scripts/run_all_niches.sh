#!/bin/bash
# Tüm niche'leri sırayla çalıştır (rate limit'e dikkat)
# Her niche arasında 10 dakika bekleme

set -e
cd /opt/contentfactory/backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)

NICHES=("haber" "kripto" "mizah" "icerik_uretici" "finans")
LOG_DIR="/tmp/viral_collect"
mkdir -p "$LOG_DIR"

echo "$(date) - Viral Tweet Collection başlıyor (${#NICHES[@]} niche)"
echo "============================================="

for niche in "${NICHES[@]}"; do
    echo ""
    echo "$(date) - 🚀 $niche niche'i başlıyor..."
    python3 -u scripts/collect_viral_tweets.py \
        --niche "$niche" \
        --min-likes 30 \
        --max-pages 3 \
        2>&1 | tee "$LOG_DIR/${niche}.log"
    
    echo "$(date) - ✅ $niche tamamlandı"
    
    # Son niche değilse 10 dakika bekle (rate limit soğuması)
    if [ "$niche" != "${NICHES[-1]}" ]; then
        echo "$(date) - ⏳ Rate limit soğuması: 10 dakika bekleniyor..."
        sleep 600
    fi
done

echo ""
echo "$(date) - 🎉 TÜM NİCHE'LER TAMAMLANDI"
echo "============================================="

# Supabase'den toplam sayı
python3 -c "
import httpx, os
url = os.environ['SUPABASE_URL'] + '/rest/v1/viral_tweets'
key = os.environ['SUPABASE_SERVICE_KEY']
headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
r = httpx.get(url + '?select=niche', params={'limit': 10000}, headers=headers)
data = r.json()
by_niche = {}
for d in data:
    n = d.get('niche', '?')
    by_niche[n] = by_niche.get(n, 0) + 1
print(f'\nToplam: {len(data)} viral tweet')
for n, c in sorted(by_niche.items(), key=lambda x: -x[1]):
    print(f'  {n}: {c}')
"
