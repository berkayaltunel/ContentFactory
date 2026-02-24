import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { User, Upload, Plus, X, Save, Loader2, AlertCircle, Check, Search, ChevronDown, Info, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import { useAccount, getAccountAvatar } from "@/contexts/AccountContext";
import { useCreatorProfile } from "@/contexts/CreatorProfileContext";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const TONE_CONFIG = [
  { key: "informative", label: "Bilgi Verici", short: "Bilgi", emoji: "📚", color: "from-blue-500 to-cyan-400", bg: "bg-blue-500", hex: "#3b82f6", rgb: "59,130,246" },
  { key: "friendly", label: "Samimi", short: "Samimi", emoji: "🤝", color: "from-emerald-500 to-green-400", bg: "bg-emerald-500", hex: "#10b981", rgb: "16,185,129" },
  { key: "witty", label: "Esprili", short: "Espri", emoji: "😏", color: "from-amber-500 to-yellow-400", bg: "bg-amber-500", hex: "#f59e0b", rgb: "245,158,11" },
  { key: "aggressive", label: "Agresif", short: "Agresif", emoji: "🔥", color: "from-red-500 to-rose-400", bg: "bg-red-500", hex: "#ef4444", rgb: "239,68,68" },
  { key: "inspirational", label: "İlham Verici", short: "İlham", emoji: "✨", color: "from-violet-500 to-fuchsia-400", bg: "bg-violet-500", hex: "#8b5cf6", rgb: "139,92,246" },
];

const MAX_NICHES = 5;
const TOTAL_POINTS = 100;

const PRINCIPLE_OPTIONS = [
  { key: "concise", label: "Kısa ve Öz", emoji: "✂️" },
  { key: "data-driven", label: "Veri Odaklı", emoji: "📊" },
  { key: "question-hook", label: "Soru ile Başla", emoji: "❓" },
  { key: "storytelling", label: "Hikayeleştirici", emoji: "📖" },
  { key: "actionable", label: "Uygulanabilir Tavsiye", emoji: "🎯" },
  { key: "personal", label: "Kişisel Deneyim", emoji: "💭" },
  { key: "contrarian", label: "Karşıt Görüş", emoji: "🔥" },
  { key: "educational", label: "Öğretici", emoji: "🎓" },
  { key: "thread-style", label: "Thread Formatı", emoji: "🧵" },
  { key: "visual-first", label: "Görsel Ağırlıklı", emoji: "🖼️" },
];

const AVOID_OPTIONS = [
  { key: "emoji-spam", label: "Emoji Spam", emoji: "🚫" },
  { key: "clickbait", label: "Tıklama Tuzağı", emoji: "🪤" },
  { key: "corporate", label: "Kurumsal Dil", emoji: "🏢" },
  { key: "slang", label: "Aşırı Argo", emoji: "🗣️" },
  { key: "generic", label: "Genel Geçer Klişe", emoji: "😴" },
  { key: "self-promo", label: "Sürekli Reklam", emoji: "📢" },
  { key: "negativity", label: "Negatif Ton", emoji: "👎" },
  { key: "jargon", label: "Teknik Jargon", emoji: "🤓" },
  { key: "long-winded", label: "Gereksiz Uzun", emoji: "📜" },
  { key: "hashtag-spam", label: "Hashtag Spam", emoji: "#️⃣" },
];

const AUDIENCE_OPTIONS = [
  { key: "beginners", label: "Yeni Başlayanlar", emoji: "🌱", desc: "Basit dil, sıfır jargon" },
  { key: "professionals", label: "Profesyoneller", emoji: "👔", desc: "Mesleki derinlik" },
  { key: "clevel", label: "C-Level", emoji: "👑", desc: "Stratejik, vizyoner" },
  { key: "founders", label: "Girişimciler", emoji: "🚀", desc: "Büyüme ve veri odaklı" },
];

const ARCHETYPES = [
  {
    key: "sage-founder",
    label: "Bilge Kurucu",
    emoji: "🧘",
    desc: "Sakin, derin, uzun vadeli düşünen",
    tones: { informative: 40, friendly: 25, witty: 15, aggressive: 0, inspirational: 20 },
    principles: ["data-driven", "storytelling", "actionable"],
    avoid: ["clickbait", "emoji-spam", "slang"],
    audience: "founders",
  },
  {
    key: "growth-hacker",
    label: "Büyüme Uzmanı",
    emoji: "📈",
    desc: "Agresif, veri odaklı, cesur",
    tones: { informative: 30, friendly: 5, witty: 15, aggressive: 35, inspirational: 15 },
    principles: ["data-driven", "contrarian", "concise"],
    avoid: ["corporate", "generic", "long-winded"],
    audience: "founders",
  },
  {
    key: "friendly-creator",
    label: "Samimi Hikayeci",
    emoji: "💬",
    desc: "Kişisel, sıcak, erişilebilir",
    tones: { informative: 15, friendly: 45, witty: 25, aggressive: 0, inspirational: 15 },
    principles: ["personal", "storytelling", "question-hook"],
    avoid: ["corporate", "jargon", "self-promo"],
    audience: "beginners",
  },
  {
    key: "sharp-wit",
    label: "Keskin Zeka",
    emoji: "🎯",
    desc: "İronik, keskin, viral potansiyel",
    tones: { informative: 10, friendly: 10, witty: 55, aggressive: 20, inspirational: 5 },
    principles: ["contrarian", "concise"],
    avoid: ["generic", "emoji-spam", "clickbait"],
    audience: "professionals",
  },
];

const NICHE_CATEGORIES = {
  "Teknoloji": ["ai", "dev", "data", "security", "nocode", "gaming"],
  "İş Dünyası": ["saas", "startup", "marketing", "ecommerce", "finance", "freelance"],
  "Yaşam": ["health", "fitness", "food", "travel", "fashion", "pets"],
  "Yaratıcı": ["content", "video", "design", "photography", "music", "art"],
  "Bilgi": ["education", "science", "books", "news", "law", "hr"],
  "Diğer": ["crypto", "realestate", "sustainability", "politics", "automotive", "parenting", "diy", "motivation", "cinema", "community"],
};

const AI_PERSONA_MAP = [
  { check: (t) => t.witty >= 50 && t.informative >= 30, text: "Eğlendirirken öğreten, hazırcevap bir profesyonel" },
  { check: (t) => t.witty >= 60, text: "Keskin zekasıyla dikkat çeken, esprili bir içerik makinesi" },
  { check: (t) => t.aggressive >= 50, text: "Sözünü esirgemeyen, provokatif bir düşünce lideri" },
  { check: (t) => t.inspirational >= 50, text: "İlham veren, vizyoner bir hikaye anlatıcısı" },
  { check: (t) => t.friendly >= 50 && t.informative >= 30, text: "Samimi üslubuyla bilgi paylaşan, güvenilir bir rehber" },
  { check: (t) => t.friendly >= 60, text: "Sıcak ve samimi, herkesin yakınlık hissettiği bir ses" },
  { check: (t) => t.informative >= 60, text: "Veriyle konuşan, net ve otoriteli bir uzman" },
  { check: (t) => t.informative >= 40 && t.friendly >= 40, text: "Bilgili ama erişilebilir, dengeli bir içerik üreticisi" },
];

function getAIPersonaSummary(tones) {
  for (const entry of AI_PERSONA_MAP) { if (entry.check(tones)) return entry.text; }
  return "Kendine özgü bir sesteki yaratıcı";
}

function getDominantTone(tones) {
  let max = 0, dominant = TONE_CONFIG[0];
  for (const cfg of TONE_CONFIG) { if (tones[cfg.key] > max) { max = tones[cfg.key]; dominant = cfg; } }
  return dominant;
}

/* ═══════════════════════════════════════════════════
   ANIMATED AURORA BACKGROUND (for ID card)
   ═══════════════════════════════════════════════════ */

function AuroraBackground({ tones }) {
  const dominant = getDominantTone(tones);
  const sorted = [...TONE_CONFIG].sort((a, b) => tones[b.key] - tones[a.key]);
  const primary = sorted[0];
  const secondary = sorted[1]?.key && tones[sorted[1].key] > 0 ? sorted[1] : primary;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Base dark */}
      <div className="absolute inset-0 bg-zinc-950" />
      {/* Primary blob */}
      <div
        className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 animate-[spin_20s_linear_infinite] opacity-[0.12]"
        style={{
          background: `conic-gradient(from 0deg, rgba(${primary.rgb},0.6), transparent 120deg, rgba(${secondary.rgb},0.4) 240deg, transparent 360deg)`,
        }}
      />
      {/* Secondary glow */}
      <div
        className="absolute w-40 h-40 rounded-full blur-3xl opacity-[0.25] transition-all duration-[2000ms]"
        style={{
          background: `radial-gradient(circle, rgba(${dominant.rgb},0.8), transparent 70%)`,
          top: "20%", left: "50%", transform: "translateX(-50%)",
        }}
      />
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }} />
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TONE RADAR CHART
   ═══════════════════════════════════════════════════ */

