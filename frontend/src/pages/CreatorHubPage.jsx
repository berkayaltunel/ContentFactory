import { useState, useEffect, useCallback, useRef } from "react";
import { User, Upload, Camera, Plus, X, Save, Loader2, AlertCircle, Check } from "lucide-react";
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
  { key: "informative", label: "Bilgi Verici", emoji: "📚", color: "from-blue-500 to-cyan-500" },
  { key: "friendly", label: "Samimi", emoji: "🤝", color: "from-green-500 to-emerald-500" },
  { key: "witty", label: "Esprili", emoji: "😏", color: "from-yellow-500 to-orange-500" },
  { key: "aggressive", label: "Agresif", emoji: "🔥", color: "from-red-500 to-rose-500" },
  { key: "inspirational", label: "İlham Verici", emoji: "✨", color: "from-violet-500 to-fuchsia-500" },
];

const MAX_NICHES = 5;

/* ══════════════════════════════════════════
   TONE SLIDER COMPONENT
   ══════════════════════════════════════════ */

function ToneSlider({ config, value, remaining, onChange }) {
  const canIncrease = remaining > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">
          {config.emoji} {config.label}
        </span>
        <span className={cn(
          "text-sm font-mono font-semibold tabular-nums min-w-[3ch] text-right",
          value > 0 ? "text-white" : "text-zinc-500"
        )}>
          %{value}
        </span>
      </div>
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", config.color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={value + remaining}
        value={value}
        onChange={(e) => onChange(config.key, parseInt(e.target.value))}
        className="w-full h-8 appearance-none bg-transparent cursor-pointer absolute opacity-0"
        style={{ marginTop: "-22px", position: "relative", touchAction: "none" }}
      />
      {/* +/- buttons for precision */}
      <div className="flex gap-1 justify-end">
        <button
          onClick={() => value > 0 && onChange(config.key, value - 5)}
          disabled={value === 0}
          className="text-xs px-3 py-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-zinc-400 transition-colors select-none"
        >
          -5
        </button>
        <button
          onClick={() => canIncrease && onChange(config.key, Math.min(value + 5, value + remaining))}
          disabled={!canIncrease}
          className="text-xs px-3 py-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-zinc-400 transition-colors select-none"
        >
          +5
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   NICHE CHIP COMPONENT
   ══════════════════════════════════════════ */

function NicheChip({ niche, selected, disabled, onToggle }) {
  return (
    <button
      onClick={() => !disabled && onToggle(niche.slug)}
      disabled={disabled && !selected}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200",
        "border",
        selected
          ? "bg-violet-500/20 border-violet-500/50 text-violet-300 hover:bg-violet-500/30"
          : disabled
          ? "bg-zinc-900/30 border-zinc-800/30 text-zinc-600 cursor-not-allowed"
          : "bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 cursor-pointer"
      )}
    >
      <span>{niche.emoji}</span>
      <span>{niche.label}</span>
      {selected && <X className="w-3 h-3 ml-0.5" />}
    </button>
  );
}

/* ══════════════════════════════════════════
   TAG INPUT COMPONENT (principles / avoid)
   ══════════════════════════════════════════ */

