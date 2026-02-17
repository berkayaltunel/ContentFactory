import { useState, useCallback, useRef, useMemo } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Check, Trophy, Sparkles } from "lucide-react";

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════

const MODELS = {
  normal: { id: "normal", label: "Gemini 3 Flash", color: "blue" },
  shitpost: { id: "shitpost", label: "Mistral Large", color: "violet" },
};

const MIN_TESTS = 10;

function calcSignificance(wins, total) {
  if (total < MIN_TESTS) return { significant: false, pValue: 1, needed: MIN_TESTS - total };
  const p0 = 0.5;
  const z = (wins / total - p0) / Math.sqrt(p0 * (1 - p0) / total);
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989422804 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));
  return { significant: 2 * p < 0.05, pValue: 2 * p, needed: 0 };
}

// ══════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════

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

function EngineColumn({ label, variants, loading, selected, onSelect, revealed, engineLabel }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentVariant = variants?.[activeIdx];

  const borderClass = revealed
    ? selected
      ? "border-green-500 ring-2 ring-green-500/30 bg-green-500/5"
      : "border-red-500/30 bg-red-500/5 opacity-70"
    : "border-white/10";

  return (
    <Card className={`flex-1 p-5 bg-[#111] border transition-all duration-500 ${borderClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <div className="flex items-center gap-2">
          {revealed && (
            <Badge className={`text-xs ${
              selected
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
              {engineLabel}
            </Badge>
          )}
          {revealed && selected && <Trophy className="w-4 h-4 text-yellow-400" />}
        </div>
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
          {!revealed && (
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              onClick={onSelect}
            >
              <Check className="w-4 h-4 mr-2" />
              Bu Daha İyi
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm">
          Henüz üretilmedi
        </div>
      )}
    </Card>
  );
}

function saveResult(result) {
  try {
    const existing = JSON.parse(localStorage.getItem("ab_shitpost_results") || "[]");
    existing.push(result);
    localStorage.setItem("ab_shitpost_results", JSON.stringify(existing));
  } catch (e) { /* ignore */ }
}

