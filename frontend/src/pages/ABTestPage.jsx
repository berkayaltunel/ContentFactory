import { useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RotateCcw, Check, Trophy, ChevronDown, ChevronUp } from "lucide-react";

// ══════════════════════════════════════════
// AYARLAR (XAIModule ile aynı)
// ══════════════════════════════════════════

const PLATFORMS = [
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "blog", label: "Blog" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
];

// X platformu v2 ayarları
const ETKILER = [
  { id: "patlassin", label: "Patlasın", desc: "Viral, maximum erişim" },
  { id: "konustursun", label: "Konuştursun", desc: "Tartışma başlatsın" },
  { id: "ogretsin", label: "Öğretsin", desc: "Bilgi versin, kaydedilsin" },
  { id: "iz_biraksin", label: "İz Bıraksın", desc: "Düşündürsün" },
  { id: "shitpost", label: "Shitpost", desc: "Komik, ironik, absürt" },
];

const KARAKTERLER = [
  { id: "uzman", label: "Uzman" },
  { id: "otorite", label: "Otorite" },
  { id: "iceriden", label: "İçeriden" },
  { id: "mentalist", label: "Mentalist" },
  { id: "haberci", label: "Haberci" },
];

const YAPILAR = [
  { id: "dogal", label: "Doğal" },
  { id: "kurgulu", label: "Kurgulu" },
  { id: "cesur", label: "Cesur" },
];

const ACILISLAR = [
  { id: "otomatik", label: "Otomatik" },
  { id: "zit_gorus", label: "Zıt Görüş" },
  { id: "merak", label: "Merak" },
  { id: "hikaye", label: "Hikaye" },
  { id: "tartisma", label: "Tartışma" },
];

const BITISLER = [
  { id: "otomatik", label: "Otomatik" },
  { id: "soru", label: "Soru" },
  { id: "dogal", label: "Doğal" },
];

const DERINLIKLER = [
  { id: "standart", label: "Standart" },
  { id: "karsi_gorus", label: "Karşıt Görüş" },
  { id: "perde_arkasi", label: "Perde Arkası" },
  { id: "uzmanlik", label: "Uzmanlık" },
];

const UZUNLUKLAR = [
  { id: "micro", label: "Micro" },
  { id: "punch", label: "Punch" },
  { id: "spark", label: "Spark" },
  { id: "storm", label: "Storm" },
  { id: "thread", label: "Thread" },
];

// Diğer platformlar (v1 ayarları)
const PERSONAS = ["saf", "otorite", "insider", "mentalist", "haber"];
const TONES = ["natural", "raw", "polished", "unhinged"];
const LENGTHS = ["micro", "punch", "spark", "storm", "thread"];
const KNOWLEDGE_MODES = [
  { id: null, label: "Yok" },
  { id: "insider", label: "Insider" },
  { id: "contrarian", label: "Contrarian" },
  { id: "hidden", label: "Hidden" },
  { id: "expert", label: "Expert" },
];
const LANGUAGES = ["auto", "tr", "en"];

const SMART_DEFAULTS = {
  patlassin:   { karakter: "uzman",    yapi: "kurgulu", uzunluk: "punch", acilis: "otomatik", bitis: "otomatik", derinlik: "standart" },
  konustursun: { karakter: "iceriden", yapi: "dogal",   uzunluk: "spark", acilis: "tartisma", bitis: "soru",     derinlik: "karsi_gorus" },
  ogretsin:    { karakter: "otorite",  yapi: "kurgulu", uzunluk: "punch", acilis: "merak",    bitis: "dogal",    derinlik: "uzmanlik" },
  iz_biraksin: { karakter: "uzman",    yapi: "dogal",   uzunluk: "spark", acilis: "hikaye",   bitis: "dogal",    derinlik: "standart" },
  shitpost:    { karakter: "haberci",  yapi: "dogal",   uzunluk: "micro", acilis: "otomatik", bitis: "dogal",    derinlik: "standart" },
};

// ══════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════

