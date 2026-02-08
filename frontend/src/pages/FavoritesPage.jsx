import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Copy, 
  Twitter, 
  Trash2,
  Loader2,
  HeartOff
} from "lucide-react";
import { toast } from "sonner";
import api, { API } from "@/lib/api";


export default function FavoritesPage() {
  const { getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get(`${API}/favorites`, { headers });
      setFavorites(response.data || []);
    } catch (error) {
      console.error('Favorites fetch error:', error);
      // Mock data for demo
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
    window.open(tweetUrl, '_blank');
  };

  const handleRemoveFavorite = async (id) => {
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.delete(`${API}/favorites/${id}`, { headers });
      setFavorites(favorites.filter(f => f.id !== id));
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
          Beğendiğiniz ve kaydettiğiniz içerikler.
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <HeartOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">Henüz favori yok</h3>
            <p className="text-muted-foreground">
              Üretilen içeriklerde kalp ikonuna tıklayarak favorilere ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav, index) => (
            <Card key={fav.id || index} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <Badge variant="secondary">{fav.type || 'Tweet'}</Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(fav.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sky-400 hover:text-sky-300"
                      onClick={() => handleTweet(fav.content)}
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveFavorite(fav.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm whitespace-pre-wrap">{fav.content}</p>
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {fav.content?.length || 0} karakter
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
