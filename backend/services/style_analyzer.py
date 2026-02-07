"""Style Analyzer v2 - Mikro-dilbilim + AI DNA sentezi"""
import re
import logging
import unicodedata
from typing import List, Dict, Any, Tuple
from collections import Counter

logger = logging.getLogger(__name__)

# Türkçe stop words (bigram analizinde filtre)
TR_STOP = {'bir', 'de', 've', 'bu', 'da', 'için', 'ile', 'o', 'ne', 'var', 'ben', 'sen', 'biz', 'siz', 'en', 'mi', 'mı', 'mu', 'mü', 'ki', 'ama', 'ya'}

# Emoji regex
EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U00002600-\U000026FF"
    "]+",
    flags=re.UNICODE
)

# İngilizce kelime tespiti (basit heuristic)
EN_COMMON = {'the', 'is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 'will',
             'can', 'could', 'would', 'should', 'may', 'might', 'shall', 'must',
             'not', 'no', 'yes', 'and', 'or', 'but', 'if', 'then', 'than', 'that',
             'this', 'with', 'from', 'for', 'about', 'into', 'your', 'my', 'our',
             'just', 'like', 'how', 'what', 'when', 'where', 'why', 'who', 'which',
             'new', 'now', 'get', 'got', 'make', 'know', 'think', 'take', 'come',
             'want', 'look', 'use', 'find', 'give', 'more', 'most', 'very', 'also',
             'way', 'out', 'up', 'all', 'been', 'only', 'other', 'some', 'time'}


