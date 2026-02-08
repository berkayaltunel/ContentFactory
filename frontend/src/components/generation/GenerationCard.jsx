import { useState } from "react";
import { Loader2, Copy, Heart, Send, Video, X, Clock, Music, Hash, ImageIcon, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import SkeletonTweetRow from "./SkeletonTweetRow";


const PERSONA_COLORS = {
  expert: "#F97316",
  leaked: "#3B82F6",
  coach: "#22C55E",
  news: "#A855F7",
  meme: "#EC4899",
  against: "#6B7280",
};

function VideoScriptDialog({ open, onOpenChange, content }) {
  const [duration, setDuration] = useState("30");
  const [platform, setPlatform] = useState("reels");
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState(null);

  const durations = [
    { id: "15", label: "15s" },
    { id: "30", label: "30s" },
    { id: "60", label: "60s" },
  ];
  const platforms = [
    { id: "reels", label: "Reels" },
    { id: "tiktok", label: "TikTok" },
    { id: "shorts", label: "Shorts" },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`${API}/repurpose/video-script`, {
        content,
        duration,
        platform,
      });
      if (res.data.success) {
        setScript(res.data);
      } else {
        toast.error(res.data.error || "Script oluşturulamadı");
      }
    } catch (e) {
      toast.error("Script oluşturma hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    if (!script) return;
    const text = script.script
      .map((s) => `[${s.time}]\n${s.spoken_text}\nOverlay: ${s.text_overlay}\nGörsel: ${s.visual_note}`)
      .join("\n\n");
    const full = `${text}\n\nMüzik: ${script.music_mood}\nCaption: ${script.caption}\nHashtag: ${script.hashtags.join(" ")}`;
    navigator.clipboard.writeText(full);
    toast.success("Script kopyalandı!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-pink-400" />
            Video Script'e Çevir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Süre</label>
            <div className="flex gap-2">
              {durations.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    duration === d.id
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <div className="flex gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    platform === p.id
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
            {loading ? "Oluşturuluyor..." : "Script Oluştur"}
          </Button>

          {/* Result */}
          {script && (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Timeline */}
              {script.script.map((seg, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="shrink-0">
                    <Badge variant="outline" className="font-mono text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {seg.time}
                    </Badge>
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm">{seg.spoken_text}</p>
                    <p className="text-xs text-pink-400">Overlay: {seg.text_overlay}</p>
                    <p className="text-xs text-muted-foreground">Görsel: {seg.visual_note}</p>
                  </div>
                </div>
              ))}

              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Music className="h-3 w-3" />
                  {script.music_mood}
                </Badge>
                {script.hashtags.map((h, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {h}
                  </Badge>
                ))}
              </div>

              {script.caption && (
                <p className="text-sm text-muted-foreground italic">{script.caption}</p>
              )}

              <Button variant="outline" onClick={handleCopyScript} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                Script'i Kopyala
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImagePromptDialog({ open, onOpenChange, content }) {
  const [style, setStyle] = useState("realistic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const styles = [
    { id: "realistic", label: "📷 Gerçekçi" },
    { id: "illustration", label: "🎨 İllüstrasyon" },
    { id: "3d", label: "🧊 3D" },
    { id: "abstract", label: "✨ Soyut" },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`${API}/media/generate-image-prompt`, {
        content,
        platform: "twitter",
        style,
      });
      if (res.data.success) {
        setResult(res.data);
      } else {
        toast.error(res.data.error || "Prompt oluşturulamadı");
      }
    } catch (e) {
      toast.error("Prompt oluşturma hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt kopyalandı!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-400" />
            Görsel Promptu Oluştur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Stil</label>
            <div className="flex gap-2 flex-wrap">
              {styles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    style === s.id
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            {loading ? "Oluşturuluyor..." : "Prompt Oluştur"}
          </Button>

          {result && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
                <label className="text-xs font-medium text-emerald-400">Prompt</label>
                <p className="text-sm">{result.prompt}</p>
              </div>

              {result.nano_banana_json?.negative_prompt && (
                <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
                  <label className="text-xs font-medium text-red-400">Negative Prompt</label>
                  <p className="text-sm text-muted-foreground">{result.nano_banana_json.negative_prompt}</p>
                </div>
              )}

              <div className="flex gap-2">
                {result.nano_banana_json?.style_preset && (
                  <Badge variant="secondary">{result.nano_banana_json.style_preset}</Badge>
                )}
                {result.nano_banana_json?.aspect_ratio && (
                  <Badge variant="outline">{result.nano_banana_json.aspect_ratio}</Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCopy(result.prompt)} className="flex-1 gap-2">
                  <Copy className="h-4 w-4" />
                  Prompt Kopyala
                </Button>
                {result.nano_banana_json && (
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(JSON.stringify(result.nano_banana_json, null, 2))}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    JSON Kopyala
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GenerationCard({ job }) {
  const [favorites, setFavorites] = useState(new Map());
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoContent, setVideoContent] = useState("");
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [imagePromptContent, setImagePromptContent] = useState("");
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
        await api.delete(`${API}/favorites/${favId}`, { headers });
        next.delete(index);
        toast.success("Favorilerden kaldırıldı");
      } catch {
        toast.error("Favori kaldırılamadı");
      }
    } else {
      try {
        const res = await api.post(`${API}/favorites`, {
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
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVideoContent(variant.content);
                        setVideoDialogOpen(true);
                      }}
                      className="gap-1.5 text-pink-400 hover:text-pink-300"
                      title="Video Script'e Çevir"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImagePromptContent(variant.content);
                        setImagePromptOpen(true);
                      }}
                      className="gap-1.5 text-emerald-400 hover:text-emerald-300"
                      title="Görsel Promptu Oluştur"
                    >
                      <ImageIcon className="h-4 w-4" />
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

      {/* Video Script Dialog */}
      <VideoScriptDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        content={videoContent}
      />

      {/* Image Prompt Dialog */}
      <ImagePromptDialog
        open={imagePromptOpen}
        onOpenChange={setImagePromptOpen}
        content={imagePromptContent}
      />
    </Card>
  );
}