function getResults() {
  try { return JSON.parse(localStorage.getItem("ab_shitpost_results") || "[]"); } catch { return []; }
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════

export default function ABTestPage() {
  const [topic, setTopic] = useState("");
  const [variants, setVariants] = useState(3);
  const [colA, setColA] = useState({ loading: false, variants: null });
  const [colB, setColB] = useState({ loading: false, variants: null });
  const [winner, setWinner] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const orderRef = useRef({ a: "normal", b: "shitpost" });

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setWinner(null);
    setRevealed(false);
    setColA({ loading: true, variants: null });
    setColB({ loading: true, variants: null });

    // Randomize
    const flip = Math.random() > 0.5;
    orderRef.current = flip ? { a: "shitpost", b: "normal" } : { a: "normal", b: "shitpost" };

    const fetchModel = async (modelKey) => {
      try {
        const res = await api.post(`/v2/generate/tweet?engine=v3&force_model=${modelKey}`, {
          topic: topic.trim(),
          etki: "shitpost",
          karakter: "haberci",
          yapi: "dogal",
          uzunluk: "micro",
          acilis: "otomatik",
          bitis: "dogal",
          derinlik: "standart",
          language: "auto",
          is_ultra: false,
          variants,
        });
        const data = res.data;
        if (data.variants && Array.isArray(data.variants)) {
          return data.variants.map((v) => (typeof v === "string" ? v : v.text || v.content || JSON.stringify(v)));
        }
        if (data.content) return [data.content];
        return [JSON.stringify(data, null, 2)];
      } catch (err) {
        return [`Hata: ${err.response?.data?.detail || err.message}`];
      }
    };

    const [rA, rB] = await Promise.allSettled([
      fetchModel(orderRef.current.a),
      fetchModel(orderRef.current.b),
    ]);
    setColA({ loading: false, variants: rA.status === "fulfilled" ? rA.value : [`Hata: ${rA.reason}`] });
    setColB({ loading: false, variants: rB.status === "fulfilled" ? rB.value : [`Hata: ${rB.reason}`] });
  }, [topic, variants]);

  const selectWinner = (col) => {
    setWinner(col);
    setRevealed(true);
    const winnerModel = orderRef.current[col];
    saveResult({
      timestamp: new Date().toISOString(),
      topic,
      winner: winnerModel,
      loser: col === "a" ? orderRef.current.b : orderRef.current.a,
    });
  };

  const results = getResults();
  const geminiWins = results.filter(r => r.winner === "normal").length;
  const mistralWins = results.filter(r => r.winner === "shitpost").length;
  const totalTests = results.length;

  const significance = useMemo(() => {
    const maxWins = Math.max(geminiWins, mistralWins);
    return calcSignificance(maxWins, totalTests);
  }, [geminiWins, mistralWins, totalTests]);

  const conclusionModel = geminiWins > mistralWins ? "Gemini 3 Flash" : mistralWins > geminiWins ? "Mistral Large" : null;
  const conclusionPct = totalTests > 0 ? Math.round((Math.max(geminiWins, mistralWins) / totalTests) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">🧪 Shitpost Model A/B Test</h1>
          <p className="text-white/40 text-sm">Gemini 3 Flash vs Mistral Large — ikisi de BeatstoBytes RAG ile. Hangisi daha iyi shitpost üretiyor?</p>
        </div>

        {/* Scoreboard */}
        <Card className="p-4 mb-6 bg-[#111] border-white/10">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalTests}</div>
              <div className="text-xs text-white/40">Toplam</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{geminiWins}</div>
              <div className="text-xs text-white/40">Gemini</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-400">{mistralWins}</div>
              <div className="text-xs text-white/40">Mistral</div>
            </div>
            {totalTests > 0 && (
              <>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex-1 min-w-[200px]">
                  <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                    <div className="bg-blue-500 transition-all" style={{ width: `${(geminiWins / totalTests) * 100}%` }} />
                    <div className="bg-violet-500 transition-all" style={{ width: `${(mistralWins / totalTests) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-white/40">
                    <span>Gemini {totalTests > 0 ? Math.round((geminiWins / totalTests) * 100) : 0}%</span>
                    <span>Mistral {totalTests > 0 ? Math.round((mistralWins / totalTests) * 100) : 0}%</span>
                  </div>
                </div>
              </>
            )}
            {totalTests > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { if (confirm("Tüm sonuçları sıfırla?")) { localStorage.removeItem("ab_shitpost_results"); window.location.reload(); } }}
                className="text-red-400/60 hover:text-red-400 text-xs"
              >
                Sıfırla
              </Button>
            )}
          </div>

          {/* Significance */}
          {totalTests > 0 && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              significance.significant
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-white/5 border border-white/10 text-white/50"
            }`}>
              {significance.significant ? (
                <>
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  <strong>Sonuç:</strong> {conclusionModel} istatistiksel olarak daha iyi ({conclusionPct}%, p={significance.pValue.toFixed(3)}).
                </>
              ) : totalTests < MIN_TESTS ? (
                <>📊 {MIN_TESTS - totalTests} test daha gerekiyor. ({totalTests}/{MIN_TESTS})</>
              ) : (
                <>📊 Henüz anlamlı fark yok (p={significance.pValue.toFixed(3)}). Teste devam et.</>
              )}
            </div>
          )}
        </Card>

        {/* Input */}
        <div className="space-y-4 mb-8">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Shitpost konusu yaz..."
            rows={2}
            className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />

          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-white/30 mb-1.5">Varyant</div>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
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

            <div className="flex gap-3 ml-auto">
              <Button
                onClick={generate}
                disabled={!topic.trim() || colA.loading}
                className="bg-white text-black hover:bg-white/90 px-8 font-medium"
              >
                {colA.loading || colB.loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Üretiliyor...</>
                ) : (
                  "⚡ Üret & Karşılaştır"
                )}
              </Button>
              {colA.variants && !colA.loading && (
                <Button variant="outline" onClick={generate} className="border-white/20 text-white hover:bg-white/10">
                  <RotateCcw className="w-4 h-4 mr-2" /> Tekrar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reveal */}
        {revealed && winner && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-green-400 font-semibold">
                  {winner === "a" ? "Sol" : "Sağ"} kazandı → <span className="text-white text-lg">{MODELS[orderRef.current[winner]].label}</span>
                </div>
                <div className="text-white/40 text-xs mt-0.5">
                  Sol = {MODELS[orderRef.current.a].label} · Sağ = {MODELS[orderRef.current.b].label}
                </div>
              </div>
            </div>
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
            engineLabel={MODELS[orderRef.current.a].label}
          />
          <EngineColumn
            label="Sağ ◼"
            variants={colB.variants}
            loading={colB.loading}
            selected={winner === "b"}
            onSelect={() => !winner && selectWinner("b")}
            revealed={revealed}
            engineLabel={MODELS[orderRef.current.b].label}
          />
        </div>
      </div>
    </div>
  );
}