function PillGroup({ items, value, onChange, label }) {
  return (
    <div>
      {label && <div className="text-xs text-white/30 mb-1.5">{label}</div>}
      <div className="flex gap-1.5 flex-wrap">
        {items.map((item) => {
          const id = typeof item === "string" ? item : item.id;
          const lbl = typeof item === "string" ? item : item.label;
          return (
            <button
              key={id ?? "null"}
              onClick={() => onChange(id)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                value === id
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VariantTabs({ variants, activeIdx, onSelect }) {
  if (!variants || variants.length <= 1) return null;
  return (
    <div className="flex gap-1 mb-3">
      {variants.map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            i === activeIdx ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:text-white/70"
          }`}
        >
          #{i + 1}
        </button>
      ))}
    </div>
  );
}

function EngineColumn({ label, variants, loading, selected, onSelect, revealed, engineName }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentVariant = variants?.[activeIdx];

  return (
    <Card className={`flex-1 p-5 bg-[#111] border transition-colors ${
      selected ? "border-green-500/60 bg-green-500/5" : "border-white/10"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          {revealed && (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">
              {engineName}
            </Badge>
          )}
        </div>
        {selected && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Seçildi ✓</Badge>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Üretiliyor...
        </div>
      ) : variants ? (
        <>
          <VariantTabs variants={variants} activeIdx={activeIdx} onSelect={setActiveIdx} />
          <div className="bg-[#0A0A0A] rounded-lg p-4 min-h-[120px] text-white/90 text-sm leading-relaxed whitespace-pre-wrap mb-4">
            {currentVariant || "(boş)"}
          </div>
          <Button
            variant={selected ? "default" : "outline"}
            className={`w-full ${selected ? "bg-green-600 hover:bg-green-700 text-white" : "border-white/20 text-white hover:bg-white/10"}`}
            onClick={onSelect}
          >
            <Check className="w-4 h-4 mr-2" />
            Bu Daha İyi
          </Button>
        </>
      ) : (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm">
          Henüz üretilmedi
        </div>
      )}
    </Card>
  );
}

// localStorage sonuçlar
function saveResult(result) {
  try {
    const existing = JSON.parse(localStorage.getItem("ab_test_results") || "[]");
    existing.push(result);
    localStorage.setItem("ab_test_results", JSON.stringify(existing));
  } catch (e) { /* ignore */ }
}

function getResults() {
  try { return JSON.parse(localStorage.getItem("ab_test_results") || "[]"); } catch { return []; }
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════

export default function ABTestPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("x");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // X platformu ayarları
  const [etki, setEtki] = useState("patlassin");
  const [karakter, setKarakter] = useState("uzman");
  const [yapi, setYapi] = useState("kurgulu");
  const [uzunluk, setUzunluk] = useState("punch");
  const [acilis, setAcilis] = useState("otomatik");
  const [bitis, setBitis] = useState("otomatik");
  const [derinlik, setDerinlik] = useState("standart");
  const [isUltra, setIsUltra] = useState(false);

  // Diğer platform ayarları
  const [persona, setPersona] = useState("otorite");
  const [tone, setTone] = useState("natural");
  const [length, setLength] = useState("punch");
  const [knowledge, setKnowledge] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [isApex, setIsApex] = useState(false);
  const [variants, setVariants] = useState(3);

  const [colA, setColA] = useState({ loading: false, variants: null });
  const [colB, setColB] = useState({ loading: false, variants: null });
  const [winner, setWinner] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const orderRef = useRef({ a: "v2", b: "v3" });

  const isX = platform === "x";

  // Etki değişince smart defaults uygula
  const handleEtkiChange = (newEtki) => {
    setEtki(newEtki);
    const defaults = SMART_DEFAULTS[newEtki];
    if (defaults) {
      setKarakter(defaults.karakter);
      setYapi(defaults.yapi);
      setUzunluk(defaults.uzunluk);
      setAcilis(defaults.acilis);
      setBitis(defaults.bitis);
      setDerinlik(defaults.derinlik);
    }
  };

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setWinner(null);
    setRevealed(false);
    setColA({ loading: true, variants: null });
    setColB({ loading: true, variants: null });

    // Randomize order
    const flip = Math.random() > 0.5;
    orderRef.current = flip ? { a: "v3", b: "v2" } : { a: "v2", b: "v3" };

    const fetchEngine = async (engine) => {
      try {
        let endpoint, body;

        if (isX) {
          // X platformu: v2 endpoint + engine param
          endpoint = `/v2/generate/tweet?engine=${engine}`;
          body = {
            topic: topic.trim(),
            etki,
            karakter,
            yapi,
            uzunluk,
            acilis,
            bitis,
            derinlik,
            language,
            is_ultra: isUltra,
            variants,
          };
        } else {
          // Diğer platformlar: v1 endpoint + engine param
          const endpointMap = {
            linkedin: "/generate/linkedin",
            instagram: "/generate/instagram/caption",
            blog: "/generate/blog/full",
            youtube: "/generate/tweet",
            tiktok: "/generate/tiktok/caption",
          };
          endpoint = `${endpointMap[platform] || "/generate/tweet"}?engine=${engine}`;
          body = {
            topic: topic.trim(),
            persona,
            tone,
            length,
            language,
            knowledge,
            is_apex: isApex,
            variants,
          };
        }

        const res = await api.post(endpoint, body);
        const data = res.data;
        if (data.variants && Array.isArray(data.variants)) {
          return data.variants.map((v) => (typeof v === "string" ? v : v.text || v.content || JSON.stringify(v)));
        }
        if (Array.isArray(data)) return data.map(String);
        if (data.content) return [data.content];
        if (data.text) return [data.text];
        return [JSON.stringify(data, null, 2)];
      } catch (err) {
        return [`Hata: ${err.response?.data?.detail || err.message}`];
      }
    };

    const [rA, rB] = await Promise.allSettled([
      fetchEngine(orderRef.current.a),
      fetchEngine(orderRef.current.b),
    ]);
    setColA({ loading: false, variants: rA.status === "fulfilled" ? rA.value : [`Hata: ${rA.reason}`] });
    setColB({ loading: false, variants: rB.status === "fulfilled" ? rB.value : [`Hata: ${rB.reason}`] });
  }, [topic, platform, isX, etki, karakter, yapi, uzunluk, acilis, bitis, derinlik, isUltra, persona, tone, length, knowledge, isApex, language, variants]);

  const selectWinner = (col) => {
    setWinner(col);
    setRevealed(true);

    const winnerEngine = orderRef.current[col];
    const result = {
      timestamp: new Date().toISOString(),
      topic,
      platform,
      winner: winnerEngine,
      loser: col === "a" ? orderRef.current.b : orderRef.current.a,
      settings: isX
        ? { etki, karakter, yapi, uzunluk, acilis, bitis, derinlik, isUltra }
        : { persona, tone, length, knowledge, isApex },
    };

    saveResult(result);
    console.log("[AB Blind Test]", result);
  };

  const results = getResults();
  const v2Wins = results.filter(r => r.winner === "v2").length;
  const v3Wins = results.filter(r => r.winner === "v3").length;
  const totalTests = results.length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">🧪 Blind A/B Test</h1>
            <p className="text-white/40 text-sm">Hangisi daha iyi? Seçene kadar hangisi hangisi bilinmiyor.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="border-white/20 text-white/60 hover:text-white hover:bg-white/10"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Skorboard
          </Button>
        </div>

        {/* Scoreboard */}
        {showStats && (
          <Card className="p-4 mb-6 bg-[#111] border-white/10">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalTests}</div>
                <div className="text-xs text-white/40">Toplam</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{v2Wins}</div>
                <div className="text-xs text-white/40">v2</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-400">{v3Wins}</div>
                <div className="text-xs text-white/40">v3</div>
              </div>
              {totalTests > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex-1">
                    <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                      <div className="bg-blue-500 transition-all" style={{ width: `${(v2Wins / totalTests) * 100}%` }} />
                      <div className="bg-violet-500 transition-all" style={{ width: `${(v3Wins / totalTests) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-white/40">
                      <span>v2 {Math.round((v2Wins / totalTests) * 100)}%</span>
                      <span>v3 {Math.round((v3Wins / totalTests) * 100)}%</span>
                    </div>
                  </div>
                </>
              )}
              {totalTests > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm("Tüm sonuçları sil?")) { localStorage.removeItem("ab_test_results"); setShowStats(false); } }}
                  className="text-red-400/60 hover:text-red-400 text-xs"
                >
                  Sıfırla
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Input */}
        <div className="space-y-4 mb-8">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ne hakkında yazalım?"
            rows={3}
            className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />

          {/* Platform pills */}
          <PillGroup items={PLATFORMS} value={platform} onChange={setPlatform} />

          {/* X Platformu: Etki + Gelişmiş Ayarlar */}
          {isX && (
            <div className="space-y-3">
              <PillGroup items={ETKILER} value={etki} onChange={handleEtkiChange} label="Etki" />

              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                {advancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Gelişmiş Ayarlar
              </button>

              {advancedOpen && (
                <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <PillGroup items={KARAKTERLER} value={karakter} onChange={setKarakter} label="Karakter" />
                  <PillGroup items={YAPILAR} value={yapi} onChange={setYapi} label="Yapı" />
                  <PillGroup items={UZUNLUKLAR} value={uzunluk} onChange={setUzunluk} label="Uzunluk" />
                  <PillGroup items={ACILISLAR} value={acilis} onChange={setAcilis} label="Açılış" />
                  <PillGroup items={BITISLER} value={bitis} onChange={setBitis} label="Bitiş" />
                  <PillGroup items={DERINLIKLER} value={derinlik} onChange={setDerinlik} label="Derinlik" />
                  <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                    <Checkbox checked={isUltra} onCheckedChange={setIsUltra} />
                    Ultra
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Diğer Platformlar: Persona/Ton/Uzunluk/Knowledge */}
          {!isX && (
            <div className="space-y-3">
              <PillGroup items={PERSONAS} value={persona} onChange={setPersona} label="Persona" />
              <PillGroup items={TONES} value={tone} onChange={setTone} label="Ton" />
              <PillGroup items={LENGTHS} value={length} onChange={setLength} label="Uzunluk" />
              <PillGroup items={KNOWLEDGE_MODES} value={knowledge} onChange={setKnowledge} label="Knowledge" />
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                <Checkbox checked={isApex} onCheckedChange={setIsApex} />
                APEX
              </label>
            </div>
          )}

          {/* Dil + Varyant */}
          <div className="flex items-center gap-3">
            <PillGroup items={LANGUAGES} value={language} onChange={setLanguage} label="Dil" />
            <div>
              <div className="text-xs text-white/30 mb-1.5">Varyant</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setVariants(n)}
                    className={`w-7 h-7 rounded-md text-xs transition-colors ${
                      variants === n ? "bg-white text-black font-medium" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate */}
          <div className="flex gap-3">
            <Button
              onClick={generate}
              disabled={!topic.trim() || (colA.loading && colB.loading)}
              className="bg-white text-black hover:bg-white/90 px-8 font-medium"
            >
              {colA.loading || colB.loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Üretiliyor...</>
              ) : (
                "⚡ Üret & Karşılaştır"
              )}
            </Button>
            {(colA.variants || colB.variants) && (
              <Button variant="outline" onClick={generate} className="border-white/20 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-2" /> Tekrar
              </Button>
            )}
          </div>
        </div>

        {/* Reveal banner */}
        {revealed && winner && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">
              {winner === "a" ? "Sol" : "Sağ"} kazandı →{" "}
              <span className="text-white font-bold">{orderRef.current[winner].toUpperCase()}</span>
            </span>
            <span className="text-white/40 text-sm ml-2">
              (Sol = {orderRef.current.a.toUpperCase()}, Sağ = {orderRef.current.b.toUpperCase()})
            </span>
          </div>
        )}

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EngineColumn
            label="Sol ◼"
            variants={colA.variants}
            loading={colA.loading}
            selected={winner === "a"}
            onSelect={() => !winner && selectWinner("a")}
            revealed={revealed}
            engineName={orderRef.current.a.toUpperCase()}
          />
          <EngineColumn
            label="Sağ ◼"
            variants={colB.variants}
            loading={colB.loading}
            selected={winner === "b"}
            onSelect={() => !winner && selectWinner("b")}
            revealed={revealed}
            engineName={orderRef.current.b.toUpperCase()}
          />
        </div>
      </div>
    </div>
  );
}
