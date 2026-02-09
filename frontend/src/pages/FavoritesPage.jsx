import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Copy, 
  Send, 
  Trash2,
  Loader2,
  HeartOff,
  Calendar,
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

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchFavorites();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Tüm favorilerinizi silmek istediğinize emin misiniz?")) return;
    try {
      for (const fav of favorites) {
        await api.delete(`${API}/favorites/${fav.id}`);
      }
      setFavorites([]);
      toast.success("Tüm favoriler silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} favoriyi silmek istediğinize emin misiniz?`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`${API}/favorites/${id}`);
      }
      setFavorites((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      toast.success(`${selectedIds.size} favori silindi`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      toast.error("Silinemedi");
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await api.get(`${API}/favorites`);
      setFavorites(response.data || []);
    } catch (error) {
      console.error("Favorites fetch error:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

  const handleTweet = (content) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleRemoveFavorite = async (id) => {
    try {
      await api.delete(`${API}/favorites/${id}`);
      setFavorites(favorites.filter((f) => f.id !== id));
      toast.success("Favorilerden kaldırıldı");
    } catch (error) {
      toast.error("Kaldırılamadı");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl" data-testid="favorites-page">
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Heart className="h-10 w-10 text-red-500" />
          Favoriler
        </h1>
        <p className="text-muted-foreground">
          Beğendiğiniz ve kaydettiğiniz içerikler ({favorites.length}).
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <HeartOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">Henüz favori yok</h3>
            <p className="text-muted-foreground">
              Üretilen içeriklerde veya geçmişte kalp ikonuna tıklayarak favorilere ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav, index) => {
            const typeConfig = TYPE_CONFIG[fav.type] || { label: fav.type || "Tweet", color: "bg-secondary text-muted-foreground" };
            return (
              <Card key={fav.id || index} className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                      {fav.variant_index != null && fav.variant_index > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Varyant {fav.variant_index + 1}
                        </Badge>
                      )}
                      {fav.created_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(fav.created_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleCopy(fav.content)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Kopyala</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-sky-400 hover:text-sky-300"
                        onClick={() => handleTweet(fav.content)}
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Tweetle</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleRemoveFavorite(fav.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm whitespace-pre-wrap">{fav.content}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {fav.content?.length || 0} karakter
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