class StyleAnalyzer:
    """Mikro-dilbilim motoru + AI stil DNA sentezi"""
    
    def analyze(self, tweets: List[Dict]) -> Dict[str, Any]:
        """Kapsamlı mikro-dilbilim analizi"""
        if not tweets:
            return {}
        
        contents = [t.get('content', '') for t in tweets if t.get('content')]
        # Link'leri çıkar (analizi kirletiyor)
        clean_contents = [re.sub(r'https?://\S+', '', c).strip() for c in contents]
        clean_contents = [c for c in clean_contents if len(c) > 10]
        
        if not clean_contents:
            return {"tweet_count": len(tweets)}
        
        fingerprint = {
            "tweet_count": len(tweets),
            "clean_tweet_count": len(clean_contents),
            
            # Temel metrikler
            "avg_length": self._avg_length(clean_contents),
            "length_distribution": self._length_distribution(clean_contents),
            "avg_engagement": self._avg_engagement(tweets),
            
            # Mikro-dilbilim
            "punctuation_dna": self._punctuation_dna(clean_contents),
            "capitalization": self._capitalization_analysis(clean_contents),
            "sentence_architecture": self._sentence_architecture(clean_contents),
            "language_mix": self._language_mix(clean_contents),
            "conjunction_profile": self._conjunction_profile(clean_contents),
            "line_structure": self._line_structure(clean_contents),
            "vocabulary": self._vocabulary_analysis(clean_contents),
            "emoji_strategy": self._emoji_strategy(clean_contents),
            
            # Eski uyumluluk
            "emoji_usage": self._emoji_count_avg(clean_contents),
            "question_ratio": self._ratio_with_char(clean_contents, '?'),
            "exclamation_ratio": self._ratio_with_char(clean_contents, '!'),
            "hashtag_usage": self._hashtag_usage(contents),  # Orijinal (link'li) içerik
            "link_usage": self._link_usage(contents),
            
            # Top tweets (frontend gösterimi için, prompt'a EKLENMİYOR)
            "example_tweets": self._top_tweets(tweets, n=10)
        }
        
        return fingerprint
    
    # ═══════════════════════════════════════════
    # NOKTALAMA DNA'SI
    # ═══════════════════════════════════════════
    def _punctuation_dna(self, contents: List[str]) -> Dict:
        """Noktalama kullanım parmak izi"""
        total_sentences = 0
        comma_count = 0
        ellipsis_count = 0  # ...
        exclamation_count = 0
        question_count = 0
        colon_count = 0
        dash_count = 0  # - veya —
        parenthesis_count = 0
        quote_count = 0
        
        for c in contents:
            sentences = [s.strip() for s in re.split(r'[.!?]+', c) if s.strip()]
            total_sentences += max(len(sentences), 1)
            comma_count += c.count(',')
            ellipsis_count += c.count('...') + c.count('…')
            exclamation_count += c.count('!')
            question_count += c.count('?')
            colon_count += c.count(':')
            dash_count += c.count(' - ') + c.count(' — ') + c.count(' – ')
            parenthesis_count += c.count('(')
            quote_count += c.count('"') + c.count('"') + c.count('"')
        
        n = len(contents)
        return {
            "comma_per_tweet": round(comma_count / n, 2),
            "ellipsis_per_tweet": round(ellipsis_count / n, 2),
            "exclamation_per_tweet": round(exclamation_count / n, 2),
            "question_per_tweet": round(question_count / n, 2),
            "colon_per_tweet": round(colon_count / n, 2),
            "dash_per_tweet": round(dash_count / n, 2),
            "parenthesis_pct": round(parenthesis_count / n * 100, 1),
            "quote_pct": round(quote_count / n * 100, 1),
            "comma_per_sentence": round(comma_count / max(total_sentences, 1), 2),
            "tweets_ending_with_period": round(sum(1 for c in contents if c.rstrip().endswith('.')) / n * 100, 1),
            "tweets_ending_with_exclamation": round(sum(1 for c in contents if c.rstrip().endswith('!')) / n * 100, 1),
            "tweets_ending_no_punct": round(sum(1 for c in contents if c.rstrip()[-1:].isalnum()) / n * 100, 1),
        }
    
    # ═══════════════════════════════════════════
    # BÜYÜK/KÜÇÜK HARF ANALİZİ
    # ═══════════════════════════════════════════
    def _capitalization_analysis(self, contents: List[str]) -> Dict:
        """Büyük/küçük harf tercihleri"""
        starts_upper = 0
        starts_lower = 0
        has_all_caps_word = 0  # BÜYÜK HARF vurgulama
        
        for c in contents:
            first_alpha = ''
            for ch in c:
                if ch.isalpha():
                    first_alpha = ch
                    break
            
            if first_alpha:
                if first_alpha.isupper():
                    starts_upper += 1
                else:
                    starts_lower += 1
            
            # ALL CAPS kelime var mı (3+ harfli)
            words = c.split()
            if any(w.isupper() and len(w) >= 3 and w.isalpha() for w in words):
                has_all_caps_word += 1
        
        n = len(contents)
        return {
            "starts_uppercase_pct": round(starts_upper / n * 100, 1),
            "starts_lowercase_pct": round(starts_lower / n * 100, 1),
            "uses_all_caps_emphasis_pct": round(has_all_caps_word / n * 100, 1),
        }
    
    # ═══════════════════════════════════════════
    # CÜMLE MİMARİSİ
    # ═══════════════════════════════════════════
    def _sentence_architecture(self, contents: List[str]) -> Dict:
        """Cümle yapısı ve uzunluk analizi"""
        all_sentence_lengths = []  # kelime bazlı
        inverted_count = 0  # devrik cümle (fiil sonda değil)
        total_sentences = 0
        short_sentences = 0  # 1-5 kelime
        long_sentences = 0   # 15+ kelime
        
        # Türkçe fiil sonekleri (basit heuristic)
        tr_verb_suffixes = ('yor', 'dı', 'di', 'du', 'dü', 'mış', 'miş', 'muş', 'müş',
                           'cak', 'cek', 'ır', 'ir', 'ur', 'ür', 'ar', 'er',
                           'malı', 'meli', 'lar', 'ler', 'dır', 'dir', 'tır', 'tir')
        
        for c in contents:
            sentences = [s.strip() for s in re.split(r'[.!?\n]+', c) if len(s.strip()) > 3]
            for sent in sentences:
                words = sent.split()
                if not words:
                    continue
                total_sentences += 1
                all_sentence_lengths.append(len(words))
                
                if len(words) <= 5:
                    short_sentences += 1
                elif len(words) >= 15:
                    long_sentences += 1
                
                # Devrik cümle kontrolü: son kelime fiil mi?
                last_word = re.sub(r'[^\wğüşıöçĞÜŞİÖÇ]', '', words[-1].lower())
                is_verb_ending = any(last_word.endswith(s) for s in tr_verb_suffixes)
                if not is_verb_ending and len(words) > 3:
                    inverted_count += 1
        
        if not all_sentence_lengths:
            return {"avg_words_per_sentence": 0}
        
        avg_words = sum(all_sentence_lengths) / len(all_sentence_lengths)
        
        return {
            "avg_words_per_sentence": round(avg_words, 1),
            "short_sentence_pct": round(short_sentences / max(total_sentences, 1) * 100, 1),
            "long_sentence_pct": round(long_sentences / max(total_sentences, 1) * 100, 1),
            "inverted_sentence_pct": round(inverted_count / max(total_sentences, 1) * 100, 1),
            "sentences_per_tweet": round(total_sentences / len(contents), 1),
        }
    
    # ═══════════════════════════════════════════
    # DİL KARIŞIMI
    # ═══════════════════════════════════════════
    def _language_mix(self, contents: List[str]) -> Dict:
        """Türkçe/İngilizce kelime oranı ve kullanım bağlamı"""
        total_words = 0
        en_words = 0
        en_word_examples = Counter()
        
        for c in contents:
            words = re.findall(r'\b[a-zA-ZğüşıöçĞÜŞİÖÇ]+\b', c)
            for w in words:
                if len(w) < 2:
                    continue
                total_words += 1
                w_lower = w.lower()
                # İngilizce kelime mi? (Latin alfabe + İngilizce sözlükte)
                is_ascii = all(ord(ch) < 128 for ch in w_lower)
                if is_ascii and (w_lower in EN_COMMON or (len(w) > 3 and not self._is_turkish_word(w_lower))):
                    en_words += 1
                    en_word_examples[w_lower] += 1
        
        en_pct = round(en_words / max(total_words, 1) * 100, 1)
        
        # En çok kullanılan İngilizce kelimeler (teknik mi günlük mü?)
        top_en = [w for w, _ in en_word_examples.most_common(10)]
        
        return {
            "english_word_pct": en_pct,
            "turkish_word_pct": round(100 - en_pct, 1),
            "top_english_words": top_en[:7],
            "language_style": "pure_turkish" if en_pct < 5 else "mostly_turkish" if en_pct < 15 else "mixed" if en_pct < 40 else "mostly_english"
        }
    
    def _is_turkish_word(self, word: str) -> bool:
        """Basit Türkçe kelime kontrolü (heuristic)"""
        tr_suffixes = ('lar', 'ler', 'lık', 'lik', 'luk', 'lük', 'dan', 'den',
                      'tan', 'ten', 'nın', 'nin', 'nun', 'nün', 'yla', 'yle',
                      'daki', 'deki', 'taki', 'teki')
        return any(word.endswith(s) for s in tr_suffixes)
    
    # ═══════════════════════════════════════════
    # BAĞLAÇ PROFİLİ
    # ═══════════════════════════════════════════
    def _conjunction_profile(self, contents: List[str]) -> Dict:
        """Bağlaç kullanım sıklığı ve tercihleri"""
        conjunctions = {
            'ama': 0, 'ancak': 0, 'fakat': 0, 'lakin': 0,
            'yani': 0, 'çünkü': 0, 'halbuki': 0,
            've': 0, 'veya': 0, 'ya da': 0,
            'hem': 0, 'ne': 0,
            'oysa': 0, 'üstelik': 0, 'ayrıca': 0,
            'but': 0, 'and': 0, 'or': 0, 'because': 0, 'however': 0,
        }
        
        all_text = ' '.join(contents).lower()
        total_words = len(all_text.split())
        
        for conj in conjunctions:
            conjunctions[conj] = len(re.findall(r'\b' + conj + r'\b', all_text))
        
        # En çok kullanılanlar
        top = sorted(conjunctions.items(), key=lambda x: x[1], reverse=True)
        top_used = [(k, v) for k, v in top if v > 0][:5]
        
        total_conj = sum(v for _, v in top_used)
        
        return {
            "conjunction_density": round(total_conj / max(total_words, 1) * 100, 2),
            "top_conjunctions": {k: v for k, v in top_used},
            "prefers_short_sentences": total_conj < len(contents) * 0.5,  # Az bağlaç = kısa cümle tercihi
        }
    
    # ═══════════════════════════════════════════
    # SATIR YAPISI
    # ═══════════════════════════════════════════
    def _line_structure(self, contents: List[str]) -> Dict:
        """Alt satır kullanım paterni"""
        multiline_count = 0
        total_newlines = 0
        avg_lines = []
        uses_bullet = 0
        uses_numbered = 0
        
        for c in contents:
            lines = c.split('\n')
            line_count = len(lines)
            avg_lines.append(line_count)
            
            if line_count > 1:
                multiline_count += 1
                total_newlines += line_count - 1
            
            if re.search(r'^[\-•·▪]', c, re.MULTILINE):
                uses_bullet += 1
            if re.search(r'^\d+[.)\-]', c, re.MULTILINE):
                uses_numbered += 1
        
        n = len(contents)
        return {
            "multiline_pct": round(multiline_count / n * 100, 1),
            "avg_lines_per_tweet": round(sum(avg_lines) / n, 1),
            "newlines_per_tweet": round(total_newlines / n, 1),
            "uses_bullet_pct": round(uses_bullet / n * 100, 1),
            "uses_numbered_pct": round(uses_numbered / n * 100, 1),
            "style": "single_block" if multiline_count / n < 0.2 else "line_breaker" if multiline_count / n < 0.5 else "heavy_formatter"
        }
    
    # ═══════════════════════════════════════════
    # KELİME ZENGİNLİĞİ
    # ═══════════════════════════════════════════
    def _vocabulary_analysis(self, contents: List[str]) -> Dict:
        """Kelime hazinesi zenginliği ve tekrar kalıpları"""
        all_words = []
        for c in contents:
            words = re.findall(r'\b[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,}\b', c.lower())
            all_words.extend(words)
        
        if not all_words:
            return {"richness": 0}
        
        unique_words = set(all_words)
        word_freq = Counter(all_words)
        
        # Stop word'leri çıkar
        meaningful_freq = {w: c for w, c in word_freq.items() if w not in TR_STOP and c >= 3}
        top_words = sorted(meaningful_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_words": len(all_words),
            "unique_words": len(unique_words),
            "richness": round(len(unique_words) / len(all_words) * 100, 1),  # type-token ratio
            "signature_words": [w for w, _ in top_words],
            "avg_word_length": round(sum(len(w) for w in all_words) / len(all_words), 1),
        }
    
    # ═══════════════════════════════════════════
    # EMOJİ STRATEJİSİ
    # ═══════════════════════════════════════════
    def _emoji_strategy(self, contents: List[str]) -> Dict:
        """Emoji kullanım paterni ve pozisyonu"""
        total_emoji = 0
        emoji_at_start = 0
        emoji_at_end = 0
        emoji_inline = 0
        tweets_with_emoji = 0
        emoji_counter = Counter()
        
        for c in contents:
            emojis = EMOJI_RE.findall(c)
            if emojis:
                tweets_with_emoji += 1
                total_emoji += len(emojis)
                
                for e in emojis:
                    for char in e:
                        emoji_counter[char] += 1
                
                # Pozisyon
                stripped = c.strip()
                first_emoji_pos = EMOJI_RE.search(stripped)
                if first_emoji_pos:
                    pos_ratio = first_emoji_pos.start() / max(len(stripped), 1)
                    if pos_ratio < 0.1:
                        emoji_at_start += 1
                    elif pos_ratio > 0.8:
                        emoji_at_end += 1
                    else:
                        emoji_inline += 1
        
        n = len(contents)
        top_emojis = [e for e, _ in emoji_counter.most_common(5)]
        
        return {
            "tweets_with_emoji_pct": round(tweets_with_emoji / n * 100, 1),
            "avg_per_tweet": round(total_emoji / n, 2),
            "position": {
                "start_pct": round(emoji_at_start / max(tweets_with_emoji, 1) * 100, 1),
                "end_pct": round(emoji_at_end / max(tweets_with_emoji, 1) * 100, 1),
                "inline_pct": round(emoji_inline / max(tweets_with_emoji, 1) * 100, 1),
            },
            "top_emojis": top_emojis,
            "style": "no_emoji" if tweets_with_emoji / n < 0.1 else "light" if total_emoji / n < 1 else "moderate" if total_emoji / n < 3 else "heavy"
        }
    
    # ═══════════════════════════════════════════
    # YARDIMCI METOTLAR
    # ═══════════════════════════════════════════
    def _avg_length(self, contents):
        return int(sum(len(c) for c in contents) / len(contents)) if contents else 0
    
    def _length_distribution(self, contents):
        if not contents: return {"short": 0, "medium": 0, "long": 0}
        n = len(contents)
        return {
            "short": round(sum(1 for c in contents if len(c) < 100) / n * 100, 1),
            "medium": round(sum(1 for c in contents if 100 <= len(c) < 200) / n * 100, 1),
            "long": round(sum(1 for c in contents if len(c) >= 200) / n * 100, 1),
        }
    
    def _emoji_count_avg(self, contents):
        if not contents: return 0
        return round(sum(len(EMOJI_RE.findall(c)) for c in contents) / len(contents), 2)
    
    def _ratio_with_char(self, contents, char):
        if not contents: return 0
        return round(sum(1 for c in contents if char in c) / len(contents) * 100, 1)
    
    def _hashtag_usage(self, contents):
        if not contents: return 0
        return round(sum(len(re.findall(r'#\w+', c)) for c in contents) / len(contents), 2)
    
    def _link_usage(self, contents):
        if not contents: return 0
        return round(sum(1 for c in contents if 'http' in c or 't.co' in c) / len(contents) * 100, 1)
    
    def _avg_engagement(self, tweets):
        if not tweets: return {"likes": 0, "retweets": 0, "replies": 0}
        n = len(tweets)
        return {
            "likes": round(sum(t.get('likes', 0) for t in tweets) / n, 1),
            "retweets": round(sum(t.get('retweets', 0) for t in tweets) / n, 1),
            "replies": round(sum(t.get('replies', 0) for t in tweets) / n, 1),
        }
    
    def _top_tweets(self, tweets, n=10):
        sorted_t = sorted(tweets, key=lambda t: t.get('likes', 0) + t.get('retweets', 0) * 2, reverse=True)
        return [{"content": t.get('content', ''), "likes": t.get('likes', 0), "retweets": t.get('retweets', 0)} for t in sorted_t[:n]]
    
    # ═══════════════════════════════════════════
    # STİL PROMPT ÜRETİMİ
    # ═══════════════════════════════════════════
    def generate_style_prompt(self, fingerprint: Dict) -> str:
        """Mikro-dilbilim verileri + AI DNA'sından stil prompt'u üret"""
        if not fingerprint:
            return ""
        
        parts = []
        
        # AI DNA (varsa, ana kaynak)
        ai_analysis = fingerprint.get('ai_analysis', '')
        if ai_analysis:
            parts.append("## STİL DNA (AI Analizi)\n" + ai_analysis)
        
        # Mikro kurallar (somut veriler)
        micro_rules = self._build_micro_rules(fingerprint)
        if micro_rules:
            parts.append("\n## MİKRO KURALLAR (Veri Bazlı)\n" + micro_rules)
        
        return '\n'.join(parts)
    
    def _build_micro_rules(self, fp: Dict) -> str:
        """Fingerprint verilerinden somut mikro kurallar oluştur"""
        rules = []
        
        # Noktalama
        punct = fp.get('punctuation_dna', {})
        if punct:
            comma = punct.get('comma_per_tweet', 0)
            if comma < 1:
                rules.append(f"- Virgül az kullan (tweet başına ~{comma})")
            elif comma > 3:
                rules.append(f"- Virgülü bol kullan (tweet başına ~{comma})")
            
            ellipsis = punct.get('ellipsis_per_tweet', 0)
            if ellipsis > 0.3:
                rules.append(f"- Üç nokta (...) kullan (tweet başına ~{ellipsis:.1f})")
            
            no_punct = punct.get('tweets_ending_no_punct', 0)
            if no_punct > 40:
                rules.append(f"- Tweet'lerin %{no_punct:.0f}'ı noktalama işareti olmadan bitiyor, sen de öyle yap")
        
        # Büyük/küçük harf
        cap = fp.get('capitalization', {})
        if cap:
            lower_start = cap.get('starts_lowercase_pct', 0)
            if lower_start > 40:
                rules.append(f"- Küçük harfle başla (tweet'lerin %{lower_start:.0f}'ı küçük harfle)")
            caps_emphasis = cap.get('uses_all_caps_emphasis_pct', 0)
            if caps_emphasis > 15:
                rules.append(f"- BÜYÜK HARF ile vurgulama yap (%{caps_emphasis:.0f} tweet'te var)")
        
        # Cümle yapısı
        sent = fp.get('sentence_architecture', {})
        if sent:
            avg_w = sent.get('avg_words_per_sentence', 0)
            if avg_w > 0:
                rules.append(f"- Cümle başına ortalama {avg_w:.0f} kelime kullan")
            short_pct = sent.get('short_sentence_pct', 0)
            if short_pct > 40:
                rules.append(f"- Kısa cümleler tercih et (%{short_pct:.0f} cümle 5 kelime altı)")
            inverted = sent.get('inverted_sentence_pct', 0)
            if inverted > 30:
                rules.append(f"- Devrik cümle kullan (%{inverted:.0f} cümle devrik)")
        
        # Dil karışımı
        lang = fp.get('language_mix', {})
        if lang:
            en_pct = lang.get('english_word_pct', 0)
            style = lang.get('language_style', 'mixed')
            if style == 'pure_turkish':
                rules.append("- Saf Türkçe yaz, İngilizce kelime kullanma")
            elif style == 'mostly_turkish':
                rules.append(f"- Ağırlıklı Türkçe yaz, İngilizce sadece teknik terimlerde (%{en_pct:.0f})")
            elif style == 'mixed':
                rules.append(f"- Türkçe-İngilizce karışık yaz (%{en_pct:.0f} İngilizce)")
            elif style == 'mostly_english':
                rules.append(f"- Ağırlıklı İngilizce yaz (%{en_pct:.0f} İngilizce)")
        
        # Satır yapısı
        line = fp.get('line_structure', {})
        if line:
            multiline = line.get('multiline_pct', 0)
            if multiline > 50:
                avg_nl = line.get('newlines_per_tweet', 0)
                rules.append(f"- Alt satırla böl (tweet başına ~{avg_nl:.1f} satır kırılması)")
            elif multiline < 15:
                rules.append("- Tek blok halinde yaz, alt satır kullanma")
        
        # Emoji
        emoji = fp.get('emoji_strategy', {})
        if emoji:
            style = emoji.get('style', 'no_emoji')
            if style == 'no_emoji':
                rules.append("- Emoji KULLANMA")
            elif style == 'light':
                top = emoji.get('top_emojis', [])
                rules.append(f"- Emoji az kullan, tercih: {' '.join(top[:3])}" if top else "- Emoji az kullan")
            elif style in ('moderate', 'heavy'):
                top = emoji.get('top_emojis', [])
                pos = emoji.get('position', {})
                pos_hint = "başta" if pos.get('start_pct', 0) > 40 else "sonda" if pos.get('end_pct', 0) > 40 else "arada"
                rules.append(f"- Emoji kullan ({pos_hint}), tercih: {' '.join(top[:4])}" if top else "- Emoji kullan")
        
        # Bağlaç
        conj = fp.get('conjunction_profile', {})
        if conj and conj.get('prefers_short_sentences'):
            rules.append("- Bağlaç yerine kısa cümleler tercih et")
        
        return '\n'.join(rules) if rules else ""
    
    # ═══════════════════════════════════════════
    # AI DERİN ANALİZ
    # ═══════════════════════════════════════════
    def deep_analyze_with_ai(self, tweets: List[Dict], openai_client) -> str:
        """
        GPT-4o ile derinlemesine stil analizi.
        Mikro-dilbilim verilerini de AI'a vererek daha isabetli analiz çıkarır.
        """
        if not tweets or not openai_client:
            return ""
        
        # Önce mikro analizi çalıştır
        micro = self.analyze(tweets)
        
        # Mikro veri özeti
        micro_summary = self._micro_summary_for_ai(micro)
        
        # Top tweet'leri hazırla (engagement bazlı)
        sorted_tweets = sorted(tweets, key=lambda t: t.get('likes', 0) + t.get('retweets', 0) * 2, reverse=True)
        top_tweets = sorted_tweets[:30]
        tweet_texts = []
        for i, t in enumerate(top_tweets, 1):
            content = t.get('content', '')
            likes = t.get('likes', 0)
            tweet_texts.append(f"[{i}] ({likes}❤) {content}")
        tweets_block = '\n\n'.join(tweet_texts)
        
        analysis_prompt = f"""Aşağıdaki tweet'leri ve mikro-dilbilim verilerini analiz et. Bu kişinin yazım tarzının SOYUT DNA'sını çıkar.

⚠️ KRİTİK KURALLAR:
- Asla tweet'lerden alıntı yapma, asla örnek cümle verme
- Amacımız tarzı KOPYALAMAK değil, ÖZÜMSEMEK
- Somut veriler zaten mevcut, sen SOYUT prensipler çıkar

📊 MİKRO-DİLBİLİM VERİLERİ:
{micro_summary}

📝 TWEET'LER:
{tweets_block}

Şu başlıklar altında SOYUT analiz yap:

1. **ZİHİNSEL MODEL**: Bu kişi dünyaya nasıl bakıyor? Bilgiyi nasıl konumlandırıyor? Okuyucuyla ilişkisi ne?

2. **RİTİM ve NEFES**: Cümle ritmi nasıl? Duraklamaları nerede yapıyor? Tempo hızlı mı yavaş mı? Kısa-uzun alternasyonu var mı?

3. **SES ve KİŞİLİK**: Bu yazı bir insanın sesi. O ses nasıl? Güvenli mi tedirgin mi? Sakin mi ateşli mi? Mesafeli mi samimi mi?

4. **BİLGİ MİMARİSİ**: Bilgiyi nasıl paketliyor? Sonuçtan mı başlıyor bağlamdan mı? Keşfettiriyor mu direkt veriyor mu?

5. **AÇILIŞ PSİKOLOJİSİ**: Okuyucuyu hangi psikolojik tetikle yakalıyor? (Şaşırtma, merak, otorite, provokasyon, soru?) Kalıp verme, stratejiyi tanımla.

6. **AYIRT EDİCİ DNA**: Bu kişinin yazımını 1000 kişi arasından ayırt ettirecek 3 soyut özellik.

7. **STİL KODU**: Bu tarzda yazmak için 7 maddelik SOYUT prensip listesi. Her kural bir zihinsel durum ve yaklaşım olsun. Asla "şu kelimeyi kullan" veya "şöyle yaz" deme.

Türkçe yaz. Kısa ve keskin ol, gereksiz açıklama yapma."""
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sen bir dilbilimci ve sosyal medya yazım tarzı analistisin. Somut veriler sana veriliyor, sen soyut prensipler çıkarıyorsun. Kısa ve keskin yaz."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.4,
                max_tokens=2000
            )
            
            analysis = response.choices[0].message.content
            logger.info(f"AI style analysis completed ({len(analysis)} chars)")
            return analysis
            
        except Exception as e:
            logger.error(f"AI style analysis failed: {e}")
            return ""
    
    def _micro_summary_for_ai(self, fp: Dict) -> str:
        """Mikro verileri AI için okunabilir formata çevir"""
        lines = []
        
        punct = fp.get('punctuation_dna', {})
        if punct:
            lines.append(f"Noktalama: virgül/tweet={punct.get('comma_per_tweet',0)}, üç nokta/tweet={punct.get('ellipsis_per_tweet',0)}, soru/tweet={punct.get('question_per_tweet',0)}, ünlem/tweet={punct.get('exclamation_per_tweet',0)}")
            lines.append(f"Bitiş: noktalı=%{punct.get('tweets_ending_with_period',0)}, ünlemli=%{punct.get('tweets_ending_with_exclamation',0)}, işaretsiz=%{punct.get('tweets_ending_no_punct',0)}")
        
        cap = fp.get('capitalization', {})
        if cap:
            lines.append(f"Harf: büyükle başlama=%{cap.get('starts_uppercase_pct',0)}, küçükle=%{cap.get('starts_lowercase_pct',0)}, CAPS vurgu=%{cap.get('uses_all_caps_emphasis_pct',0)}")
        
        sent = fp.get('sentence_architecture', {})
        if sent:
            lines.append(f"Cümle: ort kelime={sent.get('avg_words_per_sentence',0)}, kısa=%{sent.get('short_sentence_pct',0)}, uzun=%{sent.get('long_sentence_pct',0)}, devrik=%{sent.get('inverted_sentence_pct',0)}, cümle/tweet={sent.get('sentences_per_tweet',0)}")
        
        lang = fp.get('language_mix', {})
        if lang:
            lines.append(f"Dil: İngilizce=%{lang.get('english_word_pct',0)}, stil={lang.get('language_style','')}, top EN kelimeler={lang.get('top_english_words',[])}")
        
        line = fp.get('line_structure', {})
        if line:
            lines.append(f"Satır: çoklu satır=%{line.get('multiline_pct',0)}, ort satır/tweet={line.get('avg_lines_per_tweet',0)}, stil={line.get('style','')}")
        
        vocab = fp.get('vocabulary', {})
        if vocab:
            lines.append(f"Kelime: zenginlik=%{vocab.get('richness',0)}, ort uzunluk={vocab.get('avg_word_length',0)}, imza kelimeler={vocab.get('signature_words',[])}")
        
        emoji = fp.get('emoji_strategy', {})
        if emoji:
            lines.append(f"Emoji: stil={emoji.get('style','')}, ort/tweet={emoji.get('avg_per_tweet',0)}, top={emoji.get('top_emojis',[])}")
        
        conj = fp.get('conjunction_profile', {})
        if conj:
            lines.append(f"Bağlaç: yoğunluk=%{conj.get('conjunction_density',0)}, kısa cümle tercihi={conj.get('prefers_short_sentences',False)}, top={list(conj.get('top_conjunctions',{}).keys())}")
        
        return '\n'.join(lines)
    
    def deep_analyze_with_ai(self, tweets: List[Dict], openai_client) -> str:
        """
        GPT-4o ile derinlemesine stil analizi.
        Tweet'leri AI'a gönderip detaylı yazım tarzı raporu çıkarır.
        """
        if not tweets or not openai_client:
            return ""
        
        # En iyi tweet'leri seç (engagement bazlı)
        sorted_tweets = sorted(
            tweets,
            key=lambda t: t.get('likes', 0) + t.get('retweets', 0) * 2,
            reverse=True
        )
        
        # Top 30 tweet'i al (token limiti için)
        top_tweets = sorted_tweets[:30]
        tweet_texts = []
        for i, t in enumerate(top_tweets, 1):
            content = t.get('content', '')
            likes = t.get('likes', 0)
            rts = t.get('retweets', 0)
            tweet_texts.append(f"[{i}] ({likes}❤ {rts}🔁) {content}")
        
        tweets_block = '\n\n'.join(tweet_texts)
        
        analysis_prompt = f"""Aşağıdaki tweet'leri analiz et ve bu kişinin yazım tarzının SOYUT DNA'sını çıkar.

⚠️ KRİTİK KURAL: Asla örnek tweet verme, asla tweet'lerden alıntı yapma, asla spesifik cümle önerme.
Amacımız bu kişinin tarzını KOPYALAMAK değil, ÖZÜMSEMEK. Soyut prensipler ve kurallar çıkar.

TWEET'LER:
{tweets_block}

Şu başlıklar altında SOYUT analiz yap:

1. **ZİHİNSEL MODEL**: Bu kişi dünyaya nasıl bakıyor? Bilgi paylaşırken hangi perspektiften yaklaşıyor? Okuyucuyla ilişkisi nasıl (öğretmen-öğrenci mi, arkadaş mı, mentor mu)?

2. **RİTİM ve TEMPO**: Cümlelerin ritmi nasıl? Kısa-uzun cümle alternasyonu var mı? Nefes noktaları nerede? Alt satır kullanım mantığı ne?

3. **DİL KİMLİĞİ**: Türkçe-İngilizce oranı ne? Teknik terim kullanım biçimi? Konuşma dili mi yazı dili mi? Argo veya jargon seviyesi?

4. **DUYGUSAL İMZA**: Heyecan, güven, merak, otorite gibi duygulardan hangilerini yayıyor? Duygusal yoğunluk seviyesi ne? Abartı mı minimal mi?

5. **AÇILIŞ MATRİSİ**: Tweet'lere giriş mantığı ne? (Kalıp verme, soyut stratejiyi tanımla) Okuyucuyu hangi psikolojik tetikle yakalıyor?

6. **YAPI ARKETİPLERİ**: Hangi yapısal formları tercih ediyor? (tek blok, listeli, parçalı, diyalog tarzı vs.) Paragraf geçiş mantığı ne?

7. **BİLGİ SUNUMU**: Bilgiyi nasıl paketliyor? Direkt mi veriyor, keşfettiriyor mu? Bağlam mı kuruyor yoksa sonuca mı atlıyor?

8. **AYIRT EDİCİ DNA**: Bu kişinin yazımını 1000 kişi arasından ayırt ettirecek 3 soyut özellik ne? (Spesifik kelime veya cümle verme, SOYUT özellik tanımla)

9. **STİL KODU**: Bu tarzda yazmak için uyulması gereken 7 maddelik SOYUT kural listesi. Her kural bir prensip olsun, asla "şu kelimeyi kullan" veya "şöyle başla" deme. "Hangi zihinsel durumda yaz" seviyesinde talimat ver.

SADECE analiz yaz, başka açıklama ekleme. Türkçe yaz. Asla tweet'lerden doğrudan alıntı yapma."""
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sen bir sosyal medya yazım tarzı analistisin. Detaylı ve pratik analizler yaparsın."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            analysis = response.choices[0].message.content
            logger.info(f"AI style analysis completed ({len(analysis)} chars)")
            return analysis
            
        except Exception as e:
            logger.error(f"AI style analysis failed: {e}")
            return ""


# Singleton
analyzer = StyleAnalyzer()
