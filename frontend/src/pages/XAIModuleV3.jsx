/**
 * XAIModuleV3 — Orriso-Style Spatial Canvas Workspace
 * 
 * Warm gray-beige background with floating glassmorphic panels.
 * Replicates Orriso.com's spatial canvas aesthetic for Type Hype AI content generation.
 * 
 * All business logic preserved from XAIModuleV2.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles, Zap, Plus, Minus, RefreshCw, Image, X, Copy, Heart,
  Send, ChevronDown, Paperclip, Settings2, Globe, Type, Wand2,
  ArrowRight, Check, Loader2, Clock, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import { useProfile } from "@/contexts/ProfileContext";

/* ─────────────────────── CONFIG ─────────────────────── */

const personas = [
  { id: "saf", label: "Saf", bg: "#E88B9C", emoji: "💗" },
  { id: "otorite", label: "Otorite", bg: "#D4A854", emoji: "👔" },
  { id: "insider", label: "Insider", bg: "#5B8A5E", emoji: "🤫" },
  { id: "mentalist", label: "Mentalist", bg: "#7B6BAA", emoji: "🔮" },
  { id: "haber", label: "Haber", bg: "#C45A4A", emoji: "📢" },
];

const tones = [
  { id: "natural", label: "Natural" },
  { id: "raw", label: "Raw" },
  { id: "polished", label: "Polished" },
  { id: "unhinged", label: "Unhinged" },
];

const lengths = [
  { id: "micro", label: "Micro", range: "50-100" },
  { id: "punch", label: "Punch", range: "140-280" },
  { id: "spark", label: "Spark", range: "400-600" },
  { id: "storm", label: "Storm", range: "700-1K" },
  { id: "thread", label: "Thread", range: "3-7 tweet" },
];

const contentTypes = [
  { id: "tweet", label: "Tweet" },
  { id: "quote", label: "Alıntı" },
  { id: "reply", label: "Yanıt" },
  { id: "article", label: "Makale" },
];

const knowledgeOptions = [
  { id: null, label: "Yok" },
  { id: "insider", label: "Insider" },
  { id: "contrarian", label: "Contrarian" },
  { id: "hidden", label: "Hidden" },
  { id: "expert", label: "Expert" },
];

const languageOptions = [
  { id: "auto", label: "Oto" },
  { id: "tr", label: "TR" },
  { id: "en", label: "EN" },
];

/* ─────────────────────── GLASS STYLES (inline objects) ─────────────────────── */

const glassPanel = {
  background: "rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "24px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
};

const darkPill = {
  background: "#3A3A3A",
  borderRadius: "50px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
};

/* ─────────────────────── SUB-COMPONENTS ─────────────────────── */

/** Dark charcoal pill selector (Orriso floating toolbar style) */
function DarkPillSelector({ options, value, onChange, className = "" }) {
  return (
    <div className={cn("inline-flex items-center p-1 gap-0.5", className)} style={darkPill}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
            value === opt.id
              ? "bg-white text-black shadow-lg"
              : "text-white/60 hover:text-white/90"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Persona card with Orriso warm-tone colors */
function PersonaCard({ persona, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap",
        selected
          ? "shadow-lg scale-105 text-white"
          : "opacity-60 hover:opacity-90 text-white/90"
      )}
      style={{
        backgroundColor: persona.bg,
        ...(selected ? { boxShadow: `0 4px 16px ${persona.bg}66` } : {}),
      }}
    >
      <span className="text-sm">{persona.emoji}</span>
      {persona.label}
    </button>
  );
}

/** Result card with glass effect */
function ResultCard({ content, index, onCopy, onFavorite, isFavorited }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="p-5 group transition-all duration-300 hover:scale-[1.01]"
      style={{
        ...glassPanel,
        borderRadius: "20px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #D946EF)" }}
            >
              <span className="text-[10px] font-bold text-white">#{index + 1}</span>
            </div>
            <span className="text-xs text-white/40">{content.length} karakter</span>
          </div>
          <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.08]">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
        <button
          onClick={onFavorite}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
            isFavorited
              ? "text-pink-400 bg-pink-500/10"
              : "text-white/50 hover:text-pink-400 hover:bg-white/[0.08]"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} /> Favori
        </button>
      </div>
    </div>
  );
}

