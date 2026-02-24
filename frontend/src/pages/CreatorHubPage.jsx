import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { User, Upload, Plus, X, Save, Loader2, AlertCircle, Check, Search, ChevronDown } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import { useAccount, getAccountAvatar } from "@/contexts/AccountContext";
import { useCreatorProfile } from "@/contexts/CreatorProfileContext";

/* ══════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════ */

const TONE_CONFIG = [
  { key: "informative", label: "Bilgi Verici", emoji: "📚", color: "from-blue-500 to-cyan-500", bg: "bg-blue-500", hex: "#3b82f6" },
  { key: "friendly", label: "Samimi", emoji: "🤝", color: "from-green-500 to-emerald-500", bg: "bg-green-500", hex: "#22c55e" },
  { key: "witty", label: "Esprili", emoji: "😏", color: "from-amber-500 to-orange-500", bg: "bg-amber-500", hex: "#f59e0b" },
  { key: "aggressive", label: "Agresif", emoji: "🔥", color: "from-red-500 to-rose-500", bg: "bg-red-500", hex: "#ef4444" },
  { key: "inspirational", label: "İlham Verici", emoji: "✨", color: "from-violet-500 to-fuchsia-500", bg: "bg-violet-500", hex: "#8b5cf6" },
];

const MAX_NICHES = 5;
const TOTAL_POINTS = 100;

const NICHE_CATEGORIES = {
  "Teknoloji": ["ai", "dev", "data", "security", "nocode", "gaming"],
  "İş Dünyası": ["saas", "startup", "marketing", "ecommerce", "finance", "freelance"],
  "Yaşam": ["health", "fitness", "food", "travel", "fashion", "pets"],
  "Yaratıcı": ["content", "video", "design", "photography", "music", "art"],
  "Bilgi": ["education", "science", "books", "news", "law", "hr"],
  "Diğer": ["crypto", "realestate", "sustainability", "politics", "automotive", "parenting", "diy", "motivation", "cinema", "community"],
};

// Dynamic AI persona summary based on tone distribution
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
  for (const entry of AI_PERSONA_MAP) {
    if (entry.check(tones)) return entry.text;
  }
  return "Kendine özgü bir sesteki yaratıcı";
}

/* ══════════════════════════════════════════
   GLASS CARD WRAPPER
   ══════════════════════════════════════════ */

function GlassCard({ children, className, hover = true }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm",
      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
      hover && "transition-all duration-300 hover:border-white/[0.1] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_20px_rgba(139,92,246,0.03)]",
      className
    )}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════
   TONE SLIDER (REFINED)
   ══════════════════════════════════════════ */

