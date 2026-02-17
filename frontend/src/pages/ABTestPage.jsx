import { useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RotateCcw, Check, Trophy, Eye, EyeOff } from "lucide-react";

const PLATFORMS = [
  { id: "x", label: "X", endpoint: "/generate/tweet" },
  { id: "linkedin", label: "LinkedIn", endpoint: "/generate/linkedin" },
  { id: "instagram", label: "Instagram", endpoint: "/generate/instagram/caption" },
  { id: "blog", label: "Blog", endpoint: "/generate/blog/full" },
  { id: "youtube", label: "YouTube", endpoint: "/generate/tweet" },
  { id: "tiktok", label: "TikTok", endpoint: "/generate/tiktok/caption" },
];

const PERSONAS = ["saf", "otorite", "insider", "mentalist", "haber"];
const TONES = ["natural", "raw", "polished", "unhinged"];
const LENGTHS = ["micro", "punch", "spark", "storm", "thread"];
const LANGUAGES = ["auto", "tr", "en"];

function Select({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#141414] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
      title={label}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
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

// localStorage'da sonuçları tut
function saveResult(result) {
  try {
    const key = "ab_test_results";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(result);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) { /* ignore */ }
}

function getResults() {
  try {
    return JSON.parse(localStorage.getItem("ab_test_results") || "[]");
  } catch { return []; }
}

export default function ABTestPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("x");
  const [persona, setPersona] = useState("saf");
  const [tone, setTone] = useState("natural");
  const [length, setLength] = useState("punch");
  const [language, setLanguage] = useState("auto");
  const [isApex, setIsApex] = useState(false);

  const [colA, setColA] = useState({ loading: false, variants: null });
  const [colB, setColB] = useState({ loading: false, variants: null });
  const [winner, setWinner] = useState(null); // "a" | "b"
  const [revealed, setRevealed] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Blind: rastgele sıralama, her üretimde değişir
  const orderRef = useRef({ a: "v2", b: "v3" });

  const getEndpoint = useCallback(() => {
    return PLATFORMS.find((p) => p.id === platform)?.endpoint || "/generate/tweet";
  }, [platform]);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setWinner(null);
    setRevealed(false);
    setColA({ loading: true, variants: null });
    setColB({ loading: true, variants: null });

    // Randomize order
    const flip = Math.random() > 0.5;
    orderRef.current = flip ? { a: "v3", b: "v2" } : { a: "v2", b: "v3" };

    const endpoint = getEndpoint();
    const body = {
      topic: topic.trim(),
      persona,
      tone,
      length,
      language,
      is_apex: isApex,
      variants: 3,
    };

    const fetchEngine = async (engine) => {
      try {
        const res = await api.post(`${endpoint}?engine=${engine}`, body);
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
  }, [topic, persona, tone, length, language, isApex, getEndpoint]);

  const selectWinner = (col) => {
    setWinner(col);
    setRevealed(true);

    const winnerEngine = orderRef.current[col];
    const loserEngine = col === "a" ? orderRef.current.b : orderRef.current.a;

    const result = {
      timestamp: new Date().toISOString(),
      topic,
      platform,
      persona,
      tone,
      length,
      language,
      isApex,
      winner: winnerEngine,
      loser: loserEngine,
      order: { ...orderRef.current },
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
            <p className="text-white/40 text-sm">Hangi engine daha iyi? Sen karar ver. Seçene kadar hangisi hangisi bilinmiyor.</p>
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
                <div className="text-xs text-white/40">Toplam Test</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{v2Wins}</div>
                <div className="text-xs text-white/40">v2 Kazandı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-400">{v3Wins}</div>
                <div className="text-xs text-white/40">v3 Kazandı</div>
              </div>
              {totalTests > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex-1">
                    <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${(v2Wins / totalTests) * 100}%` }}
                      />
                      <div
                        className="bg-violet-500 transition-all"
                        style={{ width: `${(v3Wins / totalTests) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-white/40">
                      <span>v2 {totalTests > 0 ? Math.round((v2Wins / totalTests) * 100) : 0}%</span>
                      <span>v3 {totalTests > 0 ? Math.round((v3Wins / totalTests) * 100) : 0}%</span>
                    </div>
                  </div>
                </>
              )}
              {totalTests > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tüm test sonuçlarını sil?")) {
                      localStorage.removeItem("ab_test_results");
                      setShowStats(false);
                    }
                  }}
                  className="text-red-400/60 hover:text-red-400 text-xs"
                >
                  Sıfırla
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Input Section */}
        <div className="space-y-4 mb-8">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ne hakkında yazalım?"
            rows={3}
            className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />

          {/* Platform pills */}
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  platform === p.id
                    ? "bg-white text-black font-medium"
                    : "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Settings row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={persona} onChange={setPersona} options={PERSONAS} label="Persona" />
            <Select value={tone} onChange={setTone} options={TONES} label="Ton" />
            <Select value={length} onChange={setLength} options={LENGTHS} label="Uzunluk" />
            <Select value={language} onChange={setLanguage} options={LANGUAGES} label="Dil" />
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <Checkbox checked={isApex} onCheckedChange={setIsApex} />
              APEX
            </label>
          </div>

          {/* Generate button */}
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

        {/* Comparison columns */}
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
