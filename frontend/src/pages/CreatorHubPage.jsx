import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { User, Upload, Plus, X, Save, Loader2, AlertCircle, Check, Search, ChevronDown } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { key: "informative", label: "Bilgi Verici", emoji: "📚", color: "from-blue-500 to-cyan-500", bg: "bg-blue-500" },
  { key: "friendly", label: "Samimi", emoji: "🤝", color: "from-green-500 to-emerald-500", bg: "bg-green-500" },
  { key: "witty", label: "Esprili", emoji: "😏", color: "from-yellow-500 to-orange-500", bg: "bg-yellow-500" },
  { key: "aggressive", label: "Agresif", emoji: "🔥", color: "from-red-500 to-rose-500", bg: "bg-red-500" },
  { key: "inspirational", label: "İlham Verici", emoji: "✨", color: "from-violet-500 to-fuchsia-500", bg: "bg-violet-500" },
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

/* ══════════════════════════════════════════
   TONE SLIDER (RPG STYLE - BUG FIXED)
   ══════════════════════════════════════════ */

function ToneSlider({ config, value, otherTotal, onChange }) {
  // Max this slider can go = TOTAL_POINTS - sum of OTHER sliders
  const maxAllowed = TOTAL_POINTS - otherTotal;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </span>
        <span className={cn(
          "text-xs font-mono font-bold tabular-nums",
          value > 0 ? "text-white" : "text-zinc-600"
        )}>
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => value >= 5 && onChange(config.key, value - 5)}
          disabled={value < 5}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-20 text-zinc-400 text-xs font-bold transition-colors select-none shrink-0"
        >
          −
        </button>
        <div className="relative flex-1 h-2 bg-zinc-800/80 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300 ease-out", config.color)}
            style={{ width: `${value}%` }}
          />
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
          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-20 text-zinc-400 text-xs font-bold transition-colors select-none shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   NICHE SELECTOR (SEARCHABLE + CATEGORIZED)
   ══════════════════════════════════════════ */

