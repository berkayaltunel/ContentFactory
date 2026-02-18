import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
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

function scoreBadge(score, t) {
  if (score >= 80) return { emoji: "🔥", label: t ? t('trends.hot') : "Sıcak", cls: "bg-gradient-to-r from-red-500 to-orange-500 text-white" };
  if (score >= 60) return { emoji: "⚡", label: t ? t('trends.rising') : "Yükselen", cls: "bg-orange-500/20 text-orange-400 border border-orange-500/30" };
  if (score >= 40) return { emoji: "📈", label: t ? t('trends.interesting') : "İlginç", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
  return { emoji: "📊", label: t ? t('trends.normal') : "Normal", cls: "bg-secondary text-muted-foreground" };
}

const SOURCE_ICONS = { rss: Rss, twitter: Twitter, ai: Zap };

/* ── constants ── */

// Categories and time filters moved inside components to use t()

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
  const { t } = useTranslation();
  const getColor = (s) => {
    if (s >= 80) return "from-red-500 to-orange-400";
    if (s >= 60) return "from-orange-500 to-yellow-400";
    if (s >= 40) return "from-yellow-500 to-green-400";
    return "from-green-500 to-blue-400";
  };
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{t('trends.trendScore')}</span>
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
  const { t } = useTranslation();
  const catColor = categoryColors[trend.category] || "bg-gray-500/20 text-gray-400";
  const badge = scoreBadge(trend.score || 0, t);

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
          {(trend.source_count > 1 || (trend.sample_sources && trend.sample_sources.length > 0)) && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
              +{(trend.source_count || (trend.sample_sources?.length || 0) + 1) - 1} 📰
            </span>
          )}
          {trend.published_at && (
            <>
              <span className="flex-shrink-0">• {timeAgo(trend.published_at)}</span>
              {hoursAgo(trend.published_at) <= 6 && <span className="flex-shrink-0 text-green-400 font-medium">{t('trends.fresh')}</span>}
              {hoursAgo(trend.published_at) > 48 && <span className="flex-shrink-0 text-amber-400 font-medium">{t('trends.old')}</span>}
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
            {t('trends.readNews')} <ExternalLink className="h-3 w-3" /> →
          </a>
        )}
        <Button
          size="sm"
          onClick={() => onGenerate(trend)}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <Zap className="h-4 w-4 mr-2" />
          {t('trends.generateContent')}
        </Button>
      </div>
    </div>
  );
}


/* ── GeneratePanel (Sheet) ── */

