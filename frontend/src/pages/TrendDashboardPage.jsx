import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Flame, Zap, Copy, Heart, RotateCcw, Loader2, Newspaper, Rss, Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api, { API } from "@/lib/api";


/* ── helpers ── */

function timeAgo(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} saat önce`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "dün";
  if (diffD < 7) return `${diffD} gün önce`;
  return date.toLocaleDateString("tr-TR");
}

function hoursAgo(dateString) {
  if (!dateString) return 999;
  const now = new Date();
  const date = new Date(dateString);
  return (now - date) / (1000 * 60 * 60);
}

function scoreBadge(score) {
  if (score >= 80) return { emoji: "🔥", label: "Sıcak", cls: "bg-gradient-to-r from-red-500 to-orange-500 text-white" };
  if (score >= 60) return { emoji: "⚡", label: "Yükselen", cls: "bg-orange-500/20 text-orange-400 border border-orange-500/30" };
  if (score >= 40) return { emoji: "📈", label: "İlginç", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
  return { emoji: "📊", label: "Normal", cls: "bg-secondary text-muted-foreground" };
}

const SOURCE_ICONS = { rss: Rss, twitter: Twitter, ai: Zap };

/* ── constants ── */

const CATEGORIES = ["Tümü", "AI", "Tech", "Crypto", "Gündem", "Business", "Lifestyle"];
const TIME_FILTERS = [
  { label: "Son 24 Saat", value: "24h" },
  { label: "Son 1 Hafta", value: "7d" },
  { label: "Tümü", value: "all" },
];

const categoryColors = {
  AI: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Tech: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Crypto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Gündem: "bg-green-500/20 text-green-400 border-green-500/30",
  Business: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Lifestyle: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const PLATFORMS = [
  { id: "twitter", label: "X", emoji: "𝕏" },
  { id: "blog", label: "Blog", emoji: "📝" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
];


/* ── ScoreBar ── */

function ScoreBar({ score }) {
  const getColor = (s) => {
    if (s >= 80) return "from-red-500 to-orange-400";
    if (s >= 60) return "from-orange-500 to-yellow-400";
    if (s >= 40) return "from-yellow-500 to-green-400";
    return "from-green-500 to-blue-400";
  };
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Trend Skoru</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}


/* ── TrendCard ── */

function TrendCard({ trend, onGenerate }) {
  const catColor = categoryColors[trend.category] || "bg-gray-500/20 text-gray-400";
  const badge = scoreBadge(trend.score || 0);

  return (
    <div className="rounded-xl border border-border bg-card hover:border-orange-500/40 transition-all duration-300 group flex flex-col"
         style={{ minHeight: 320 }}>
      <div className="p-5 flex-1 flex flex-col">
        {/* Row 1: Badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border", catColor)}>{trend.category}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge.cls)}>{badge.emoji} {badge.label}</span>
        </div>

        {/* Row 2: Title (exactly 2 lines) */}
        <h3 className="font-semibold text-base leading-snug group-hover:text-orange-400 transition-colors line-clamp-2 min-h-[2.75rem] mb-2">
          {trend.topic}
        </h3>

        {/* Row 3: Source + time + freshness indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 truncate">
          <Newspaper className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{trend.source_name || "RSS"}</span>
          {trend.published_at && (
            <>
              <span className="flex-shrink-0">• {timeAgo(trend.published_at)}</span>
              {hoursAgo(trend.published_at) <= 6 && <span className="flex-shrink-0 text-green-400 font-medium">🟢 Taze</span>}
              {hoursAgo(trend.published_at) > 24 && <span className="flex-shrink-0 text-amber-400 font-medium">⚠️ Eski</span>}
            </>
          )}
        </div>

        {/* Row 4: Score bar */}
        <ScoreBar score={trend.score || 0} />

        {/* Row 5: Summary (exactly 3 lines, fills remaining space) */}
        <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{trend.summary}</p>

        {/* Row 6: Keywords (fixed single row, always rendered for spacing) */}
        <div className="flex gap-1 mt-3 h-6 overflow-hidden">
          {(trend.keywords || []).slice(0, 3).map((kw, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground whitespace-nowrap">#{kw}</span>
          ))}
        </div>
      </div>

      {/* Bottom: Link + Button (pinned) */}
      <div className="px-5 pb-4">
        {trend.url && (
          <a href={trend.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors">
            Haberi Oku <ExternalLink className="h-3 w-3" /> →
          </a>
        )}
        <Button
          size="sm"
          onClick={() => onGenerate(trend)}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <Zap className="h-4 w-4 mr-2" />
          İçerik Üret
        </Button>
      </div>
    </div>
  );
}


/* ── GeneratePanel (Sheet) ── */

function GeneratePanel({ open, onOpenChange, trend }) {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("twitter");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Platform → route mapping
  const PLATFORM_ROUTES = {
    twitter: "/dashboard/x-ai",
    blog: "/dashboard/blog",
    linkedin: "/dashboard/linkshare",
    instagram: "/dashboard/instaflow",
    youtube: "/dashboard/youtube",
    tiktok: "/dashboard/tiktrend",
  };

  // Navigate to the module with topic + rich trend context
  const handleGoToModule = () => {
    if (!trend) return;
    const route = PLATFORM_ROUTES[platform] || PLATFORM_ROUTES.twitter;
    const topic = encodeURIComponent(trend.topic);

    // Zengin context: özet + keywords + content angle + kullanıcı notu
    const contextParts = [];
    if (trend.summary) contextParts.push(`Özet: ${trend.summary}`);
    if (trend.keywords?.length) contextParts.push(`Anahtar Kelimeler: ${trend.keywords.join(", ")}`);
    if (trend.content_angle) contextParts.push(`İçerik Açısı: ${trend.content_angle}`);
    if (trend.url) contextParts.push(`Kaynak: ${trend.url}`);
    if (additionalContext) contextParts.push(`Not: ${additionalContext}`);

    const context = encodeURIComponent(contextParts.join("\n\n"));
    onOpenChange(false);
    navigate(`${route}?topic=${topic}&trend_context=${context}`);
  };

  // Trend değişince state'i sıfırla (otomatik üretim yok, kullanıcı seçsin)
  useEffect(() => {
    if (trend) {
      setResult(null);
      setPlatform("twitter");
      setAdditionalContext("");
      setIsFavorited(false);
    }
  }, [trend?.id]);

  const handleGenerate = async () => {
    if (!trend) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post(`${API}/trends/${trend.id}/generate`, {
        platform,
        additional_context: additionalContext || undefined,
        language: "tr",
      });
      const data = res.data;
      if (data.success === false) {
        toast.error(data.error || "İçerik üretme başarısız");
      } else {
        setResult(data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "İçerik üretme hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = result?.content || result?.generated_content || "";
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  const handleFavorite = async () => {
    const text = result?.content || result?.generated_content || "";
    if (!text) return;
    try {
      const res = await api.post(`${API}/favorites/toggle`, {
        content: text,
        type: platform,
        generation_id: result?.id || null,
      });
      setIsFavorited(res.data.action === "added");
      toast.success(res.data.action === "added" ? "Favorilere eklendi!" : "Favorilerden kaldırıldı");
    } catch {
      toast.error("Favori işlemi başarısız");
    }
  };

  // Backend returns {success, variants: [{content, character_count}]}
  const firstVariant = result?.variants?.[0];
  const content = firstVariant?.content || result?.content || result?.generated_content || "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            İçerik Üret
          </SheetTitle>
        </SheetHeader>

        {trend && (
          <div className="space-y-5 mt-4">
            {/* Trend summary (read-only) */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
              <h4 className="font-semibold text-sm mb-1">{trend.topic}</h4>
              <p className="text-xs text-muted-foreground line-clamp-3">{trend.summary}</p>
            </div>

            {/* Platform selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      platform === p.id
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30"
                    )}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional context */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ek Bağlam <span className="text-muted-foreground font-normal">(opsiyonel)</span></label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Bu konuda eklemek istediğin bir şey var mı?"
                rows={3}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                {loading ? "Üretiliyor..." : "Hızlı Üret"}
              </Button>
              <Button
                onClick={handleGoToModule}
                variant="outline"
                className="flex-1"
                title="Modülde karakter, ton, uzunluk, stil profili seçerek detaylı üret"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Sayfada Yaz →
              </Button>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-secondary rounded w-full" />
                <div className="h-4 bg-secondary rounded w-5/6" />
                <div className="h-4 bg-secondary rounded w-4/6" />
                <div className="h-4 bg-secondary rounded w-3/6" />
              </div>
            )}

            {/* Result */}
            {content && !loading && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm whitespace-pre-wrap">{content}</p>

                {result?.character_count && (
                  <Badge variant="secondary" className="text-xs">
                    {result.character_count} karakter
                  </Badge>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                    <Copy className="h-4 w-4" /> Kopyala
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleFavorite}
                    className={cn("gap-1.5", isFavorited && "text-red-500")}
                  >
                    <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Yeniden
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


/* ── Main Page ── */

export default function TrendDashboardPage() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [selectedTime, setSelectedTime] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);

  const fetchTrends = async (category, since) => {
    try {
      const params = { limit: 30 };
      if (category && category !== "Tümü") params.category = category;
      if (since && since !== "all") params.since = since;
      const res = await api.get(`${API}/trends`, { params });
      setTrends(res.data.trends || []);
      if (res.data.trends?.length > 0) {
        setLastUpdated(res.data.trends[0].updated_at || res.data.trends[0].created_at);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTrends(selectedCategory, selectedTime);
  }, [selectedCategory, selectedTime]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post(`${API}/trends/refresh`);
      if (res.data.success) {
        toast.success(`🔥 ${res.data.trends_analyzed || 0} trend analiz edildi!`);
        await fetchTrends(selectedCategory, selectedTime);
      } else {
        toast.error(res.data.error || "Yenileme başarısız");
      }
    } catch {
      toast.error("Trend yenileme hatası");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = (trend) => {
    setSelectedTrend(trend);
    setSheetOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <TrendingUp className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              🔥 Trend Keşfet
            </h1>
            <p className="text-sm text-muted-foreground">
              AI ve teknoloji dünyasından güncel trendler
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? "Taranıyor..." : "🔄 Yenile"}
        </Button>
      </div>

      {/* Filters: Category + Time */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              selectedCategory === cat
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30"
            )}
          >
            {cat}
          </button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        {TIME_FILTERS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setSelectedTime(tf.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              selectedTime === tf.value
                ? "bg-secondary text-foreground border-foreground/20"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-muted-foreground">Trendler yükleniyor...</p>
          </div>
        </div>
      ) : trends.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz trend yok</h3>
          <p className="text-muted-foreground mb-4">
            "Yenile" butonuna tıklayarak RSS ve Twitter'dan trend keşfedebilirsiniz.
          </p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            İlk Taramayı Başlat
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {trends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} onGenerate={handleGenerate} />
            ))}
          </div>

          {/* Auto-refresh indicator */}
          {lastUpdated && (
            <div className="text-center mt-8 text-xs text-muted-foreground">
              Son güncelleme: {timeAgo(lastUpdated)} • Otomatik güncelleme: günde 3x
            </div>
          )}
        </>
      )}

      {/* Generate Sheet */}
      <GeneratePanel
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        trend={selectedTrend}
      />
    </div>
  );
}
