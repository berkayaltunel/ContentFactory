import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Heart, 
  Copy, 
  Twitter, 
  Calendar,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Send,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";


const TYPE_CONFIG = {
  tweet: { label: "Tweet", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  quote: { label: "Alıntı", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  reply: { label: "Yanıt", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  article: { label: "Makale", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

function HistoryCard({ gen, onFavoriteChange, onDelete, selectionMode, isSelected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [favoritedVariants, setFavoritedVariants] = useState(gen.favorited_variants || {});
  const variants = gen.variants || [];
  const typeConfig = TYPE_CONFIG[gen.type] || { label: gen.type, color: "bg-secondary text-muted-foreground" };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

  const handleTweet = (content) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleToggleFavorite = async (variantIndex, variant) => {
    try {
      const res = await api.post(`${API}/favorites/toggle`, {
        content: variant.content,
        type: gen.type || "tweet",
        generation_id: gen.id,
        variant_index: variantIndex,
      });

      const next = { ...favoritedVariants };
      if (res.data.action === "added") {
        next[variantIndex] = res.data.favorite_id;
        toast.success("Favorilere eklendi!");
      } else {
        delete next[variantIndex];
        toast.success("Favorilerden kaldırıldı");
      }
      setFavoritedVariants(next);
      if (onFavoriteChange) onFavoriteChange(gen.id, next);
    } catch {
      toast.error("Favori işlemi başarısız");
    }
  };

  const isFavorited = (variantIndex) => !!favoritedVariants[variantIndex];
  const favCount = Object.keys(favoritedVariants).length;
  const visibleVariants = expanded ? variants : variants.slice(0, 1);

  return (
    <Card className={cn("bg-card border-border hover:border-primary/20 transition-colors", isSelected && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && (
              <button onClick={() => onToggleSelect(gen.id)} className="mr-1">
                {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
              </button>
            )}
            <Badge className={typeConfig.color}>
              {typeConfig.label}
            </Badge>
            {gen.persona && (
              <Badge variant="outline" className="text-xs">
                {gen.persona}
              </Badge>
            )}
            {favCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 text-red-400">
                <Heart className="h-3 w-3 fill-current" />
                {favCount}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(gen.created_at).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Original tweet for quote/reply */}
          {(gen.type === "quote" || gen.type === "reply") && gen.tweet_content && (
            <div className="mb-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
              <div className="flex items-center gap-2 mb-1.5">
                {gen.type === "quote" ? (
                  <Twitter className="h-3.5 w-3.5 text-sky-400" />
                ) : (
                  <Send className="h-3.5 w-3.5 text-green-400" />
                )}
                {gen.tweet_url && (
                  <a href={gen.tweet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                    {gen.tweet_url.match(/@?(\w+)\/status/)?.[1] ? `@${gen.tweet_url.match(/@?(\w+)\/status/)[1]}` : "Orijinal tweet"}
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{gen.tweet_content}</p>
            </div>
          )}
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (window.confirm("Bu üretimi silmek istediğinize emin misiniz?")) {
                  onDelete(gen.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Topic */}
        {gen.topic && (
          <p className="text-xs text-muted-foreground mb-3 truncate">
            Konu: {gen.topic}
          </p>
        )}

        {/* Variants */}
        <div className="space-y-3">
          {visibleVariants.map((variant, idx) => {
            const variantIndex = variant.variant_index ?? idx;
            return (
              <div
                key={variant.id || idx}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {variant.character_count || variant.content?.length || 0} karakter
                    </Badge>
                    {variants.length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Varyant {variantIndex + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(variant.content)}
                      className="gap-1.5 h-8"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Kopyala</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(variantIndex, variant)}
                      className={cn(
                        "gap-1.5 h-8",
                        isFavorited(variantIndex) && "text-red-500"
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          isFavorited(variantIndex) && "fill-current"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTweet(variant.content)}
                      className="gap-1.5 h-8 text-sky-400 hover:text-sky-300"
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Tweetle</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/collapse */}
        {variants.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 text-muted-foreground gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Sadece ilkini göster
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Tüm {variants.length} varyantı göster
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (isAuthenticated) fetchHistory();
  }, [isAuthenticated]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`${API}/generations/${id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast.success("Üretim silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Tüm üretim geçmişinizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    try {
      const res = await api.delete(`${API}/generations/all`);
      setGenerations([]);
      toast.success(`${res.data.deleted} üretim silindi`);
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} üretimi silmek istediğinize emin misiniz?`)) return;
    try {
      const ids = Array.from(selectedIds);
      await api.delete(`${API}/generations/bulk`, { data: { ids } });
      setGenerations((prev) => prev.filter((g) => !selectedIds.has(g.id)));
      toast.success(`${ids.length} üretim silindi`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      toast.error("Silinemedi");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`${API}/generations/history?limit=50`);
      setGenerations(response.data || []);
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGenerations = filter === "all"
    ? generations
    : generations.filter((g) => g.type === filter);

  const typeCounts = generations.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl" data-testid="history-page">
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <History className="h-10 w-10 text-muted-foreground" />
          Üretim Geçmişi
        </h1>
        <p className="text-muted-foreground">
          Daha önce ürettiğiniz tüm içerikler. Beğendiklerinizi favorilere ekleyin.
        </p>
        {generations.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            {!selectionMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); }}>
                  <CheckSquare className="h-4 w-4 mr-1.5" /> Seç
                </Button>
                <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleDeleteAll}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Tümünü Sil
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                  <X className="h-4 w-4 mr-1.5" /> İptal
                </Button>
                <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Seçilenleri Sil ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {generations.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">Henüz içerik üretmediniz</h3>
            <p className="text-muted-foreground">
              X AI modülünü kullanarak ilk içeriğinizi üretin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === "all"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              Tümü ({generations.length})
            </button>
            {Object.entries(typeCounts).map(([type, count]) => {
              const cfg = TYPE_CONFIG[type] || {};
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    filter === type
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {cfg.label || type} ({count})
                </button>
              );
            })}
          </div>

          {/* Generation list */}
          <div className="space-y-4">
            {filteredGenerations.map((gen, index) => (
              <HistoryCard
                key={gen.id || index}
                gen={gen}
                onDelete={handleDelete}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(gen.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
