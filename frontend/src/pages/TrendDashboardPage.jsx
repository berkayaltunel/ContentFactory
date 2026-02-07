import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const CATEGORIES = ["Tümü", "AI", "Tech", "Crypto", "Gündem", "Business", "Lifestyle"];

const categoryColors = {
  AI: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Tech: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Crypto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Gündem: "bg-green-500/20 text-green-400 border-green-500/30",
  Business: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Lifestyle: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

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

function TrendCard({ trend, onWrite }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = categoryColors[trend.category] || "bg-gray-500/20 text-gray-400";

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-orange-500/40 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", catColor)}>
              {trend.category}
            </span>
            {trend.score >= 80 && <Flame className="h-4 w-4 text-orange-500" />}
          </div>
          <h3 className="font-semibold text-lg leading-tight group-hover:text-orange-400 transition-colors">
            {trend.topic}
          </h3>
        </div>
      </div>

      {/* Score */}
      <ScoreBar score={trend.score || 0} />

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        {trend.tweet_count > 0 && (
          <span>🐦 {trend.tweet_count} tweet</span>
        )}
        {trend.avg_engagement > 0 && (
          <span>⚡ {Math.round(trend.avg_engagement)} ort. etkileşim</span>
        )}
      </div>

      {/* AI Summary */}
      <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{trend.summary}</p>

      {/* Content Angle */}
      {trend.content_angle && (
        <div className="mt-3 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
          <p className="text-xs text-orange-400">
            💡 {trend.content_angle}
          </p>
        </div>
      )}

      {/* Keywords */}
      {trend.keywords && trend.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {trend.keywords.slice(0, 5).map((kw, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              #{kw}
            </span>
          ))}
        </div>
      )}

      {/* Expandable sample links */}
      {trend.sample_links && trend.sample_links.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Kaynaklar ({trend.sample_links.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {trend.sample_links.map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline truncate"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  {link}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        <Button
          size="sm"
          onClick={() => onWrite(trend, "x")}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <Zap className="h-4 w-4 mr-2" />
          Tweet Yaz
        </Button>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onWrite(trend, "blog")}
            className="flex-1 text-xs"
          >
            📝 Blog
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onWrite(trend, "linkedin")}
            className="flex-1 text-xs"
          >
            💼 LinkedIn
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TrendDashboardPage() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const fetchTrends = async (category) => {
    try {
      const params = { limit: 30 };
      if (category && category !== "Tümü") params.category = category;
      const res = await axios.get(`${API}/trends`, { params });
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
    fetchTrends(selectedCategory);
  }, [selectedCategory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await axios.post(`${API}/trends/refresh`);
      if (res.data.success) {
        toast.success(`🔥 ${res.data.trends_analyzed || 0} trend analiz edildi!`);
        await fetchTrends(selectedCategory);
      } else {
        toast.error(res.data.error || "Yenileme başarısız");
      }
    } catch (err) {
      toast.error("Trend yenileme hatası");
    } finally {
      setRefreshing(false);
    }
  };

  const handleWrite = (trend, platform = "x") => {
    const topic = encodeURIComponent(trend.topic);
    const summary = encodeURIComponent(trend.summary || "");
    if (platform === "blog") {
      navigate(`/dashboard/blog?topic=${topic}&trend_context=${summary}`);
    } else if (platform === "linkedin") {
      navigate(`/dashboard/linkshare?topic=${topic}`);
    } else {
      navigate(`/dashboard/x-ai?topic=${topic}`);
    }
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
          {refreshing ? "Taraniyor..." : "🔄 Yenile"}
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} onWrite={handleWrite} />
            ))}
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <div className="text-center mt-8 text-xs text-muted-foreground">
              Son güncelleme: {new Date(lastUpdated).toLocaleString("tr-TR")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