function ToneRadar({ tones }) {
  const data = TONE_CONFIG.map(cfg => ({
    subject: cfg.short,
    value: tones[cfg.key],
    fullMark: 100,
  }));

  const dominant = getDominantTone(tones);

  return (
    <div className="w-full aspect-square max-w-[200px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 500 }}
          />
          <Radar
            dataKey="value"
            stroke={dominant.hex}
            fill={dominant.hex}
            fillOpacity={0.15}
            strokeWidth={1.5}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GLASS CARD
   ═══════════════════════════════════════════════════ */

function GlassCard({ children, className, hover = true }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/10",
      "bg-zinc-900/40 backdrop-blur-2xl",
      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_8px_32px_rgba(0,0,0,0.5)]",
      hover && "transition-all duration-500 hover:border-white/[0.15] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_12px_40px_rgba(0,0,0,0.6)] hover:-translate-y-0.5",
      className
    )}>
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent rounded-t-2xl" />
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TONE SLIDER
   ═══════════════════════════════════════════════════ */

function ToneSlider({ config, value, otherTotal, onChange }) {
  const maxAllowed = TOTAL_POINTS - otherTotal;
  return (
    <div className="group flex items-center gap-3">
      <span className="text-sm w-5 text-center shrink-0">{config.emoji}</span>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-600 group-hover:text-zinc-400 transition-colors font-medium">{config.label}</span>
          <span className={cn("text-[10px] font-mono tabular-nums font-medium transition-colors", value > 0 ? "text-zinc-300" : "text-zinc-800")}>{value}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => value >= 5 && onChange(config.key, value - 5)} disabled={value < 5}
            className="w-5 h-5 flex items-center justify-center rounded bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.08] disabled:opacity-10 text-zinc-600 text-[9px] font-bold transition-all select-none shrink-0">−</button>
          <div className="relative flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out", config.color)} style={{ width: `${value}%` }} />
            {value > 0 && <div className="absolute top-0 h-full rounded-full blur-[3px] opacity-40 transition-all duration-500" style={{ width: `${value}%`, background: config.hex }} />}
            <input type="range" min={0} max={maxAllowed} value={value} onChange={(e) => onChange(config.key, parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ touchAction: "none" }} />
          </div>
          <button onClick={() => value + 5 <= maxAllowed && onChange(config.key, value + 5)} disabled={value + 5 > maxAllowed}
            className="w-5 h-5 flex items-center justify-center rounded bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.08] disabled:opacity-10 text-zinc-600 text-[9px] font-bold transition-all select-none shrink-0">+</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   NICHE SELECTOR
   ═══════════════════════════════════════════════════ */

