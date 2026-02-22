import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy, Heart, Send, ArrowRight, Dna, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function EvolveSlideOver({ open, onClose, originalContent, variants, quickTags, onCopy }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    // Delay to prevent immediate close from the click that opened it
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [open, onClose]);

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı ✓");
    onCopy?.(content);
  };

  const handleTweet = (content) => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`, "_blank");
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-[#0A0A0A] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Dna className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Geliştirme Sonuçları</h3>
                  <p className="text-[11px] text-white/40">{variants?.length || 0} varyant üretildi</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>

            {/* Quick tags */}
            {quickTags?.length > 0 && (
              <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-white/5 shrink-0">
                <span className="text-[10px] text-white/30">Filtreler:</span>
                {quickTags.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400/80 border border-violet-500/20">
                    {t(`evolve.tags.${tag}`, tag)}
                  </span>
                ))}
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Original reference */}
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Orijinal</p>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-xs text-white/50 line-clamp-3 leading-relaxed">{originalContent}</p>
                </div>
                <div className="flex items-center justify-center mt-3">
                  <ArrowRight className="h-3 w-3 text-violet-500/40 rotate-90" />
                </div>
              </div>

              {/* New variants */}
              <div className="px-5 py-3 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-white/25">Yeni Versiyonlar</p>
                {variants?.map((variant, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-violet-500/25 hover:bg-violet-500/[0.03] transition-all duration-200"
                  >
                    {/* Variant content */}
                    <div className="px-4 py-3.5">
                      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                        {variant.content}
                      </p>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/25 tabular-nums">
                          {variant.content?.length || 0} karakter
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400/60">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(variant.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Copy className="h-3 w-3" /> Kopyala
                        </button>
                        <button
                          onClick={() => handleTweet(variant.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-sky-400/70 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                        >
                          <Send className="h-3 w-3" /> Tweetle
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/8 shrink-0">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Geri dön
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