/** Empty state with sparkle */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="relative mb-6">
        <div
          className="h-28 w-28 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles className="h-12 w-12 text-violet-400" />
        </div>
        <div
          className="absolute -top-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center animate-bounce"
          style={{ background: "linear-gradient(135deg, #FBBF24, #F97316)" }}
        >
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white/80 mb-2">İçerik üretmeye hazır</h3>
      <p className="text-sm text-white/40 max-w-xs">
        Aşağıdaki alana konunu yaz, karakterini seç ve üret butonuna bas.
      </p>
    </div>
  );
}

/** Loading spinner */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
        <Sparkles className="h-6 w-6 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-sm text-white/40 mt-4">İçerik üretiliyor...</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function XAIModuleV3() {
  const [searchParams] = useSearchParams();
  const { activeProfileId, activeProfile } = useProfile();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ─── State ─── */
  const [contentType, setContentType] = useState("tweet");
  const [mode, setMode] = useState("classic");
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [length, setLength] = useState("punch");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("otorite");
  const [tone, setTone] = useState("natural");
  const [knowledge, setKnowledge] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [generationId, setGenerationId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [showLengthMenu, setShowLengthMenu] = useState(false);

  /* ─── Auto-resize textarea ─── */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [topic]);

  /* ─── Close length menu on outside click ─── */
  useEffect(() => {
    if (!showLengthMenu) return;
    const handler = () => setShowLengthMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showLengthMenu]);

  /* ─── Generate ─── */
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error("Konu girin");
      return;
    }
    setLoading(true);
    setResults([]);
    setFavoritedIds(new Set());
    try {
      const endpoint =
        contentType === "article" ? "/generate/article"
        : contentType === "quote" ? "/generate/quote"
        : contentType === "reply" ? "/generate/reply"
        : "/generate/tweet";

      const body = {
        topic,
        mode: mode === "apex" ? "apex" : "classic",
        length,
        variants,
        persona,
        tone,
        knowledge,
        language,
        style_profile_id: activeProfileId || undefined,
      };

      if (contentType === "reply" || contentType === "quote") {
        body.tweet_url = topic;
      }

      const res = await api.post(`${API}${endpoint}`, body);
      const data = res.data;
      if (data.success) {
        const items = data.variants?.map(v => v.content) || [];
        setResults(items);
        setGenerationId(data.generation_id);
        toast.success(`${items.length} varyant üretildi!`);
        // Update recent generations (keep last 5)
        setRecentGenerations(prev => [
          { topic: topic.slice(0, 60), count: items.length, type: contentType, time: new Date() },
          ...prev.slice(0, 4),
        ]);
      } else {
        toast.error(data.error || "Üretim başarısız");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [topic, contentType, mode, length, variants, persona, tone, knowledge, language, activeProfileId]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  }, []);

  const handleFavorite = useCallback(async (text, variantIndex) => {
    try {
      const res = await api.post(`${API}/favorites/toggle`, {
        content: text,
        type: contentType,
        generation_id: generationId,
        variant_index: variantIndex,
      });
      setFavoritedIds(prev => {
        const next = new Set(prev);
        if (res.data.action === "added") next.add(variantIndex);
        else next.delete(variantIndex);
        return next;
      });
      toast.success(res.data.action === "added" ? "Favorilere eklendi!" : "Favorilerden kaldırıldı");
    } catch {
      toast.error("Favori işlemi başarısız");
    }
  }, [contentType, generationId]);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  const currentLengthLabel = lengths.find(l => l.id === length)?.label || "Punch";

  /* ─── RENDER ─── */
  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden" style={{ background: "#B5ADA6" }}>

      {/* ══════════════ FLOATING TOOLBARS (Top Center) ══════════════ */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
        {/* Content Type Bar */}
        <DarkPillSelector
          options={contentTypes}
          value={contentType}
          onChange={setContentType}
        />

        {/* Mode + Length + Variants Row */}
        <div className="flex items-center gap-3">
          {/* Mode */}
          <DarkPillSelector
            options={[
              { id: "classic", label: "Klasik" },
              { id: "apex", label: "⚡ APEX" },
            ]}
            value={mode}
            onChange={setMode}
          />

          {/* Length dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLengthMenu(v => !v); }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white/70 hover:text-white transition-all"
              style={darkPill}
            >
              <Type className="h-3.5 w-3.5" />
              {currentLengthLabel}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLengthMenu && (
              <div
                className="absolute top-full left-0 mt-2 w-48 z-50 p-1.5"
                style={{
                  ...glassPanel,
                  borderRadius: "16px",
                  background: "rgba(40, 40, 40, 0.95)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {lengths.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setLength(l.id); setShowLengthMenu(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      length === l.id
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <span>{l.label}</span>
                    <span className="text-xs text-white/30">{l.range}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variants stepper */}
          <div className="flex items-center gap-1 px-3 py-1" style={darkPill}>
            <button
              onClick={() => setVariants(Math.max(1, variants - 1))}
              className="p-1 rounded-full hover:bg-white/10 text-white/50 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-semibold text-white/80 w-5 text-center">{variants}</span>
            <button
              onClick={() => setVariants(Math.min(5, variants + 1))}
              className="p-1 rounded-full hover:bg-white/10 text-white/50 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2.5 transition-all",
              showSettings ? "text-violet-300" : "text-white/50 hover:text-white/80"
            )}
            style={{
              ...darkPill,
              ...(showSettings ? { background: "#4A3A6A", border: "1px solid rgba(139,92,246,0.4)" } : {}),
            }}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Tone bar (shown as 3rd row) */}
        <DarkPillSelector
          options={tones}
          value={tone}
          onChange={setTone}
        />
      </div>

      {/* ══════════════ SETTINGS PANEL (top center, below toolbars) ══════════════ */}
      {showSettings && (
        <div
          className="absolute top-[170px] left-1/2 -translate-x-1/2 z-30 w-[480px] max-w-[90vw] p-5"
          style={glassPanel}
        >
          <div className="grid grid-cols-2 gap-5">
            {/* Knowledge */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Knowledge</label>
              <div className="flex flex-wrap gap-1.5">
                {knowledgeOptions.map(k => (
                  <button
                    key={k.id || "none"}
                    onClick={() => setKnowledge(k.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all",
                      knowledge === k.id
                        ? "bg-white/15 text-white border border-white/20"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    )}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Dil</label>
              <div className="flex gap-1.5">
                {languageOptions.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all",
                      language === l.id
                        ? "bg-white/15 text-white border border-white/20"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PERSONA CARDS (Bottom-Left) ══════════════ */}
      <div
        className="absolute bottom-24 left-8 z-20 p-4 w-[260px] hidden lg:block"
        style={glassPanel}
      >
        <h4 className="text-sm font-semibold text-white mb-3">Karakter</h4>
        <div className="grid grid-cols-2 gap-2">
          {personas.map(p => (
            <PersonaCard
              key={p.id}
              persona={p}
              selected={persona === p.id}
              onClick={() => setPersona(p.id)}
            />
          ))}
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL — Style Profile ══════════════ */}
      <div
        className="absolute top-1/2 -translate-y-1/2 right-8 z-20 p-4 w-[200px] hidden xl:block"
        style={glassPanel}
      >
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Stil Profili</h4>
        {activeProfile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #D946EF)" }}
              >
                <span className="text-sm font-bold text-white">
                  {activeProfile.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{activeProfile.name}</p>
                <p className="text-xs text-white/40">Aktif profil</p>
              </div>
            </div>
            {activeProfile.source_username && (
              <p className="text-xs text-white/30">@{activeProfile.source_username}</p>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <User className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30">Profil seçilmedi</p>
          </div>
        )}
      </div>

      {/* ══════════════ BOTTOM-RIGHT — Son Üretimler ══════════════ */}
      {recentGenerations.length > 0 && (
        <div
          className="absolute bottom-24 right-8 z-20 p-4 w-[260px] hidden lg:block"
          style={glassPanel}
        >
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Son Üretimler</h4>
          <div className="space-y-2">
            {recentGenerations.slice(0, 3).map((gen, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.06] transition-colors hover:bg-white/[0.10]">
                <Clock className="h-3 w-3 text-white/30 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/70 truncate">{gen.topic}</p>
                  <p className="text-[10px] text-white/30">{gen.count} varyant · {gen.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ CENTRAL CANVAS (Results Area) ══════════════ */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div
          className="w-full max-w-2xl mx-auto pointer-events-auto overflow-y-auto px-4"
          style={{
            maxHeight: "calc(100vh - 280px)",
            marginTop: "140px",
            scrollbarWidth: "none",
          }}
        >
          {loading ? (
            <LoadingState />
          ) : results.length > 0 ? (
            <div className="space-y-4 pb-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-white/70">
                  {results.length} Varyant Üretildi
                </h3>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.08]"
                >
                  <RefreshCw className="h-3 w-3" /> Tekrar Üret
                </button>
              </div>
              {results.map((text, i) => (
                <ResultCard
                  key={i}
                  content={text}
                  index={i}
                  onCopy={() => handleCopy(text)}
                  onFavorite={() => handleFavorite(text, i)}
                  isFavorited={favoritedIds.has(i)}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* ══════════════ MOBILE: Persona row (visible on small screens) ══════════════ */}
      <div className="absolute bottom-[140px] left-4 right-4 z-20 flex items-center gap-2 overflow-x-auto lg:hidden pb-1" style={{ scrollbarWidth: "none" }}>
        <span className="text-[10px] text-white/40 shrink-0 mr-1">Karakter</span>
        {personas.map(p => (
          <PersonaCard
            key={p.id}
            persona={p}
            selected={persona === p.id}
            onClick={() => setPersona(p.id)}
          />
        ))}
      </div>

      {/* ══════════════ PROMPT BAR (Bottom Center) — Hero Component ══════════════ */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-[70%] lg:w-[50%] min-w-[320px] max-w-[600px]">
        <div
          className="relative overflow-hidden"
          style={{
            ...glassPanel,
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.10)",
          }}
        >
          {/* Rainbow gradient bottom border */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{
              background: "linear-gradient(90deg, #4CAF50, #8BC34A, #FFEB3B, #FF9800, #F44336, #E91E63, #9C27B0, #2196F3, #00BCD4)",
              borderRadius: "0 0 24px 24px",
            }}
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="flex items-center gap-2 pt-3 px-4">
              <div className="relative">
                <img src={imagePreview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="px-4 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                contentType === "quote" ? "Tweet linki yapıştır..."
                : contentType === "reply" ? "Yanıtlamak istediğin tweet linki..."
                : contentType === "article" ? "Makale konusunu yaz..."
                : "Konu yaz, link yapıştır veya fikir paylaş..."
              }
              rows={1}
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/30 resize-none focus:outline-none leading-relaxed max-h-[160px]"
              style={{ color: "white" }}
            />
          </div>

          {/* Bottom action row */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* Attachment */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                title="Görsel ekle"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* APEX toggle */}
              <button
                onClick={() => setMode(mode === "apex" ? "classic" : "apex")}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  mode === "apex"
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
                )}
                title="APEX modu"
              >
                <Zap className="h-4 w-4" />
              </button>

              {/* Image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                title="Görsel"
              >
                <Image className="h-4 w-4" />
              </button>
            </div>

            {/* Send button (circular, violet gradient) */}
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0",
                topic.trim() && !loading
                  ? "hover:scale-105"
                  : "opacity-30 cursor-not-allowed"
              )}
              style={{
                background: topic.trim() && !loading
                  ? "linear-gradient(135deg, #8B5CF6, #D946EF)"
                  : "rgba(255,255,255,0.1)",
                boxShadow: topic.trim() && !loading
                  ? "0 4px 12px rgba(139, 92, 246, 0.4)"
                  : "none",
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 text-white" />
              )}
            </button>
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between px-4 pb-2 -mt-1">
            <div className="flex items-center gap-2 text-[11px] text-white/25">
              <span>{topic.length}/280</span>
              <span>·</span>
              <span>{currentLengthLabel} · {variants} varyant</span>
              {activeProfile && (
                <>
                  <span>·</span>
                  <span className="text-violet-400/50">🎨 {activeProfile.name}</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-white/20">Enter üret · Shift+Enter satır</span>
          </div>
        </div>
      </div>
    </div>
  );
}