function NicheSelector({ taxonomy, selected, onChange, max }) {
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const atLimit = selected.length >= max;

  const filteredTaxonomy = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return taxonomy.filter(n => n.label.toLowerCase().includes(q) || n.slug.includes(q));
  }, [search, taxonomy]);

  const toggle = (slug) => {
    if (selected.includes(slug)) onChange(selected.filter(s => s !== slug));
    else if (selected.length < max) onChange([...selected, slug]);
  };

  const selectedNiches = taxonomy.filter(n => selected.includes(n.slug));

  const Chip = ({ n, isSel }) => (
    <button
      onClick={() => toggle(n.slug)}
      disabled={atLimit && !isSel}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all duration-200",
        isSel
          ? "bg-violet-500/10 border-violet-400/20 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.06)]"
          : atLimit && !isSel
          ? "bg-zinc-900/20 border-zinc-800/20 text-zinc-700 cursor-not-allowed"
          : "bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300 cursor-pointer"
      )}
    >
      <span>{n.emoji}</span> {n.label}
      {isSel && <X className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
    </button>
  );

  return (
    <div className="space-y-3">
      {selectedNiches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNiches.map(n => <Chip key={n.slug} n={n} isSel={true} />)}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Alan ara..."
          className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-colors" />
      </div>
      {filteredTaxonomy ? (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
          {filteredTaxonomy.map(n => <Chip key={n.slug} n={n} isSel={selected.includes(n.slug)} />)}
          {filteredTaxonomy.length === 0 && <span className="text-[11px] text-zinc-700">Sonuç yok</span>}
        </div>
      ) : (
        <div className="space-y-0.5">
          {Object.entries(NICHE_CATEGORIES).map(([cat, slugs]) => {
            const catNiches = taxonomy.filter(n => slugs.includes(n.slug));
            if (!catNiches.length) return null;
            const isOpen = expandedCat === cat;
            const selCount = catNiches.filter(n => selected.includes(n.slug)).length;
            return (
              <div key={cat} className="overflow-hidden">
                <button onClick={() => setExpandedCat(isOpen ? null : cat)}
                  className={cn("w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] transition-all duration-200", selCount > 0 ? "text-violet-300" : "text-zinc-600 hover:text-zinc-400")}>
                  <span className="flex items-center gap-2 font-medium">
                    {cat}
                    {selCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400">{selCount}</span>}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div className={cn("transition-all duration-300 ease-out overflow-hidden", isOpen ? "max-h-40 opacity-100 pb-2" : "max-h-0 opacity-0")}>
                  <div className="flex flex-wrap gap-1.5 px-3 pt-1">
                    {catNiches.map(n => <Chip key={n.slug} n={n} isSel={selected.includes(n.slug)} />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAG INPUT
   ═══════════════════════════════════════════════════ */

function TagInput({ items, onChange, placeholder, max = 5 }) {
  const [input, setInput] = useState("");
  const addItem = () => {
    const val = input.trim();
    if (!val || items.length >= max) return;
    if (!items.includes(val)) onChange([...items, val]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.05] text-zinc-400 text-[10px]">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      {items.length < max && (
        <div className="flex gap-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder={placeholder} className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-colors" />
          <button onClick={addItem} className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-zinc-600 transition-colors"><Plus className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CHIP SELECTOR (Pre-defined options)
   ═══════════════════════════════════════════════════ */

function ChipSelector({ options, selected, onChange, max = 5 }) {
  const toggle = (key) => {
    if (selected.includes(key)) onChange(selected.filter(s => s !== key));
    else if (selected.length < max) onChange([...selected, key]);
  };
  const atLimit = selected.length >= max;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isSel = selected.includes(opt.key);
        return (
          <button key={opt.key} onClick={() => toggle(opt.key)} disabled={atLimit && !isSel}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all duration-200",
              isSel
                ? "bg-violet-500/10 border-violet-400/20 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.06)]"
                : atLimit && !isSel
                ? "bg-zinc-900/20 border-zinc-800/20 text-zinc-700 cursor-not-allowed"
                : "bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300 cursor-pointer"
            )}>
            <span>{opt.emoji}</span> {opt.label}
            {isSel && <X className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════ */

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info className="w-3 h-3 text-zinc-600 hover:text-zinc-400 transition-colors cursor-help" />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 leading-relaxed w-56 shadow-xl z-50 animate-[fadeIn_0.15s_ease-out]">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-r border-b border-white/10 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   INLINE EDIT
   ═══════════════════════════════════════════════════ */

function InlineEdit({ value, onChange, placeholder, className, inputClassName }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  if (editing) {
    return <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(false)} placeholder={placeholder} maxLength={100}
      className={cn("bg-transparent border-b border-violet-500/30 outline-none w-full text-center", inputClassName)} />;
  }
  return <button onClick={() => setEditing(true)} className={cn("w-full text-center cursor-text transition-colors group", value ? "" : "text-zinc-700", className)} title="Tıkla → düzenle">
    {value || placeholder}
    <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-zinc-600 text-[10px]">✎</span>
  </button>;
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function CreatorHubPage() {
  const { accounts } = useAccount();
  const { updateProfile } = useCreatorProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [niches, setNiches] = useState([]);
  const [tones, setTones] = useState({ informative: 40, friendly: 40, witty: 20, aggressive: 0, inspirational: 0 });
  const [principles, setPrinciples] = useState([]);
  const [avoid, setAvoid] = useState([]);
  const [targetAudience, setTargetAudience] = useState(null);
  const [taxonomy, setTaxonomy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeInsight, setAnalyzeInsight] = useState("");
  const [dnaPreview, setDnaPreview] = useState("");
  const [dnaLoading, setDnaLoading] = useState(false);
  const fileInputRef = useRef(null);

  const toneTotal = Object.values(tones).reduce((a, b) => a + b, 0);
  const isExact = toneTotal === TOTAL_POINTS;
  const canSave = dirty && isExact && !saving;
  const personaSummary = useMemo(() => getAIPersonaSummary(tones), [tones]);

  const twitterAccount = accounts.find(a => a.platform === "twitter" && a.status === "active");
  const instagramAccount = accounts.find(a => a.platform === "instagram" && a.status === "active");

  useEffect(() => {
    Promise.all([
      api.get(`${API}/profile`).then(r => r.data),
      api.get(`${API}/profile/taxonomy`).then(r => r.data),
    ]).then(([profile, tax]) => {
      setTaxonomy(tax);
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.title) setTitle(profile.title);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      if (profile.niches?.length) setNiches(profile.niches);
      if (profile.brand_voice?.tones) setTones(profile.brand_voice.tones);
      if (profile.brand_voice?.principles) setPrinciples(profile.brand_voice.principles);
      if (profile.brand_voice?.avoid) setAvoid(profile.brand_voice.avoid);
      if (profile.brand_voice?.target_audience) setTargetAudience(profile.brand_voice.target_audience);
    }).catch(() => toast.error("Profil yüklenemedi")).finally(() => setLoading(false));
  }, []);

  const markDirty = useCallback(() => setDirty(true), []);
  const handleToneChange = useCallback((key, val) => {
    setTones(prev => {
      const otherTotal = Object.entries(prev).reduce((sum, [k, v]) => k === key ? sum : sum + v, 0);
      return { ...prev, [key]: Math.max(0, Math.min(val, TOTAL_POINTS - otherTotal)) };
    });
    markDirty();
  }, [markDirty]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("JPEG, PNG veya WebP"); return; }
    setAvatarUploading(true);
    try {
      const base64 = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(",")[1]); f.readAsDataURL(file); });
      const res = await api.post(`${API}/profile/avatar`, { source: "upload", data: base64, content_type: file.type });
      setAvatarUrl(res.data.avatar_url); updateProfile({ avatar_url: res.data.avatar_url }); toast.success("Avatar güncellendi");
    } catch { toast.error("Avatar yüklenemedi"); } finally { setAvatarUploading(false); }
  };

  const fetchPlatformAvatar = async (platform) => {
    setAvatarUploading(true);
    try {
      const res = await api.post(`${API}/profile/avatar`, { source: platform });
      setAvatarUrl(res.data.avatar_url); updateProfile({ avatar_url: res.data.avatar_url }); toast.success("Avatar alındı");
    } catch (err) { toast.error(err.response?.data?.detail || "Avatar alınamadı"); } finally { setAvatarUploading(false); }
  };

  const handleAnalyzeTone = async () => {
    if (!twitterAccount) { toast.error("Önce bir Twitter hesabı bağlayın"); return; }
    setAnalyzing(true);
    setAnalyzeInsight("");
    try {
      const res = await api.post(`${API}/profile/analyze-tone`, { twitter_username: twitterAccount.username });
      const { tones: newTones, insight } = res.data;
      setTones(newTones);
      setAnalyzeInsight(insight || "");
      markDirty();
      toast.success(`@${twitterAccount.username} tonu analiz edildi! ✨`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analiz başarısız");
    } finally { setAnalyzing(false); }
  };

  const [dnaTrendTopic, setDnaTrendTopic] = useState("");

  const [dnaDraftId, setDnaDraftId] = useState(null);

  const handleDnaTest = async () => {
    setDnaLoading(true);
    setDnaPreview("");
    setDnaTrendTopic("");
    setDnaDraftId(null);
    try {
      const res = await api.post(`${API}/profile/dna-test`, { tones, principles, avoid, target_audience: targetAudience });
      setDnaPreview(res.data?.content || "");
      setDnaTrendTopic(res.data?.trend_topic || "");
      setDnaDraftId(res.data?.draft_id || null);
    } catch (err) {
      toast.error("Örnek üretilemedi");
    } finally { setDnaLoading(false); }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.put(`${API}/profile`, { display_name: displayName || null, title: title || null, niches, brand_voice: { tones, principles, avoid, target_audience: targetAudience } });
      setDirty(false);
      updateProfile({ display_name: displayName || null, title: title || null, avatar_url: avatarUrl, niches, brand_voice: { tones, principles, avoid, target_audience: targetAudience } });
      toast.success("Profil kaydedildi ✨");
    } catch (err) { toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Kayıt başarısız"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Header + Completion Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Creator Hub</h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mt-1">Dijital DNA</p>
          </div>
          {(() => {
            const steps = [
              displayName,
              avatarUrl,
              niches.length > 0,
              isExact,
              targetAudience,
            ].filter(Boolean).length;
            return (
              <span className={cn(
                "text-[10px] px-2.5 py-1 rounded-full font-mono font-medium border",
                steps >= 5
                  ? "bg-emerald-500/8 text-emerald-400 border-emerald-500/15"
                  : "bg-white/[0.02] text-zinc-600 border-white/[0.06]"
              )}>
                {steps}/5 Adım
              </span>
            );
          })()}
        </div>
        <Button onClick={handleSave} disabled={!canSave} size="sm"
          className={cn("gap-1.5 text-[11px] h-8 rounded-xl font-medium", canSave ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20" : "")}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Kaydet
        </Button>
      </div>

      {/* ═══ ARCHETYPES — Başlangıç Noktaları ═══ */}
      {!displayName && !dirty && (
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.2em] mb-1">Başlangıç Noktaları</h3>
          <p className="text-[10px] text-zinc-700 mb-3">Bir arketip seç, sonra sürgülerle kendi imzanı at</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ARCHETYPES.map(arch => (
              <button key={arch.key} onClick={() => {
                setTones(arch.tones);
                setPrinciples(arch.principles);
                setAvoid(arch.avoid);
                setTargetAudience(arch.audience);
                markDirty();
                toast.success(`${arch.label} şablonu yüklendi, ince ayar yapabilirsin`);
              }}
                className="group p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-violet-500/20 hover:bg-violet-500/5 transition-all text-left">
                <span className="text-xl mb-1.5 block">{arch.emoji}</span>
                <p className="text-[11px] font-medium text-white/80 group-hover:text-white transition-colors">{arch.label}</p>
                <p className="text-[9px] text-zinc-700 mt-0.5">{arch.desc}</p>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ═══ BENTO GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* APPLE WALLET ID CARD */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_8px_32px_rgba(0,0,0,0.5)]">
            <AuroraBackground tones={tones} />

            <div className="relative z-10 p-8 flex flex-col items-center">
              {/* TYPE HYPE badge */}
              <span className="text-[8px] uppercase tracking-[0.25em] text-white/20 font-medium mb-6">Type Hype Creator ID</span>

              {/* Avatar */}
              <div className="relative group mb-5">
                <div className="absolute -inset-2 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] transition-all duration-700" />
                <Avatar className="w-24 h-24 border border-white/[0.1] relative shadow-2xl">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-zinc-900/80 text-zinc-500 text-2xl font-light">
                    {displayName?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                {avatarUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>}
              </div>

              {/* Avatar buttons */}
              <div className="flex gap-2 mb-6">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                  className="text-[9px] text-white/30 hover:text-white/60 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all flex items-center gap-1 uppercase tracking-wider">
                  <Upload className="w-2.5 h-2.5" /> Yükle
                </button>
                {twitterAccount && <button onClick={() => fetchPlatformAvatar("twitter")} disabled={avatarUploading}
                  className="text-[9px] text-white/30 hover:text-white/60 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all flex items-center gap-1 uppercase tracking-wider">
                  <FaXTwitter className="w-2.5 h-2.5" /> X
                </button>}
                {instagramAccount && <button onClick={() => fetchPlatformAvatar("instagram")} disabled={avatarUploading}
                  className="text-[9px] text-white/30 hover:text-white/60 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all flex items-center gap-1 uppercase tracking-wider">
                  <FaInstagram className="w-2.5 h-2.5" /> IG
                </button>}
              </div>

              {/* Name + title */}
              <InlineEdit value={displayName} onChange={v => { setDisplayName(v); markDirty(); }} placeholder="Adınız"
                className="text-2xl font-bold text-white/90 tracking-tight hover:text-white transition-colors"
                inputClassName="text-2xl font-bold text-white" />
              <InlineEdit value={title} onChange={v => { setTitle(v); markDirty(); }} placeholder="Unvan"
                className="text-[11px] text-white/25 mt-1.5 hover:text-white/50 transition-colors uppercase tracking-[0.1em]"
                inputClassName="text-[11px] text-white/50 mt-1.5 uppercase tracking-[0.1em]" />

              {/* AI Summary on card */}
              <div className="mt-6 pt-4 border-t border-white/[0.04] w-full text-center">
                <p className="text-[10px] text-white/15 uppercase tracking-[0.15em] mb-1">AI Profili</p>
                <p className="text-[11px] text-white/40 italic leading-relaxed transition-all duration-500">{personaSummary}</p>
              </div>
            </div>
          </div>

          {/* ACCOUNTS */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.2em]">Bağlı Hesaplar</h3>
              <button onClick={() => window.dispatchEvent(new CustomEvent("open-settings-modal"))} className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-violet-400 transition-colors uppercase tracking-wider">
                <Link2 className="w-3 h-3" /> Ekle
              </button>
            </div>
            {accounts.length === 0 ? (
              <p className="text-[11px] text-zinc-700">Henüz hesap yok</p>
            ) : (
              <div className="space-y-1">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.02] transition-all">
                    <Avatar className="w-7 h-7 border border-white/[0.06]">
                      <AvatarImage src={getAccountAvatar(acc)} />
                      <AvatarFallback className="bg-zinc-900 text-zinc-600 text-[9px]">{acc.platform?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-300 truncate block">@{acc.username}</span>
                      <span className="text-[9px] text-zinc-600 capitalize">{acc.platform}</span>
                    </div>
                    {acc.is_primary && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium uppercase tracking-wider">Ana</span>}
                    {acc.status === "broken" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* BRAND VOICE */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center">
                  Kişisel Sesin
                  <InfoTooltip text="Bu dağılım, AI koçunuzun ve içerik üreticinizin ana karakterini belirler. 'Analiz Et' butonuyla otomatik doldurabilirsiniz." />
                </h3>
                <p className="text-[10px] text-zinc-600 mt-0.5">Yaratıcı DNA · {TOTAL_POINTS} puanı dağıt</p>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all duration-500",
                isExact ? "bg-emerald-500/8 text-emerald-400 border border-emerald-500/15" :
                toneTotal > TOTAL_POINTS ? "bg-red-500/8 text-red-400 border border-red-500/15 animate-pulse" :
                "bg-white/[0.02] text-zinc-600 border border-white/[0.05]"
              )}>
                {isExact ? <Check className="w-3 h-3" /> : toneTotal > TOTAL_POINTS ? <AlertCircle className="w-3 h-3" /> : null}
                {toneTotal}/{TOTAL_POINTS}
              </div>
            </div>

            {/* AI Analyze Button */}
            {twitterAccount && (
              <div className="mb-5">
                <button
                  onClick={handleAnalyzeTone}
                  disabled={analyzing}
                  className={cn(
                    "w-full relative overflow-hidden rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-500",
                    analyzing
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300 cursor-wait"
                      : "border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 text-violet-300 hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:-translate-y-0.5"
                  )}
                >
                  {/* Shimmer effect */}
                  {!analyzing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
                  )}
                  <div className="relative flex items-center justify-center gap-2">
                    {analyzing ? (
                      <>
                        <span className="text-lg animate-bounce">🐙</span>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>DNA'nı çözümlüyorum...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">✨</span>
                        <span>X Profilimden Analiz Et</span>
                        <FaXTwitter className="w-3.5 h-3.5 opacity-50" />
                      </>
                    )}
                  </div>
                </button>
                {analyzeInsight && (
                  <div className="mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-violet-500/5 border border-violet-500/10 animate-[fadeIn_0.5s_ease-out]">
                    <span className="text-xl shrink-0">🐙</span>
                    <p className="text-[11px] text-violet-300/80 leading-relaxed italic">{analyzeInsight}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-6">
              {/* Left: Sliders */}
              <div>
                {/* Composite bar */}
                <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden flex mb-5">
                  {TONE_CONFIG.map(cfg => {
                    const val = tones[cfg.key];
                    if (val === 0) return null;
                    return <div key={cfg.key} className={cn("h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full", cfg.bg)} style={{ width: `${val}%` }} />;
                  })}
                </div>

                <div className="space-y-2.5">
                  {TONE_CONFIG.map(cfg => (
                    <ToneSlider key={cfg.key} config={cfg} value={tones[cfg.key]} otherTotal={toneTotal - tones[cfg.key]} onChange={handleToneChange} />
                  ))}
                </div>
              </div>

              {/* Right: Radar */}
              <div className="hidden sm:flex flex-col items-center justify-center">
                <ToneRadar tones={tones} />
              </div>
            </div>

            {/* Principles & Avoid — Pre-defined Chips */}
            <div className="grid sm:grid-cols-2 gap-5 mt-6 pt-5 border-t border-white/[0.04]">
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 font-semibold mb-2 block">İçerik İlkeleri <span className="text-zinc-800 normal-case tracking-normal">(max 5)</span></label>
                <ChipSelector options={PRINCIPLE_OPTIONS} selected={principles} onChange={v => { setPrinciples(v); markDirty(); }} max={5} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 font-semibold mb-2 block">Kaçınılacaklar <span className="text-zinc-800 normal-case tracking-normal">(max 5)</span></label>
                <ChipSelector options={AVOID_OPTIONS} selected={avoid} onChange={v => { setAvoid(v); markDirty(); }} max={5} />
              </div>
            </div>

            {/* Target Audience — Single Select */}
            <div className="mt-5 pt-5 border-t border-white/[0.04]">
              <label className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 font-semibold mb-2.5 block">Kime Konuşuyorsun?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AUDIENCE_OPTIONS.map(opt => {
                  const isSel = targetAudience === opt.key;
                  return (
                    <button key={opt.key} onClick={() => { setTargetAudience(isSel ? null : opt.key); markDirty(); }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all duration-200",
                        isSel
                          ? "bg-violet-500/10 border-violet-400/20 shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                          : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1]"
                      )}>
                      <span className="text-sm block mb-0.5">{opt.emoji}</span>
                      <p className={cn("text-[10px] font-medium", isSel ? "text-violet-300" : "text-zinc-500")}>{opt.label}</p>
                      <p className="text-[8px] text-zinc-700 mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* NICHES */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">İlgi Alanları</h3>
                <p className="text-[10px] text-zinc-600 mt-0.5">Trendler ve AI Coach bu alanlara odaklanır</p>
              </div>
              <Badge variant="outline" className={cn("text-[9px] border-white/[0.06] rounded-full font-mono", niches.length >= MAX_NICHES ? "text-amber-400 border-amber-500/15" : "text-zinc-700")}>
                {niches.length}/{MAX_NICHES}
              </Badge>
            </div>
            <NicheSelector taxonomy={taxonomy} selected={niches} onChange={v => { setNiches(v); markDirty(); }} max={MAX_NICHES} />
          </GlassCard>

          {/* DNA TEST — Instant Gratification */}
          <GlassCard className="p-6" hover={false}>
            {niches.length === 0 && (
              <p className="text-[11px] text-zinc-600 italic mb-2 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-zinc-700" />
                AI koçunuzun gündemi yakalaması için önce yukarıdan en az 1 ilgi alanı seçin
              </p>
            )}
            <button
              onClick={handleDnaTest}
              disabled={dnaLoading || !isExact || niches.length === 0}
              className={cn(
                "w-full relative overflow-hidden rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-500",
                niches.length === 0
                  ? "border-zinc-800 bg-zinc-900/30 text-zinc-700 cursor-not-allowed"
                  : dnaLoading
                  ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 cursor-wait"
                  : "border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-fuchsia-500/10 text-fuchsia-300 hover:border-fuchsia-500/40 hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] hover:-translate-y-0.5"
              )}
            >
              {!dnaLoading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />}
              <div className="relative flex items-center justify-center gap-2">
                {dnaLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Sesinle yazıyorum...</span></>
                ) : (
                  <><span className="text-lg">🧬</span><span>Bu DNA ile Örnek Tweet Üret</span></>
                )}
              </div>
            </button>
            {dnaPreview && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em]">Senin Sesinle</p>
                  {dnaTrendTopic && <span className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/15 truncate max-w-[200px]">📰 {dnaTrendTopic}</span>}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{dnaPreview}</p>
                <div className="flex items-center gap-3 mt-3">
                  {dnaDraftId && (
                    <button onClick={() => navigate(`/dashboard/create?draft_id=${dnaDraftId}`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                      <span>✨</span> Bu Taslakla İçerik Üret
                    </button>
                  )}
                  <button onClick={() => { navigator.clipboard.writeText(dnaPreview); toast.success("Kopyalandı!"); }}
                    className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">Kopyala</button>
                  <button onClick={handleDnaTest}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Tekrar Üret</button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Mobile sticky save */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
          <Button onClick={handleSave} disabled={!canSave} size="lg"
            className={cn("shadow-2xl gap-2 rounded-full px-6", canSave ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/25" : "bg-zinc-800 text-zinc-500")}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {!isExact ? `${toneTotal}/${TOTAL_POINTS}` : "Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