function GeneratePanel({ open, onOpenChange, trend }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("twitter");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Platform → route mapping
  const PLATFORM_ROUTES = {
    twitter: "/dashboard/create?platform=twitter",
    blog: "/dashboard/create?platform=blog",
    linkedin: "/dashboard/create?platform=linkedin",
    instagram: "/dashboard/create?platform=instagram",
    youtube: "/dashboard/create?platform=youtube",
    tiktok: "/dashboard/create?platform=tiktok",
  };

  // Navigate to the module with topic + compact context (max 500 chars total)
  const handleGoToModule = () => {
    if (!trend) return;
    const route = PLATFORM_ROUTES[platform] || PLATFORM_ROUTES.twitter;

    // Kompakt context oluştur: topic + en önemli bilgiler, 500 karaktere sığdır
    const parts = [trend.topic];
    if (trend.content_angle) parts.push(trend.content_angle);
    if (trend.summary) parts.push(trend.summary);
    if (trend.keywords?.length) parts.push(trend.keywords.slice(0, 5).join(", "));
    if (additionalContext) parts.push(additionalContext);

    let combined = parts.join(" | ");
    if (combined.length > 490) combined = combined.slice(0, 487) + "...";

    const topic = encodeURIComponent(combined);
    onOpenChange(false);
    navigate(`${route}&topic=${topic}`);
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
        toast.error(data.error || t('trends.generatePanel.generateError'));
      } else {
        setResult(data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || t('trends.generatePanel.generateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = result?.content || result?.generated_content || "";
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const handleFavorite = async () => {
    const text = result?.content || result?.generated_content || "";
    if (!text) return;
    try {
      const res = await api.post(`${API}/favorites/toggle`, {
        content: text,
        type: platform,
        generation_id: result?.generation_id || result?.id || null,
      });
      setIsFavorited(res.data.action === "added");
      toast.success(res.data.action === "added" ? t('generation.favoriteAdded') : t('generation.favoriteRemoved'));
    } catch {
      toast.error(t('generation.favoriteError'));
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
            {t('trends.generateContent')}
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
              <label className="text-sm font-medium">{t('trends.generatePanel.platform')}</label>
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
              <label className="text-sm font-medium">{t('trends.generatePanel.additionalContext')} <span className="text-muted-foreground font-normal">{t('trends.generatePanel.additionalContextOptional')}</span></label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder={t('trends.generatePanel.additionalContextPlaceholder')}
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
                {loading ? t('trends.generatePanel.generating') : t('trends.generatePanel.quickGenerate')}
              </Button>
              <Button
                onClick={handleGoToModule}
                variant="outline"
                className="flex-1"
                title="Modülde karakter, ton, uzunluk, stil profili seçerek detaylı üret"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('trends.generatePanel.goToModule')}
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
                    {t('common.nCharacters', { count: result.character_count })}
                  </Badge>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                    <Copy className="h-4 w-4" /> {t('common.copy')}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleFavorite}
                    className={cn("gap-1.5", isFavorited && "text-red-500")}
                  >
                    <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> {t('trends.generatePanel.regenerate')}
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
  const { t } = useTranslation();

  const CATEGORY_LABELS = t('trends.categories', { returnObjects: true }) || [];
  const CATEGORY_VALUES = ["all", "AI", "Tech", "Crypto", "Gündem", "Business", "Lifestyle"];
  const CATEGORIES = CATEGORY_VALUES.map((v, i) => ({ value: v, label: CATEGORY_LABELS[i] || v }));
  const TIME_FILTERS = [
    { label: t('trends.timeFilters.6h'), value: "6h" },
    { label: t('trends.timeFilters.24h'), value: "24h" },
    { label: t('trends.timeFilters.48h'), value: "48h" },
    { label: t('trends.timeFilters.7d'), value: "7d" },
    { label: t('trends.timeFilters.all'), value: "all" },
  ];
  const SORT_OPTIONS = [
    { value: "score", label: t('trends.sortOptions.score') },
    { value: "date", label: t('trends.sortOptions.date') },
  ];

  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTime, setSelectedTime] = useState("48h");
  const [selectedSort, setSelectedSort] = useState("score");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("gundem"); // "gundem" | "arsiv"

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);

  const fetchTrends = async (category, since, sort) => {
    try {
      const params = { limit: 30 };
      if (category && category !== "all") params.category = category;
      if (activeTab === "arsiv") {
        params.archived = true;
        params.since = "all";
      } else {
        if (since && since !== "all") params.since = since;
      }
      if (sort) params.sort = sort;
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
    fetchTrends(selectedCategory, selectedTime, selectedSort);
  }, [selectedCategory, selectedTime, selectedSort, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post(`${API}/trends/refresh`);
      if (res.data.success) {
        toast.success(t('trends.refreshSuccess', { count: res.data.trends_analyzed || 0 }));
        await fetchTrends(selectedCategory, selectedTime, selectedSort);
      } else {
        toast.error(res.data.error || t('trends.refreshError'));
      }
    } catch {
      toast.error(t('trends.refreshError'));
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
              {t('trends.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('trends.subtitle')}
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? t('trends.scanning') : t('trends.refresh')}
        </Button>
      </div>

      {/* Tabs: Gündem / Arşiv */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("gundem")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === "gundem" ? "bg-orange-500 text-white" : "bg-white/5 text-gray-400 hover:text-white")}>
          {t('trends.tabs.agenda')}
        </button>
        <button onClick={() => setActiveTab("arsiv")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === "arsiv" ? "bg-violet-500 text-white" : "bg-white/5 text-gray-400 hover:text-white")}>
          {t('trends.tabs.archive')}
        </button>
      </div>

      {/* Filters: Category + Time */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              selectedCategory === cat.value
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30"
            )}
          >
            {cat.label}
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

        <div className="w-px h-6 bg-border mx-1" />

        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSelectedSort(s.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              selectedSort === s.value
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('trends.loading')}</p>
          </div>
        </div>
      ) : trends.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('trends.noTrends')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('trends.noTrendsDesc')}
          </p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            {t('trends.startFirstScan')}
          </Button>
        </div>
      ) : (
        <>
          {/* Verified Trends Section (Gündem tab only) */}
          {(() => {
            const verifiedTrends = activeTab === "gundem" ? trends.filter(t => t.score >= 95 && (t.source_count >= 2 || (t.sample_sources && t.sample_sources.length >= 1))) : [];
            const regularTrends = activeTab === "gundem" ? trends.filter(t => !(t.score >= 95 && (t.source_count >= 2 || (t.sample_sources && t.sample_sources.length >= 1)))) : trends;
            return (
              <>
                {verifiedTrends.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      {t('trends.verified.title')}
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{t('trends.verified.multiSource')}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {verifiedTrends.map(trend => (
                        <div key={trend.id} className="relative border-l-4 border-red-500 bg-gradient-to-r from-red-950/30 to-transparent rounded-xl p-5 cursor-pointer hover:from-red-950/50 transition-all" onClick={() => handleGenerate(trend)}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                              {t('trends.verified.verifiedFrom', { count: (trend.source_count || (trend.sample_sources?.length || 0) + 1) })}
                            </span>
                            <span className="text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                              {trend.score}/100
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{trend.topic}</h3>
                          <p className="text-sm text-gray-400 mb-3">{trend.summary}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <span>{trend.source_name}</span>
                            {trend.sample_sources?.map((s, i) => (
                              <span key={i}>• {s}</span>
                            ))}
                            <span>• {timeAgo(trend.published_at)}</span>
                          </div>
                          <div className="flex gap-2">
                            {trend.url && (
                              <a href={trend.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:text-orange-300" onClick={e => e.stopPropagation()}>
                                {t('trends.readNews')} ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "arsiv" ? (
                  /* Arşiv: compact list */
                  <div className="space-y-2">
                    {regularTrends.map(trend => (
                      <div key={trend.id} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:border-violet-500/40 transition-all cursor-pointer" onClick={() => handleGenerate(trend)}>
                        <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{timeAgo(trend.published_at)}</span>
                        <h3 className="font-medium text-sm flex-1 truncate">{trend.topic}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", scoreBadge(trend.score || 0).cls)}>{trend.score}</span>
                        {(trend.source_count > 1 || (trend.sample_sources && trend.sample_sources.length > 0)) && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                            +{(trend.source_count || (trend.sample_sources?.length || 0) + 1) - 1} 📰
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{trend.source_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                    {regularTrends.map((trend) => (
                      <TrendCard key={trend.id} trend={trend} onGenerate={handleGenerate} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Auto-refresh indicator */}
          {lastUpdated && (
            <div className="text-center mt-8 text-xs text-muted-foreground">
              {t('trends.lastUpdate', { time: timeAgo(lastUpdated) })}
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