function TagInput({ items, onChange, placeholder, max = 5 }) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const val = input.trim();
    if (!val || items.length >= max) return;
    if (!items.includes(val)) {
      onChange([...items, val]);
    }
    setInput("");
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs"
          >
            {item}
            <button onClick={() => removeItem(i)} className="hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {items.length < max && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="bg-zinc-900/50 border-zinc-800 text-sm h-8"
          />
          <Button size="sm" variant="ghost" onClick={addItem} className="h-8 px-2">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
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

  // Derived
  const toneTotal = Object.values(tones).reduce((a, b) => a + b, 0);
  const toneRemaining = 100 - toneTotal;
  const canSave = dirty && toneTotal === 100 && !saving;

  // Connected Twitter account
  const twitterAccount = accounts.find(
    (a) => a.platform === "twitter" && a.status === "active"
  );
  const instagramAccount = accounts.find(
    (a) => a.platform === "instagram" && a.status === "active"
  );

  // ── Load profile + taxonomy ──
  useEffect(() => {
    Promise.all([
      api.get(`${API}/profile`).then((r) => r.data),
      api.get(`${API}/profile/taxonomy`).then((r) => r.data),
    ])
      .then(([profile, tax]) => {
        setTaxonomy(tax);
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.title) setTitle(profile.title);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.niches?.length) setNiches(profile.niches);
        if (profile.brand_voice?.tones) setTones(profile.brand_voice.tones);
        if (profile.brand_voice?.principles) setPrinciples(profile.brand_voice.principles);
        if (profile.brand_voice?.avoid) setAvoid(profile.brand_voice.avoid);
        if (profile.brand_voice?.sample_voice) setSampleVoice(profile.brand_voice.sample_voice);
      })
      .catch(() => toast.error("Profil yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  // ── Mark dirty on any change ──
  const markDirty = useCallback(() => setDirty(true), []);

  // ── Tone change handler ──
  const handleToneChange = useCallback((key, val) => {
    setTones((prev) => ({ ...prev, [key]: val }));
    markDirty();
  }, [markDirty]);

  // ── Niche toggle ──
  const toggleNiche = useCallback((slug) => {
    setNiches((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_NICHES) return prev;
      return [...prev, slug];
    });
    markDirty();
  }, [markDirty]);

  // ── Avatar upload (file) ──
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar max 2MB olabilir");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Sadece JPEG, PNG veya WebP");
      return;
    }

    setAvatarUploading(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });

      const res = await api.post(`${API}/profile/avatar`, {
        source: "upload",
        data: base64,
        content_type: file.type,
      });
      setAvatarUrl(res.data.avatar_url);
      updateProfile({ avatar_url: res.data.avatar_url });
      toast.success("Avatar güncellendi");
    } catch (err) {
      toast.error("Avatar yüklenemedi");
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Avatar from platform ──
  const fetchPlatformAvatar = async (platform) => {
    setAvatarUploading(true);
    try {
      const res = await api.post(`${API}/profile/avatar`, { source: platform });
      setAvatarUrl(res.data.avatar_url);
      updateProfile({ avatar_url: res.data.avatar_url });
      toast.success(`${platform} avatarı alındı`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Avatar alınamadı");
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Save profile ──
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.put(`${API}/profile`, {
        display_name: displayName || null,
        title: title || null,
        niches,
        brand_voice: {
          tones,
          principles,
          avoid,
          sample_voice: sampleVoice,
        },
      });
      setDirty(false);
      // Global state güncelle → Navbar anında yansır
      updateProfile({
        display_name: displayName || null,
        title: title || null,
        avatar_url: avatarUrl,
        niches,
        brand_voice: { tones, principles, avoid, sample_voice: sampleVoice },
      });
      toast.success("Profil kaydedildi ✨");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") toast.error(detail);
      else if (Array.isArray(detail)) toast.error(detail[0]?.msg || "Validasyon hatası");
      else toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creator Hub</h1>
          <p className="text-sm text-zinc-500 mt-1">Kimliğini, tonunu ve ilgi alanlarını belirle</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            "gap-2 transition-all",
            canSave
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
              : ""
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
      </div>

      {/* ── 1. MASTER IDENTITY ── */}
      <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">👤 Kimlik</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <Avatar className="w-24 h-24 border-2 border-zinc-700">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-2xl">
                {displayName?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1.5 w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs gap-1.5 w-full border-zinc-700 hover:border-zinc-600"
              >
                {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Yükle
              </Button>

              {twitterAccount && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPlatformAvatar("twitter")}
                  disabled={avatarUploading}
                  className="text-xs gap-1.5 w-full border-zinc-700 hover:border-zinc-600"
                >
                  <FaXTwitter className="w-3 h-3" /> Twitter'dan
                </Button>
              )}

              {instagramAccount && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPlatformAvatar("instagram")}
                  disabled={avatarUploading}
                  className="text-xs gap-1.5 w-full border-zinc-700 hover:border-zinc-600"
                >
                  <FaInstagram className="w-3 h-3" /> IG'den
                </Button>
              )}
            </div>
          </div>

          {/* Name fields */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Ad Soyad</label>
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
                placeholder="Berkay Altunel"
                className="bg-zinc-900/50 border-zinc-800 text-white"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Unvan</label>
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                placeholder="Founder & CEO"
                className="bg-zinc-900/50 border-zinc-800 text-white"
                maxLength={100}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. BRAND VOICE DNA ── */}
      <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">🎙️ Marka Tonu (Brand Voice)</h2>
        <p className="text-xs text-zinc-500 mb-5">100 puanı tonlar arasında dağıt. İçerik üretiminde AI bu dengeyi referans alacak.</p>

        {/* Remaining points bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Puan Dağılımı</span>
            <span className={cn(
              "text-sm font-mono font-bold tabular-nums",
              toneTotal === 100 ? "text-emerald-400" :
              toneTotal > 100 ? "text-red-400" :
              "text-amber-400"
            )}>
              {toneTotal === 100 ? (
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 100/100</span>
              ) : (
                <span className="flex items-center gap-1">
                  {toneTotal > 100 && <AlertCircle className="w-3.5 h-3.5" />}
                  {toneTotal}/100 {toneRemaining > 0 && `(kalan: ${toneRemaining})`}
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                toneTotal === 100 ? "bg-emerald-500" :
                toneTotal > 100 ? "bg-red-500" :
                "bg-gradient-to-r from-violet-500 to-fuchsia-500"
              )}
              style={{ width: `${Math.min(toneTotal, 100)}%` }}
            />
          </div>
        </div>

        {/* Tone sliders */}
        <div className="space-y-5">
          {TONE_CONFIG.map((cfg) => (
            <ToneSlider
              key={cfg.key}
              config={cfg}
              value={tones[cfg.key]}
              remaining={toneRemaining}
              onChange={handleToneChange}
            />
          ))}
        </div>

        {/* Principles & Avoid */}
        <div className="grid sm:grid-cols-2 gap-6 mt-8 pt-6 border-t border-zinc-800/50">
          <div>
            <label className="text-sm text-zinc-300 mb-2 block">📌 İlkelerim</label>
            <p className="text-xs text-zinc-500 mb-2">İçeriklerinde her zaman uygulanan kurallar</p>
            <TagInput
              items={principles}
              onChange={(v) => { setPrinciples(v); markDirty(); }}
              placeholder="Örn: Kısa ve öz yaz"
              max={5}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-300 mb-2 block">🚫 Kaçınılacaklar</label>
            <p className="text-xs text-zinc-500 mb-2">AI bunlardan uzak duracak</p>
            <TagInput
              items={avoid}
              onChange={(v) => { setAvoid(v); markDirty(); }}
              placeholder="Örn: Emoji spam"
              max={5}
            />
          </div>
        </div>

        {/* Sample voice */}
        <div className="mt-6 pt-6 border-t border-zinc-800/50">
          <label className="text-sm text-zinc-300 mb-2 block">💬 Ses Örneği</label>
          <p className="text-xs text-zinc-500 mb-2">Tarzını tarif et veya örnek bir cümle yaz</p>
          <textarea
            value={sampleVoice}
            onChange={(e) => { setSampleVoice(e.target.value); markDirty(); }}
            placeholder="Teknik ama samimi, jargonsuz açıkla. Espriyi doğal yap, zorla değil."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            maxLength={500}
          />
        </div>
      </section>

      {/* ── 3. NICHES ── */}
      <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">🎯 İlgi Alanları</h2>
          <Badge variant="outline" className={cn(
            "text-xs border-zinc-700",
            niches.length >= MAX_NICHES ? "text-amber-400 border-amber-500/30" : "text-zinc-400"
          )}>
            {niches.length}/{MAX_NICHES} seçildi
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Trendler ve AI Coach bu alanlarına göre önerilerde bulunacak</p>

        <div className="flex flex-wrap gap-2">
          {taxonomy.map((niche) => (
            <NicheChip
              key={niche.slug}
              niche={niche}
              selected={niches.includes(niche.slug)}
              disabled={niches.length >= MAX_NICHES}
              onToggle={toggleNiche}
            />
          ))}
        </div>
      </section>

      {/* ── 4. CONNECTED ACCOUNTS ── */}
      <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🔗 Bağlı Hesaplar</h2>

        {accounts.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz bağlı hesap yok. Ayarlardan ekleyebilirsin.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  acc.status === "broken"
                    ? "bg-red-950/20 border-red-900/30"
                    : "bg-zinc-800/30 border-zinc-800/50"
                )}
              >
                <Avatar className="w-10 h-10 border border-zinc-700">
                  <AvatarImage src={getAccountAvatar(acc)} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                    {acc.platform?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate">@{acc.username}</span>
                    {acc.is_primary && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/20 text-violet-300 border-0">
                        Ana
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 capitalize">{acc.platform}</span>
                </div>
                {acc.status === "broken" && (
                  <Badge variant="outline" className="text-[10px] border-red-800 text-red-400">
                    Kopuk
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom save bar (sticky on mobile) */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            size="lg"
            className={cn(
              "shadow-2xl gap-2 rounded-full px-6",
              canSave
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {toneTotal !== 100 ? `Ton: ${toneTotal}/100` : "Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