function NicheSelector({ taxonomy, selected, onChange, max }) {
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const atLimit = selected.length >= max;

  const filteredTaxonomy = useMemo(() => {
    if (!search.trim()) return null; // Show categories when no search
    const q = search.toLowerCase();
    return taxonomy.filter(n =>
      n.label.toLowerCase().includes(q) || n.slug.includes(q)
    );
  }, [search, taxonomy]);

  const toggle = (slug) => {
    if (selected.includes(slug)) {
      onChange(selected.filter(s => s !== slug));
    } else if (selected.length < max) {
      onChange([...selected, slug]);
    }
  };

  const selectedNiches = taxonomy.filter(n => selected.includes(n.slug));

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedNiches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNiches.map(n => (
            <button
              key={n.slug}
              onClick={() => toggle(n.slug)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs hover:bg-violet-500/30 transition-colors"
            >
              <span>{n.emoji}</span>
              <span>{n.label}</span>
              <X className="w-3 h-3 ml-0.5 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Alan ara..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
      </div>

      {/* Search results */}
      {filteredTaxonomy ? (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {filteredTaxonomy.map(n => {
            const isSel = selected.includes(n.slug);
            return (
              <button
                key={n.slug}
                onClick={() => toggle(n.slug)}
                disabled={atLimit && !isSel}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
                  isSel
                    ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                    : atLimit
                    ? "bg-zinc-900/30 border-zinc-800/30 text-zinc-600 cursor-not-allowed"
                    : "bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 cursor-pointer"
                )}
              >
                <span>{n.emoji}</span> {n.label}
              </button>
            );
          })}
          {filteredTaxonomy.length === 0 && (
            <span className="text-xs text-zinc-600">Sonuç bulunamadı</span>
          )}
        </div>
      ) : (
        /* Categorized view */
        <div className="space-y-1">
          {Object.entries(NICHE_CATEGORIES).map(([cat, slugs]) => {
            const catNiches = taxonomy.filter(n => slugs.includes(n.slug));
            if (!catNiches.length) return null;
            const isOpen = expandedCat === cat;
            const hasSelected = catNiches.some(n => selected.includes(n.slug));
            return (
              <div key={cat}>
                <button
                  onClick={() => setExpandedCat(isOpen ? null : cat)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors",
                    hasSelected ? "text-violet-300 bg-violet-500/5" : "text-zinc-400 hover:bg-zinc-800/50"
                  )}
                >
                  <span className="font-medium">{cat}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-1.5 px-3 py-2">
                    {catNiches.map(n => {
                      const isSel = selected.includes(n.slug);
                      return (
                        <button
                          key={n.slug}
                          onClick={() => toggle(n.slug)}
                          disabled={atLimit && !isSel}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
                            isSel
                              ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                              : atLimit
                              ? "bg-zinc-900/30 border-zinc-800/30 text-zinc-600 cursor-not-allowed"
                              : "bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 cursor-pointer"
                          )}
                        >
                          <span>{n.emoji}</span> {n.label}
                        </button>
                      );
                    })}
                  </div>
                )}
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
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px]">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
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
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
          <button onClick={addItem} className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE - BENTO GRID LAYOUT
   ══════════════════════════════════════════ */

export default function CreatorHubPage() {
  const { accounts } = useAccount();
  const { updateProfile } = useCreatorProfile();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [niches, setNiches] = useState([]);
  const [tones, setTones] = useState({
    informative: 40, friendly: 40, witty: 20, aggressive: 0, inspirational: 0,
  });
  const [principles, setPrinciples] = useState([]);
  const [avoid, setAvoid] = useState([]);
  const [sampleVoice, setSampleVoice] = useState("");

  // UI state
  const [taxonomy, setTaxonomy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef(null);

  // Derived - FIXED: per-slider otherTotal calculation
  const toneTotal = Object.values(tones).reduce((a, b) => a + b, 0);
  const toneRemaining = TOTAL_POINTS - toneTotal;
  const isOverBudget = toneTotal > TOTAL_POINTS;
  const isExact = toneTotal === TOTAL_POINTS;
  const canSave = dirty && isExact && !saving;

  const twitterAccount = accounts.find(a => a.platform === "twitter" && a.status === "active");
  const instagramAccount = accounts.find(a => a.platform === "instagram" && a.status === "active");

  // Load
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

  // FIXED: Slider can never exceed budget
  const handleToneChange = useCallback((key, val) => {
    setTones(prev => {
      const otherTotal = Object.entries(prev).reduce((sum, [k, v]) => k === key ? sum : sum + v, 0);
      const clamped = Math.min(val, TOTAL_POINTS - otherTotal);
      return { ...prev, [key]: Math.max(0, clamped) };
    });
    markDirty();
  }, [markDirty]);

  const toggleNiche = useCallback((newNiches) => {
    setNiches(newNiches);
    markDirty();
  }, [markDirty]);

  // Avatar upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("JPEG, PNG veya WebP"); return; }
    setAvatarUploading(true);
    try {
      const base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
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
      toast.success(`${platform} avatarı alındı`);
    } catch (err) { toast.error(err.response?.data?.detail || "Avatar alınamadı"); }
    finally { setAvatarUploading(false); }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.put(`${API}/profile`, {
        display_name: displayName || null,
        title: title || null,
        niches,
        brand_voice: { tones, principles, avoid, sample_voice: sampleVoice },
      });
      setDirty(false);
      updateProfile({
        display_name: displayName || null, title: title || null,
        avatar_url: avatarUrl, niches,
        brand_voice: { tones, principles, avoid, sample_voice: sampleVoice },
      });
      toast.success("Profil kaydedildi ✨");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") toast.error(detail);
      else toast.error("Kayıt başarısız");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Creator Hub</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Dijital DNA'nı tanımla</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            canSave
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
              : ""
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Kaydet
        </Button>
      </div>

      {/* ═══ BENTO GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── LEFT COLUMN (4 cols) ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* IDENTITY CARD */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-2 border-zinc-700 group-hover:border-violet-500/50 transition-colors">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xl">
                    {displayName?.[0]?.toUpperCase() || <User className="w-7 h-7" />}
                  </AvatarFallback>
                </Avatar>
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 mt-3">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="text-[11px] h-7 px-2 text-zinc-400 hover:text-white">
                  <Upload className="w-3 h-3 mr-1" /> Yükle
                </Button>
                {twitterAccount && (
                  <Button size="sm" variant="ghost" onClick={() => fetchPlatformAvatar("twitter")} disabled={avatarUploading} className="text-[11px] h-7 px-2 text-zinc-400 hover:text-white">
                    <FaXTwitter className="w-3 h-3 mr-1" /> Çek
                  </Button>
                )}
                {instagramAccount && (
                  <Button size="sm" variant="ghost" onClick={() => fetchPlatformAvatar("instagram")} disabled={avatarUploading} className="text-[11px] h-7 px-2 text-zinc-400 hover:text-white">
                    <FaInstagram className="w-3 h-3 mr-1" /> Çek
                  </Button>
                )}
              </div>

              <div className="w-full mt-4 space-y-2.5">
                <Input
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
                  placeholder="Ad Soyad"
                  className="bg-zinc-900/50 border-zinc-800 text-white text-sm h-9 text-center"
                  maxLength={100}
                />
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                  placeholder="Unvan (ör: Founder)"
                  className="bg-zinc-900/50 border-zinc-800 text-white text-sm h-9 text-center"
                  maxLength={100}
                />
              </div>
            </div>
          </section>

          {/* CONNECTED ACCOUNTS */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Bağlı Hesaplar</h3>
            {accounts.length === 0 ? (
              <p className="text-xs text-zinc-600">Henüz hesap yok</p>
            ) : (
              <div className="space-y-2">
                {accounts.map(acc => (
                  <div key={acc.id} className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors",
                    acc.status === "broken" ? "bg-red-950/20 border-red-900/30" : "bg-zinc-800/20 border-zinc-800/40"
                  )}>
                    <Avatar className="w-8 h-8 border border-zinc-700">
                      <AvatarImage src={getAccountAvatar(acc)} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px]">{acc.platform?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-white truncate">@{acc.username}</span>
                        {acc.is_primary && <Badge className="text-[9px] px-1 py-0 bg-violet-500/20 text-violet-300 border-0">Ana</Badge>}
                      </div>
                      <span className="text-[10px] text-zinc-500 capitalize">{acc.platform}</span>
                    </div>
                    {acc.status === "broken" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN (8 cols) ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* BRAND VOICE DNA */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">🎙️ Marka Tonu</h3>
              {/* Points indicator */}
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all duration-300",
                isExact ? "bg-emerald-500/15 text-emerald-400" :
                isOverBudget ? "bg-red-500/15 text-red-400 animate-pulse" :
                "bg-amber-500/10 text-amber-400"
              )}>
                {isExact ? <Check className="w-3 h-3" /> : isOverBudget ? <AlertCircle className="w-3 h-3" /> : null}
                {toneTotal}/{TOTAL_POINTS}
              </div>
            </div>

            {/* Composite bar */}
            <div className="h-2.5 bg-zinc-800/80 rounded-full overflow-hidden flex mb-5">
              {TONE_CONFIG.map(cfg => {
                const val = tones[cfg.key];
                if (val === 0) return null;
                return (
                  <div
                    key={cfg.key}
                    className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", cfg.bg)}
                    style={{ width: `${val}%`, opacity: isOverBudget ? 0.5 : 1 }}
                    title={`${cfg.label}: ${val}%`}
                  />
                );
              })}
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              {TONE_CONFIG.map(cfg => (
                <ToneSlider
                  key={cfg.key}
                  config={cfg}
                  value={tones[cfg.key]}
                  otherTotal={toneTotal - tones[cfg.key]}
                  onChange={handleToneChange}
                />
              ))}
            </div>

            {/* Principles & Avoid */}
            <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-800/40">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">📌 İlkelerim</label>
                <TagInput items={principles} onChange={v => { setPrinciples(v); markDirty(); }} placeholder="Kısa ve öz yaz" max={5} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">🚫 Kaçınılacaklar</label>
                <TagInput items={avoid} onChange={v => { setAvoid(v); markDirty(); }} placeholder="Emoji spam" max={5} />
              </div>
            </div>

            {/* Sample voice */}
            <div className="mt-4 pt-4 border-t border-zinc-800/40">
              <label className="text-xs text-zinc-400 mb-1.5 block">💬 Ses Tarifi</label>
              <textarea
                value={sampleVoice}
                onChange={(e) => { setSampleVoice(e.target.value); markDirty(); }}
                placeholder="Teknik ama samimi, jargonsuz açıkla..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                maxLength={500}
              />
            </div>
          </section>

          {/* NICHES */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">🎯 İlgi Alanları</h3>
              <Badge variant="outline" className={cn(
                "text-[10px] border-zinc-700",
                niches.length >= MAX_NICHES ? "text-amber-400 border-amber-500/30" : "text-zinc-500"
              )}>
                {niches.length}/{MAX_NICHES}
              </Badge>
            </div>
            <NicheSelector
              taxonomy={taxonomy}
              selected={niches}
              onChange={toggleNiche}
              max={MAX_NICHES}
            />
          </section>
        </div>
      </div>

      {/* Mobile sticky save */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            size="lg"
            className={cn(
              "shadow-2xl gap-2 rounded-full px-6",
              canSave
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/25"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {!isExact ? `${toneTotal}/${TOTAL_POINTS}` : "Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
