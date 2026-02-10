/**
 * XAIModuleV4 — Manus AI-Style Minimal Interface
 *
 * Design: Sade ama güçlü. Centered prompt-first. #1E1E1E warm charcoal.
 * Serif heading, hairline borders, icon circles, floating popups.
 * All business logic preserved from XAIModuleV2.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Zap, Plus, Minus, RefreshCw, Image as ImageIcon, X, Copy, Heart,
  ArrowUp, Loader2, Users, Palette, Mic, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import { useProfile } from "@/contexts/ProfileContext";

/* ─── Config ─── */
const personas = [
  { id: "saf", label: "Saf", color: "bg-pink-500", ring: "ring-pink-500/40", emoji: "💗" },
  { id: "otorite", label: "Otorite", color: "bg-amber-500", ring: "ring-amber-500/40", emoji: "👔" },
  { id: "insider", label: "Insider", color: "bg-emerald-500", ring: "ring-emerald-500/40", emoji: "🤫" },
  { id: "mentalist", label: "Mentalist", color: "bg-violet-500", ring: "ring-violet-500/40", emoji: "🔮" },
  { id: "haber", label: "Haber", color: "bg-red-500", ring: "ring-red-500/40", emoji: "📢" },
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

const suggestions = [
  { icon: "✏️", label: "Tweet yaz", action: "tweet" },
  { icon: "💬", label: "Alıntı oluştur", action: "quote" },
  { icon: "↩️", label: "Yanıt hazırla", action: "reply" },
  { icon: "📝", label: "Makale yaz", action: "article" },
  { icon: "⚡", label: "APEX modu", action: "apex" },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function XAIModuleV4() {
  const [searchParams] = useSearchParams();
  const { activeProfileId, activeProfile } = useProfile();
  const textareaRef = useRef(null);
  const personaRef = useRef(null);
  const toneRef = useRef(null);
  const lengthRef = useRef(null);

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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  /* Popup states */
  const [showPersonaPopup, setShowPersonaPopup] = useState(false);
  const [showTonePopup, setShowTonePopup] = useState(false);
  const [showLengthPopup, setShowLengthPopup] = useState(false);

  /* ─── Close popups on outside click ─── */
  useEffect(() => {
    const handler = (e) => {
      if (personaRef.current && !personaRef.current.contains(e.target)) setShowPersonaPopup(false);
      if (toneRef.current && !toneRef.current.contains(e.target)) setShowTonePopup(false);
      if (lengthRef.current && !lengthRef.current.contains(e.target)) setShowLengthPopup(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── Auto-resize textarea ─── */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [topic]);

  /* ─── Has results ─── */
  const hasResults = results.length > 0 || loading;

  /* ─── Generate ─── */
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error("Konu girin");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const endpoint = contentType === "article" ? "/generate/article"
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
        setResults(data.variants?.map(v => v.content) || []);
        setGenerationId(data.generation_id);
        toast.success(`${data.variants?.length || 0} varyant üretildi!`);
      } else {
        toast.error(data.error || "Üretim başarısız");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [topic, contentType, mode, length, variants, persona, tone, knowledge, language, activeProfileId]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  const handleFavorite = async (text, variantIndex) => {
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
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.action === "apex") {
      setMode("apex");
      toast.success("APEX modu aktif!");
      return;
    }
    setContentType(suggestion.action);
    textareaRef.current?.focus();
  };

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  return (
    <>
      {/* ─── Full-screen background override ─── */}
      <div className="fixed inset-0 bg-[#1E1E1E]" style={{ zIndex: -1 }} />

      {/* ─── Main wrapper ─── */}
      <div
        className={cn(
          "relative w-full mx-auto px-4",
          hasResults ? "pt-8 pb-8" : "min-h-[calc(100vh-64px)] flex flex-col items-center justify-center"
        )}
        style={{ maxWidth: 720 }}
      >
        {/* ─── LANDING: Serif heading ─── */}
        <div
          className={cn(
            "w-full text-center transition-all duration-500 ease-out",
            hasResults
              ? "opacity-0 h-0 overflow-hidden pointer-events-none mb-0"
              : "opacity-100 mb-8"
          )}
        >
          <h1
            className="text-white font-normal leading-tight"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(32px, 5vw, 48px)",
            }}
          >
            Ne hakkında yazmak istersin?
          </h1>
        </div>

        {/* ─── PROMPT BOX (the hero) ─── */}
        <div className="w-full mb-5">
          <div
            className="rounded-[20px] p-5"
            style={{
              background: "#2A2A2A",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Image preview */}
            {imagePreview && (
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <img src={imagePreview} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Textarea */}
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
              className="w-full bg-transparent text-white resize-none focus:outline-none leading-relaxed"
              style={{
                fontSize: 15,
                color: "#fff",
                maxHeight: 200,
              }}
            />

            {/* Bottom row: icons */}
            <div className="flex items-center justify-between mt-3">
              {/* LEFT icons */}
              <div className="flex items-center gap-2">
                {/* Persona selector */}
                <div className="relative" ref={personaRef}>
                  <button
                    onClick={() => { setShowPersonaPopup(!showPersonaPopup); setShowTonePopup(false); setShowLengthPopup(false); }}
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                      showPersonaPopup ? "bg-white/[0.10] border border-white/[0.20]" : "bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10]"
                    )}
                    title="Persona seç"
                  >
                    <Users className="h-[18px] w-[18px] text-[#888]" />
                  </button>

                  {/* Persona popup */}
                  {showPersonaPopup && (
                    <div
                      className="absolute bottom-full left-0 mb-3 p-3 rounded-2xl z-50"
                      style={{
                        background: "#2A2A2A",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        minWidth: 280,
                      }}
                    >
                      <p className="text-xs text-[#666] uppercase tracking-wider mb-3 px-1">Karakter</p>
                      <div className="grid grid-cols-3 gap-2">
                        {personas.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setPersona(p.id); setShowPersonaPopup(false); }}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-sm transition-all",
                              persona === p.id
                                ? `${p.color} text-white shadow-lg ring-2 ${p.ring}`
                                : "bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                            )}
                          >
                            <span className="text-lg">{p.emoji}</span>
                            <span className="text-xs font-medium">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tone selector */}
                <div className="relative" ref={toneRef}>
                  <button
                    onClick={() => { setShowTonePopup(!showTonePopup); setShowPersonaPopup(false); setShowLengthPopup(false); }}
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                      showTonePopup ? "bg-white/[0.10] border border-white/[0.20]" : "bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10]"
                    )}
                    title="Ton seç"
                  >
                    <Palette className="h-[18px] w-[18px] text-[#888]" />
                  </button>

                  {/* Tone popup */}
                  {showTonePopup && (
                    <div
                      className="absolute bottom-full left-0 mb-3 p-3 rounded-2xl z-50"
                      style={{
                        background: "#2A2A2A",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        minWidth: 240,
                      }}
                    >
                      <p className="text-xs text-[#666] uppercase tracking-wider mb-3 px-1">Ton</p>
                      <div className="flex flex-wrap gap-2">
                        {tones.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setTone(t.id); setShowTonePopup(false); }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                              tone === t.id
                                ? "bg-white/[0.15] text-white border border-white/[0.20]"
                                : "bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white/80"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Length section inside tone popup */}
                      <p className="text-xs text-[#666] uppercase tracking-wider mt-4 mb-3 px-1">Uzunluk</p>
                      <div className="flex flex-wrap gap-2">
                        {lengths.map(l => (
                          <button
                            key={l.id}
                            onClick={() => setLength(l.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs transition-all",
                              length === l.id
                                ? "bg-white/[0.15] text-white border border-white/[0.20]"
                                : "bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white/70"
                            )}
                          >
                            {l.label}
                            <span className="ml-1 text-white/30">{l.range}</span>
                          </button>
                        ))}
                      </div>

                      {/* Language */}
                      <p className="text-xs text-[#666] uppercase tracking-wider mt-4 mb-3 px-1">Dil</p>
                      <div className="flex gap-2">
                        {[
                          { id: "auto", label: "Auto" },
                          { id: "tr", label: "TR" },
                          { id: "en", label: "EN" },
                        ].map(l => (
                          <button
                            key={l.id}
                            onClick={() => setLanguage(l.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs transition-all",
                              language === l.id
                                ? "bg-white/[0.15] text-white border border-white/[0.20]"
                                : "bg-white/[0.06] text-white/50 hover:bg-white/[0.10]"
                            )}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image attach */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-all"
                  title="Görsel ekle"
                >
                  <ImageIcon className="h-[18px] w-[18px] text-[#888]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Variant count */}
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => setVariants(Math.max(1, variants - 1))}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[#666] hover:text-white/70 hover:bg-white/[0.06] transition-all"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm text-white/50 w-4 text-center tabular-nums">{variants}</span>
                  <button
                    onClick={() => setVariants(Math.min(5, variants + 1))}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[#666] hover:text-white/70 hover:bg-white/[0.06] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Style profile pill */}
                {activeProfile && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-xs text-violet-400/80 ml-1">
                    <span>🎨</span>
                    <span>@{activeProfile.name}</span>
                  </div>
                )}
              </div>

              {/* RIGHT icons */}
              <div className="flex items-center gap-2">
                {/* APEX mode toggle */}
                <button
                  onClick={() => setMode(mode === "apex" ? "classic" : "apex")}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                    mode === "apex"
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      : "bg-white/[0.06] border border-white/[0.10] text-[#888] hover:bg-white/[0.10]"
                  )}
                  title={mode === "apex" ? "APEX modu aktif" : "APEX modu"}
                >
                  <Zap className="h-[18px] w-[18px]" />
                </button>

                {/* Mic placeholder */}
                <button
                  className="h-10 w-10 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.10] text-[#888] hover:bg-white/[0.10] transition-all"
                  title="Sesli giriş (yakında)"
                  onClick={() => toast.info("Sesli giriş yakında!")}
                >
                  <Mic className="h-[18px] w-[18px]" />
                </button>

                {/* Send button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                    topic.trim() && !loading
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                      : "bg-[#3A3A3A] text-white/40"
                  )}
                  title="Üret"
                >
                  {loading ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <ArrowUp className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Hint line */}
            <div className="flex items-center justify-between mt-2 px-0.5">
              <div className="flex items-center gap-2 text-[11px] text-white/20">
                <span>{personas.find(p => p.id === persona)?.emoji} {personas.find(p => p.id === persona)?.label}</span>
                <span>·</span>
                <span>{tones.find(t => t.id === tone)?.label}</span>
                <span>·</span>
                <span>{lengths.find(l => l.id === length)?.label}</span>
                <span>·</span>
                <span>{variants}x</span>
                {mode === "apex" && (
                  <>
                    <span>·</span>
                    <span className="text-amber-400/50">⚡ APEX</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-white/15">Enter = üret · Shift+Enter = satır</span>
            </div>
          </div>
        </div>

        {/* ─── SUGGESTION PILLS (landing only) ─── */}
        <div
          className={cn(
            "w-full flex flex-wrap items-center justify-center gap-3 transition-all duration-500",
            hasResults ? "opacity-0 h-0 overflow-hidden pointer-events-none" : "opacity-100"
          )}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-all border border-white/[0.12] hover:bg-white/[0.04] hover:border-white/[0.20]"
              style={{ color: "#AAAAAA" }}
            >
              <span className="text-base">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}

          {/* Content type pills */}
          <div className="w-full flex items-center justify-center gap-2 mt-2">
            {contentTypes.map(ct => (
              <button
                key={ct.id}
                onClick={() => setContentType(ct.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs transition-all border",
                  contentType === ct.id
                    ? "border-white/[0.25] text-white/80 bg-white/[0.06]"
                    : "border-white/[0.08] text-white/30 hover:text-white/50 hover:border-white/[0.15]"
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── RESULTS AREA ─── */}
        {hasResults && (
          <div className="w-full mt-2 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
                </div>
                <p className="text-sm text-white/30 mt-4">İçerik üretiliyor...</p>
              </div>
            ) : (
              <>
                {/* Results header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-white/40">{results.length} varyant</span>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Tekrar üret
                  </button>
                </div>

                {/* Result cards */}
                {results.map((text, i) => (
                  <div
                    key={i}
                    className="rounded-[20px] p-5 transition-all duration-300"
                    style={{
                      background: "#2A2A2A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    {/* Number badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">#{i + 1}</span>
                      </div>
                      <span className="text-xs text-white/25">{text.length} karakter</span>
                    </div>

                    {/* Content */}
                    <p className="text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{text}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleCopy(text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                      >
                        <Copy className="h-3.5 w-3.5" /> Kopyala
                      </button>
                      <button
                        onClick={() => handleFavorite(text, i)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                          favoritedIds.has(i)
                            ? "text-pink-400 bg-pink-500/10"
                            : "text-white/40 hover:text-pink-400 hover:bg-white/[0.06]"
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5", favoritedIds.has(i) && "fill-current")} /> Favori
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
