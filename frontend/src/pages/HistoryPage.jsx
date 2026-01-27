import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Heart, 
  Copy, 
  Twitter, 
  Trash2, 
  Calendar,
  Loader2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HistoryPage() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/generations/history?limit=50`, { headers });
      setGenerations(response.data || []);
    } catch (error) {
      console.error('History fetch error:', error);
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

  const getTypeLabel = (type) => {
    const types = {
      tweet: 'Tweet',
      quote: 'Quote',
      reply: 'Reply',
      article: 'Article'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      tweet: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      quote: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      reply: 'bg-green-500/10 text-green-400 border-green-500/20',
      article: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };
    return colors[type] || 'bg-secondary text-muted-foreground';
  };

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
          Daha önce ürettiğiniz tüm içerikler burada listelenir.
        </p>
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
        <div className="space-y-4">
          {generations.map((gen, index) => (
            <Card key={gen.id || index} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(gen.type)}>
                      {getTypeLabel(gen.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(gen.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(gen.variants?.[0]?.content || '')}
                      data-testid={`copy-${index}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sky-400 hover:text-sky-300"
                      onClick={() => handleTweet(gen.variants?.[0]?.content || '')}
                      data-testid={`tweet-${index}`}
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {gen.variants?.slice(0, 1).map((variant, vIndex) => (
                  <div key={vIndex}>
                    <p className="text-sm whitespace-pre-wrap line-clamp-4">
                      {variant.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {variant.character_count} karakter
                      </Badge>
                      {gen.variants.length > 1 && (
                        <Badge variant="outline" className="text-xs">
                          +{gen.variants.length - 1} varyant
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
