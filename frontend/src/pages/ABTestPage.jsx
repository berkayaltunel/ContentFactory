import { useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RotateCcw, Check } from "lucide-react";

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

function EngineColumn({ label, variants, loading, selected, onSelect }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentVariant = variants?.[activeIdx];

  return (
    <Card className={`flex-1 p-5 bg-[#111] border transition-colors ${
      selected ? "border-green-500/60 bg-green-500/5" : "border-white/10"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
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

export default function ABTestPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("x");
  const [persona, setPersona] = useState("saf");
  const [tone, setTone] = useState("natural");
  const [length, setLength] = useState("punch");
  const [language, setLanguage] = useState("auto");
  const [isApex, setIsApex] = useState(false);

  const [v2, setV2] = useState({ loading: false, variants: null });
  const [v3, setV3] = useState({ loading: false, variants: null });
  const [winner, setWinner] = useState(null); // "v2" | "v3" | null

  const getEndpoint = useCallback(() => {
    return PLATFORMS.find((p) => p.id === platform)?.endpoint || "/generate/tweet";
  }, [platform]);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setWinner(null);
    setV2({ loading: true, variants: null });
    setV3({ loading: true, variants: null });

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
        // Response might be { variants: [...] } or { content: "..." } or array
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

    const [r2, r3] = await Promise.allSettled([fetchEngine("v2"), fetchEngine("v3")]);
    setV2({ loading: false, variants: r2.status === "fulfilled" ? r2.value : [`Hata: ${r2.reason}`] });
    setV3({ loading: false, variants: r3.status === "fulfilled" ? r3.value : [`Hata: ${r3.reason}`] });
  }, [topic, persona, tone, length, language, isApex, getEndpoint]);

  const selectWinner = (engine) => {
    setWinner(engine);
    console.log(`[AB Test] Winner: ${engine}`, { topic, platform, persona, tone, length, language, isApex });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">A/B Test</h1>
          <p className="text-white/40 text-sm">Engine v2 vs v3 — yan yana karşılaştır</p>
        </div>

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
              disabled={!topic.trim() || (v2.loading && v3.loading)}
              className="bg-white text-black hover:bg-white/90 px-8 font-medium"
            >
              {v2.loading || v3.loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Üretiliyor...</>
              ) : (
                "⚡ Üret"
              )}
            </Button>
            {(v2.variants || v3.variants) && (
              <Button variant="outline" onClick={generate} className="border-white/20 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-2" /> Tekrar Üret
              </Button>
            )}
          </div>
        </div>

        {/* Comparison columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EngineColumn
            label="Engine v2"
            variants={v2.variants}
            loading={v2.loading}
            selected={winner === "v2"}
            onSelect={() => selectWinner("v2")}
          />
          <EngineColumn
            label="Engine v3"
            variants={v3.variants}
            loading={v3.loading}
            selected={winner === "v3"}
            onSelect={() => selectWinner("v3")}
          />
        </div>
      </div>
    </div>
  );
}
