/**
 * EvolveSlideOver — Self-contained "Refine Studio" panel
 *
 * Tüm akış panelin içinde:
 *   1. Sticky header: orijinal metin referansı
 *   2. Ayar seçimi (EvolveQuickTags + textarea)
 *   3. "Geliştir" → ayarlar collapse, skeleton loading
 *   4. Sonuçlar panelde listelenir
 *   5. "Değiştir" → ana listeye aktarılır, panel kapanır
 *
 * Desktop: sağdan slide-in (440px)
 * Mobil: alttan yukarı full-screen bottom sheet
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  X, Copy, Send, Dna, ChevronDown, ChevronUp,
  Loader2, RotateCcw, ArrowRight, Check, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import EvolveQuickTags from "./EvolveQuickTags";

export default function EvolveSlideOver({
  open,
  onClose,
  originalContent,
  variantIndex,
  parentGenerationId,
  onEvolve,       // async ({ parentGenerationId, selectedVariantIndices, feedback, quickTags, variantCount }) => result
  onApply,        // (variants, quickTags) => void — pushes to version stack & replaces
}) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const resultsRef = useRef(null);

  // Local state
  const [quickTags, setQuickTags] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { variants, quickTags }
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [hasUnsavedResults, setHasUnsavedResults] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuickTags([]);
      setFeedback("");
      setVariantCount(3);
      setLoading(false);
      setResults(null);
      setSettingsCollapsed(false);
      setHasUnsavedResults(false);
    }
  }, [open]);

  // Escape to close (with unsaved check)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, hasUnsavedResults]);

  const handleClose = useCallback(() => {
    if (hasUnsavedResults) {
      if (!window.confirm("Sonuçlar henüz uygulanmadı. Çıkmak istediğine emin misin?")) return;
    }
    onClose();
  }, [hasUnsavedResults, onClose]);

  // Auto-scroll to results
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  const handleGenerate = async () => {
    setLoading(true);
    setSettingsCollapsed(true);
    setResults(null);
    try {
      const result = await onEvolve?.({
        parentGenerationId,
        selectedVariantIndices: [variantIndex],
        feedback,
        quickTags,
        variantCount,
      });
      if (result?.variants) {
        const mapped = result.variants.map((v, i) => ({
          ...v,
          character_count: v.character_count || v.content?.length || 0,
          variant_index: i,
        }));
        setResults({ variants: mapped, quickTags: [...quickTags] });
        setHasUnsavedResults(true);
      }
    } catch (e) {
      toast.error(t("evolve.error"));
      setSettingsCollapsed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (results) {
      onApply?.(results.variants, results.quickTags);
      setHasUnsavedResults(false);
      onClose();
    }
  };

  const handleRetry = () => {
    setResults(null);
    setSettingsCollapsed(false);
    setHasUnsavedResults(false);
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı ✓");
  };

  const handleTweet = (content) => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`, "_blank");
  };

  // Textarea auto-grow
  const textareaRef = useRef(null);
  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Panel — desktop: right slide, mobile: bottom sheet */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-[#0A0A0A] flex flex-col shadow-2xl",
              // Desktop
              "sm:right-0 sm:top-0 sm:bottom-0 sm:w-[460px] sm:border-l sm:border-white/10 sm:rounded-none",
              // Mobile: full screen bottom sheet
              "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-12 max-sm:rounded-t-2xl max-sm:border-t max-sm:border-white/10"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── STICKY HEADER: Original reference ─── */}
            <div className="shrink-0 border-b border-white/8">
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Dna className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Geliştirme Stüdyosu</h3>
                    <p className="text-[11px] text-white/35">İnce ayar yap, karşılaştır, uygula</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white/50" />
                </button>
              </div>

              {/* Original text — sticky visible */}
              <div className="px-5 pb-3">
                <p className="text-[10px] uppercase tracking-wider text-white/20 mb-1.5">Orijinal Metin</p>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{originalContent}</p>
                </div>
              </div>
            </div>

            {/* ─── SCROLLABLE BODY ─── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* ─── SETTINGS SECTION (collapsible) ─── */}
              <div className="border-b border-white/5">
                <button
                  onClick={() => setSettingsCollapsed(!settingsCollapsed)}
                  className="flex items-center justify-between w-full px-5 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-white/70">
                      {settingsCollapsed ? "Ayarlar" : "Nasıl geliştireyim?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Show selected tags as badges when collapsed */}
                    {settingsCollapsed && quickTags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {quickTags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400/60 border border-violet-500/15">
                            {t(`evolve.tags.${tag}`, tag)}
                          </span>
                        ))}
                        {quickTags.length > 3 && (
                          <span className="text-[10px] text-white/30">+{quickTags.length - 3}</span>
                        )}
                      </div>
                    )}
                    {settingsCollapsed ? (
                      <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-white/30" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {!settingsCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 space-y-4">
                        {/* Quick tags */}
                        <EvolveQuickTags selectedTags={quickTags} onTagsChange={setQuickTags} />

                        {/* Feedback textarea — auto-grow */}
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-1.5">Ek yönerge (opsiyonel)</p>
                          <textarea
                            ref={textareaRef}
                            value={feedback}
                            onChange={handleFeedbackChange}
                            placeholder="Neyi değiştirmemi istersin?"
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-sm text-white/80 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 placeholder:text-white/20 transition-all min-h-[44px] max-h-[120px]"
                            rows={1}
                          />
                        </div>

                        {/* Variant count */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/40">Varyant:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                onClick={() => setVariantCount(n)}
                                className={cn(
                                  "w-7 h-7 rounded-md text-xs font-medium transition-all",
                                  variantCount === n
                                    ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40"
                                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                )}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── LOADING STATE ─── */}
              {loading && (
                <div className="px-5 py-8">
                  <div className="space-y-3">
                    {Array.from({ length: variantCount }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-xl border border-white/[0.04] p-4"
                      >
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-white/[0.06] rounded-full w-full" />
                          <div className="h-3 bg-white/[0.04] rounded-full w-4/5" />
                          <div className="h-3 bg-white/[0.03] rounded-full w-3/5" />
                        </div>
                      </motion.div>
                    ))}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                      <span className="text-xs text-violet-400/70">Yeni varyantlar üretiliyor...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── RESULTS ─── */}
              {results && !loading && (
                <div ref={resultsRef} className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      Sonuçlar ({results.variants.length})
                    </p>
                    {results.quickTags?.length > 0 && (
                      <div className="flex items-center gap-1">
                        {results.quickTags.map((tag, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/8 text-violet-400/50 border border-violet-500/15">
                            {t(`evolve.tags.${tag}`, tag)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {results.variants.map((variant, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-violet-500/20 hover:bg-violet-500/[0.02] transition-all duration-200"
                    >
                      <div className="px-4 py-3.5">
                        <p className="text-[13px] text-white/85 leading-[1.65] whitespace-pre-wrap">
                          {variant.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/20 tabular-nums">
                            {variant.content?.length || 0} karakter
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/8 text-violet-400/50">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(variant.content)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white/40 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Kopyala</span>
                          </button>
                          <button
                            onClick={() => handleTweet(variant.content)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-sky-400/60 hover:text-sky-400 hover:bg-sky-500/8 transition-all"
                          >
                            <Send className="h-3 w-3" />
                            <span className="hidden sm:inline">Tweetle</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── STICKY FOOTER ─── */}
            <div className="shrink-0 border-t border-white/8 px-5 py-3 bg-[#0A0A0A]/95 backdrop-blur-md">
              {results && !loading ? (
                /* Results mode: Apply or Retry */
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/8 transition-all"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Tekrar Dene
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/20"
                  >
                    <Check className="h-4 w-4" />
                    Değiştir
                  </button>
                </div>
              ) : (
                /* Settings mode: Generate */
                <div className="flex items-center gap-2">
                  {quickTags.length > 0 && (
                    <button
                      onClick={() => { setQuickTags([]); setFeedback(""); }}
                      className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 bg-white/3 hover:bg-white/5 transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Temizle
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                      loading
                        ? "bg-violet-500/20 text-violet-400/50 cursor-not-allowed"
                        : "text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 shadow-lg shadow-violet-500/20"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? "Üretiliyor..." : "Geliştir"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
