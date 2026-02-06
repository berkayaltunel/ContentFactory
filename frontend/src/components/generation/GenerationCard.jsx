import { useState } from "react";
import { Loader2, Copy, Heart, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import SkeletonTweetRow from "./SkeletonTweetRow";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERSONA_COLORS = {
  expert: "#F97316",
  leaked: "#3B82F6",
  coach: "#22C55E",
  news: "#A855F7",
  meme: "#EC4899",
  against: "#6B7280",
};

export default function GenerationCard({ job }) {
  const [favorites, setFavorites] = useState(new Map());
  const { getAccessToken } = useAuth();

  const color = PERSONA_COLORS[job.persona] || "#6B7280";
  const isGenerating = job.status === "generating";

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

  const handleTweet = (content) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, "_blank");
    toast.success("Twitter açılıyor...");
  };

  const handleFavorite = async (index, variant) => {
    const token = getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const next = new Map(favorites);
    if (next.has(index)) {
      const favId = next.get(index);
      try {
        await axios.delete(`${API}/favorites/${favId}`, { headers });
        next.delete(index);
        toast.success("Favorilerden kaldırıldı");
      } catch {
        toast.error("Favori kaldırılamadı");
      }
    } else {
      try {
        const res = await axios.post(`${API}/favorites`, {
          content: variant.content,
          type: job.type || "tweet",
        }, { headers });
        next.set(index, res.data.id);
        toast.success("Favorilere eklendi!");
      } catch {
        toast.error("Favori eklenemedi");
      }
    }
    setFavorites(next);
  };

  return (
    <Card
      className={cn(
        "bg-card transition-colors",
        isGenerating
          ? "border-orange-500/20"
          : "border-border hover:border-primary/20"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Avatar + Prompt + Tags */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
            style={{ backgroundColor: color }}
          >
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              job.persona.charAt(0).toUpperCase()
            )}
          </div>

          {/* Prompt + Tags */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{job.topic}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {job.personaLabel} · {job.toneLabel} · {job.lengthLabel}
            </p>
          </div>

          {/* Status */}
          {isGenerating && (
            <span className="text-xs text-orange-400 whitespace-nowrap shrink-0">
              {job.variantCount} tweet üretiliyor...
            </span>
          )}
        </div>

        {/* Content: Skeleton rows (generating) or real content (completed) */}
        {isGenerating ? (
          <div className="space-y-2">
            {Array.from({ length: job.variantCount }).map((_, i) => (
              <SkeletonTweetRow key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {job.variants?.map((variant, index) => (
              <div
                key={variant.id || index}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {variant.character_count} karakter
                    </Badge>
                    {job.variants.length > 1 && (
                      <Badge variant="outline">Varyant {index + 1}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(variant.content)}
                      className="gap-1.5"
                    >
                      <Copy className="h-4 w-4" />
                      Kopyala
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFavorite(index, variant)}
                      className={cn(
                        "gap-1.5",
                        favorites.has(index) && "text-red-500"
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          favorites.has(index) && "fill-current"
                        )}
                      />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleTweet(variant.content)}
                      className="gap-1.5 bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      <Send className="h-4 w-4" />
                      Tweetle
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