function ToneSlider({ config, value, otherTotal, onChange }) {
  const maxAllowed = TOTAL_POINTS - otherTotal;

  return (
    <div className="group space-y-1">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
          <span className="text-sm">{config.emoji}</span>
          {config.label}
        </span>
        <span className={cn(
          "text-[11px] font-mono font-bold tabular-nums transition-colors",
          value > 0 ? "text-white" : "text-zinc-700"
        )}>
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => value >= 5 && onChange(config.key, value - 5)}
          disabled={value < 5}
          className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-15 text-zinc-500 text-[10px] font-bold transition-all select-none shrink-0 border border-white/[0.04]"
        >
          −
        </button>
        <div className="relative flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out", config.color)}
            style={{ width: `${value}%` }}
          />
          {/* Glow effect on active slider */}
          {value > 0 && (
            <div
              className="absolute top-0 h-full rounded-full blur-sm opacity-30 transition-all duration-500"
              style={{ width: `${value}%`, background: config.hex }}
            />
          )}
          <input
            type="range"
            min={0}
            max={maxAllowed}
            value={value}
            onChange={(e) => onChange(config.key, parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ touchAction: "none" }}
          />
        </div>
        <button
          onClick={() => value + 5 <= maxAllowed && onChange(config.key, value + 5)}
          disabled={value + 5 > maxAllowed}
          className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-15 text-zinc-500 text-[10px] font-bold transition-all select-none shrink-0 border border-white/[0.04]"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   NICHE SELECTOR (CATEGORIZED + SEARCH)
   ══════════════════════════════════════════ */

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

  return (
    <div className="space-y-3">
      {selectedNiches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNiches.map(n => (
            <button
              key={n.slug}
              onClick={() => toggle(n.slug)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                bg-violet-500/10 border border-violet-400/20 text-violet-300
                hover:bg-violet-500/20 hover:border-violet-400/30
                shadow-[0_0_12px_rgba(139,92,246,0.08)]
                transition-all duration-200"
            >
              <span>{n.emoji}</span>
              <span>{n.label}</span>
              <X className="w-3 h-3 opacity-50" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Alan ara..."
          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
        />
      </div>

      {filteredTaxonomy ? (
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
          {filteredTaxonomy.map(n => {
            const isSel = selected.includes(n.slug);
            return (
              <button
                key={n.slug}
                onClick={() => toggle(n.slug)}
                disabled={atLimit && !isSel}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
                  isSel
                    ? "bg-violet-500/10 border-violet-400/20 text-violet-300"
                    : atLimit
                    ? "bg-zinc-900/20 border-zinc-800/20 text-zinc-700 cursor-not-allowed"
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300 cursor-pointer"
                )}
              >
                <span>{n.emoji}</span> {n.label}
              </button>
            );
          })}
          {filteredTaxonomy.length === 0 && <span className="text-xs text-zinc-600">Sonuç yok</span>}
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
                <button
                  onClick={() => setExpandedCat(isOpen ? null : cat)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200",
                    selCount > 0 ? "text-violet-300" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{cat}</span>
                    {selCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">{selCount}</span>
                    )}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div className={cn(
                  "transition-all duration-300 ease-out",
                  isOpen ? "max-h-40 opacity-100 pb-2" : "max-h-0 opacity-0"
                )} style={{ overflow: "hidden" }}>
                  <div className="flex flex-wrap gap-1.5 px-3 pt-1">
                    {catNiches.map(n => {
                      const isSel = selected.includes(n.slug);
                      return (
                        <button
                          key={n.slug}
                          onClick={() => toggle(n.slug)}
                          disabled={atLimit && !isSel}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all duration-200",
                            isSel
                              ? "bg-violet-500/10 border-violet-400/20 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.06)]"
                              : atLimit
                              ? "bg-zinc-900/20 border-zinc-800/20 text-zinc-700 cursor-not-allowed"
                              : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12] cursor-pointer"
                          )}
                        >
                          <span>{n.emoji}</span> {n.label}
                        </button>
                      );
                    })}
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

/* ══════════════════════════════════════════
   TAG INPUT (compact)
   ══════════════════════════════════════════ */

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
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-300 text-[11px]">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      {items.length < max && (
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
          />
          <button onClick={addItem} className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-zinc-500 transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   INLINE EDITABLE TEXT
   ══════════════════════════════════════════ */

function InlineEdit({ value, onChange, placeholder, className, inputClassName }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        placeholder={placeholder}
        maxLength={100}
        className={cn(
          "bg-transparent border-b border-violet-500/30 outline-none w-full text-center",
          inputClassName
        )}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "w-full text-center cursor-text transition-colors",
        value ? "" : "text-zinc-600",
        className
      )}
      title="Düzenlemek için tıkla"
    >
      {value || placeholder}
    </button>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */

export default function CreatorHubPage() {
  const { accounts } = useAccount();
  const { updateProfile } = useCreatorProfile();

  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [niches, setNiches] = useState([]);
  const [tones, setTones] = useState({ informative: 40, friendly: 40, witty: 20, aggressive: 0, inspirational: 0 });
  const [principles, setPrinciples] = useState([]);
  const [avoid, setAvoid] = useState([]);
  const [sampleVoice, setSampleVoice] = useState("");
  const [taxonomy, setTaxonomy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
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
      if (profile.brand_voice?.sample_voice) setSampleVoice(profile.brand_voice.sample_voice);
    }).catch(() => toast.error("Profil yüklenemedi"))
      .finally(() => setLoading(false));
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
      const base64 = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result.split(",")[1]); r.readAsDataURL(file); });
      const res = await api.post(`${API}/profile/avatar`, { source: "upload", data: base64, content_type: file.type });
      setAvatarUrl(res.data.avatar_url);
      updateProfile({ avatar_url: res.data.avatar_url });
      toast.success("Avatar güncellendi");
    } catch { toast.error("Avatar yüklenemedi"); }
    finally { setAvatarUploading(false); }
  };

  const fetchPlatformAvatar = async (platform) => {
    setAvatarUploading(true);
    try {
      const res = await api.post(`${API}/profile/avatar`, { source: platform });
      setAvatarUrl(res.data.avatar_url);
      updateProfile({ avatar_url: res.data.avatar_url });
      toast.success(`Avatar alındı`);
    } catch (err) { toast.error(err.response?.data?.detail || "Avatar alınamadı"); }
    finally { setAvatarUploading(false); }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.put(`${API}/profile`, {
        display_name: displayName || null, title: title || null, niches,
        brand_voice: { tones, principles, avoid, sample_voice: sampleVoice },
      });
      setDirty(false);
      updateProfile({ display_name: displayName || null, title: title || null, avatar_url: avatarUrl, niches, brand_voice: { tones, principles, avoid, sample_voice: sampleVoice } });
      toast.success("Profil kaydedildi ✨");
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Kayıt başarısız");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Creator Hub</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">Dijital DNA'nı tanımla</p>
        </div>
        <Button onClick={handleSave} disabled={!canSave} size="sm"
          className={cn("gap-1.5 text-xs h-8 rounded-xl", canSave ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20" : "")}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Kaydet
        </Button>
      </div>

      {/* ═══ BENTO GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── LEFT: Identity + Accounts ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* IDENTITY CARD */}
          <GlassCard className="p-6 relative overflow-hidden">
            {/* Radial glow behind avatar */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
            />

            <div className="relative flex flex-col items-center">
              {/* Avatar */}
              <div className="relative group mb-4">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <Avatar className="w-20 h-20 border-2 border-white/[0.08] group-hover:border-violet-500/30 transition-all duration-300 relative">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-zinc-900 text-zinc-500 text-xl font-light">
                    {displayName?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Avatar buttons */}
              <div className="flex gap-1 mb-5">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-all flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Yükle
                </button>
                {twitterAccount && (
                  <button onClick={() => fetchPlatformAvatar("twitter")} disabled={avatarUploading}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-all flex items-center gap-1">
                    <FaXTwitter className="w-2.5 h-2.5" /> Çek
                  </button>
                )}
                {instagramAccount && (
                  <button onClick={() => fetchPlatformAvatar("instagram")} disabled={avatarUploading}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-all flex items-center gap-1">
                    <FaInstagram className="w-2.5 h-2.5" /> Çek
                  </button>
                )}
              </div>

              {/* Inline editable name + title */}
              <InlineEdit
                value={displayName}
                onChange={(v) => { setDisplayName(v); markDirty(); }}
                placeholder="Adını gir"
                className="text-xl font-bold text-white tracking-tight hover:text-violet-300 transition-colors"
                inputClassName="text-xl font-bold text-white"
              />
              <InlineEdit
                value={title}
                onChange={(v) => { setTitle(v); markDirty(); }}
                placeholder="Unvan ekle"
                className="text-xs text-zinc-500 mt-1 hover:text-zinc-300 transition-colors"
                inputClassName="text-xs text-zinc-400 mt-1"
              />
            </div>
          </GlassCard>

          {/* ACCOUNTS */}
          <GlassCard className="p-5">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] mb-3">Bağlı Hesaplar</h3>
            {accounts.length === 0 ? (
              <p className="text-xs text-zinc-700">Henüz hesap yok</p>
            ) : (
              <div className="space-y-1.5">
                {accounts.map(acc => (
                  <div key={acc.id} className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200",
                    "hover:bg-white/[0.02]",
                    acc.status === "broken" && "bg-red-500/[0.03]"
                  )}>
                    <Avatar className="w-8 h-8 border border-white/[0.06]">
                      <AvatarImage src={getAccountAvatar(acc)} />
                      <AvatarFallback className="bg-zinc-900 text-zinc-500 text-[10px] font-medium">{acc.platform?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-200 truncate">@{acc.username}</span>
                        {acc.is_primary && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">Ana</span>}
                      </div>
                      <span className="text-[10px] text-zinc-600 capitalize">{acc.platform}</span>
                    </div>
                    {acc.status === "broken" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── RIGHT: Voice + Niches ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* BRAND VOICE */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white tracking-tight">🎙️ Marka Tonu</h3>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all duration-500",
                isExact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                toneTotal > TOTAL_POINTS ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                "bg-white/[0.03] text-zinc-500 border border-white/[0.06]"
              )}>
                {isExact ? <Check className="w-3 h-3" /> : toneTotal > TOTAL_POINTS ? <AlertCircle className="w-3 h-3" /> : null}
                {toneTotal}/{TOTAL_POINTS}
              </div>
            </div>

            {/* Composite bar */}
            <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden flex mb-1">
              {TONE_CONFIG.map(cfg => {
                const val = tones[cfg.key];
                if (val === 0) return null;
                return <div key={cfg.key} className={cn("h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full", cfg.bg)} style={{ width: `${val}%` }} />;
              })}
            </div>

            {/* AI Persona Summary */}
            <p className="text-[11px] italic text-zinc-600 mb-5 pl-0.5 transition-all duration-500">
              AI seni şöyle görüyor: <span className="text-zinc-400">{personaSummary}</span>
            </p>

            {/* Sliders */}
            <div className="space-y-3">
              {TONE_CONFIG.map(cfg => (
                <ToneSlider key={cfg.key} config={cfg} value={tones[cfg.key]} otherTotal={toneTotal - tones[cfg.key]} onChange={handleToneChange} />
              ))}
            </div>

            {/* Principles & Avoid */}
            <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/[0.04]">
              <div>
                <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium">📌 İlkelerim</label>
                <TagInput items={principles} onChange={v => { setPrinciples(v); markDirty(); }} placeholder="Kısa ve öz yaz" max={5} />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium">🚫 Kaçınılacaklar</label>
                <TagInput items={avoid} onChange={v => { setAvoid(v); markDirty(); }} placeholder="Emoji spam" max={5} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.04]">
              <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium">💬 Ses Tarifi</label>
              <textarea
                value={sampleVoice}
                onChange={(e) => { setSampleVoice(e.target.value); markDirty(); }}
                placeholder="Teknik ama samimi, jargonsuz açıkla..."
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 resize-none h-16 focus:outline-none focus:border-violet-500/30 transition-colors"
                maxLength={500}
              />
            </div>
          </GlassCard>

          {/* NICHES */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white tracking-tight">🎯 İlgi Alanları</h3>
              <Badge variant="outline" className={cn(
                "text-[10px] border-white/[0.08] rounded-full",
                niches.length >= MAX_NICHES ? "text-amber-400 border-amber-500/20" : "text-zinc-600"
              )}>
                {niches.length}/{MAX_NICHES}
              </Badge>
            </div>
            <NicheSelector taxonomy={taxonomy} selected={niches} onChange={(v) => { setNiches(v); markDirty(); }} max={MAX_NICHES} />
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
