import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Loader2, Copy, Heart, Send, Video, X, Clock, Music, Hash, ImageIcon, Palette, Dna, Check, Calendar, Trash2, Twitter } from "lucide-react";
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
import SkeletonTweetRow from "./SkeletonTweetRow";
import EvolvePanel from "./EvolvePanel";


const PERSONA_COLORS = {
  expert: "#F97316",
  leaked: "#3B82F6",
  coach: "#22C55E",
  news: "#A855F7",
  meme: "#EC4899",
  against: "#6B7280",
};

function VideoScriptDialog({ open, onOpenChange, content }) {
  const { t } = useTranslation();
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
        toast.error(res.data.error || t('generation.videoScript.generateError'));
      }
    } catch (e) {
      toast.error(t('generation.videoScript.generateError'));
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
    toast.success(t('generation.videoScript.copied'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-pink-400" />
            {t('generation.videoScript.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('generation.videoScript.duration')}</label>
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
            <label className="text-sm font-medium">{t('generation.videoScript.platform')}</label>
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
            {loading ? t('generation.videoScript.generating') : t('generation.videoScript.generate')}
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
                    <p className="text-xs text-pink-400">{t('generation.videoScript.overlay')}: {seg.text_overlay}</p>
                    <p className="text-xs text-muted-foreground">{t('generation.videoScript.visual')}: {seg.visual_note}</p>
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
                {t('generation.videoScript.copyScript')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImagePromptDialog({ open, onOpenChange, content }) {
  const { t } = useTranslation();
  const [style, setStyle] = useState("realistic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const styles = [
    { id: "realistic", labelKey: "generation.imagePrompt.realistic" },
    { id: "illustration", labelKey: "generation.imagePrompt.illustration" },
    { id: "3d", labelKey: "generation.imagePrompt.threeD" },
    { id: "abstract", labelKey: "generation.imagePrompt.abstract" },
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
        toast.error(res.data.error || t('generation.imagePrompt.generateError'));
      }
    } catch (e) {
      toast.error(t('generation.imagePrompt.generateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('generation.imagePrompt.copied'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-400" />
            {t('generation.imagePrompt.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('generation.imagePrompt.style')}</label>
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
                  {t(s.labelKey)}
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
            {loading ? t('generation.imagePrompt.generating') : t('generation.imagePrompt.generate')}
          </Button>

          {result && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
                <label className="text-xs font-medium text-emerald-400">{t('generation.imagePrompt.prompt')}</label>
                <p className="text-sm">{result.prompt}</p>
              </div>

              {result.nano_banana_json?.negative_prompt && (
                <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
                  <label className="text-xs font-medium text-red-400">{t('generation.imagePrompt.negativePrompt')}</label>
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
                  {t('generation.imagePrompt.copyPrompt')}
                </Button>
                {result.nano_banana_json && (
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(JSON.stringify(result.nano_banana_json, null, 2))}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {t('generation.imagePrompt.copyJson')}
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

// Style Score Mini Card
function StyleScoreCard({ scores, isBest }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!scores) return null;

  const scoreMap = {
    constraint: t('generation.scores.styleMatch'),
    length: t('generation.scores.length'),
    punctuation: t('generation.scores.punctuation'),
    vocabulary: t('generation.scores.vocabulary'),
    algorithm: t('generation.scores.algorithm'),
    hook: t('generation.scores.hook'),
    reply_potential: t('generation.scores.engagement'),
  };

  const overallScore = scores.constraint != null ? Math.round(scores.constraint * 100) : null;
  const barColor = (val) => val > 80 ? "bg-green-500" : val > 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {overallScore != null && (
          <span className="text-xs font-medium">{t('generation.styleMatch', { score: overallScore })}</span>
        )}
        {isBest && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">{t('generation.best')}</span>
        )}
        <span className="text-[10px] opacity-60">{expanded ? "▲" : "▼"} {t('generation.scoreDetails')}</span>
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1.5">
          {Object.entries(scoreMap).map(([key, label]) => {
            const raw = scores[key];
            if (raw == null) return null;
            const val = Math.round(typeof raw === "number" && raw <= 1 ? raw * 100 : raw);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-28 truncate">{label}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", barColor(val))} style={{ width: `${Math.min(val, 100)}%` }} />
                </div>
                <span className="text-[11px] font-medium w-8 text-right">{val}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GenerationCard({ job, onEvolve, onDelete, showDate, createdAt, tweetContent, tweetUrl, initialFavorites, avatarUrl }) {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState(() =>
    new Map(Object.entries(initialFavorites || {}).map(([k, v]) => [parseInt(k), v]))
  );
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoContent, setVideoContent] = useState("");
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [imagePromptContent, setImagePromptContent] = useState("");
  const [evolveIndex, setEvolveIndex] = useState(null);
  const [evolveLoading, setEvolveLoading] = useState(false);
  const [selectedForEvolve, setSelectedForEvolve] = useState(new Set());
  const [mergeEvolveOpen, setMergeEvolveOpen] = useState(false);
  const hasMultipleVariants = job.variants?.length > 1;
  const hasSelection = selectedForEvolve.size > 0;

  const toggleEvolveSelect = (index) => {
    setSelectedForEvolve(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const color = PERSONA_COLORS[job.persona] || "#6B7280";
  const isGenerating = job.status === "generating";

  // Find best variant by style score
  const styleScores = job.variants?.map((v, i) => {
    const s = v.style_scores || job.style_scores?.[i] || null;
    return s?.constraint ?? -1;
  }) || [];
  const bestIdx = styleScores.length > 0 ? styleScores.indexOf(Math.max(...styleScores)) : -1;

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success(t('generation.copySuccess'));
  };

  const handleTweet = (content) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, "_blank");
    localStorage.setItem("typehype-onboard-tweet", "true");
    toast.success(t('generation.twitterOpening'));
  };

  const handleFavorite = async (index, variant) => {
    const next = new Map(favorites);
    try {
      const res = await api.post(`${API}/favorites/toggle`, {
        content: variant.content,
        type: job.type || "tweet",
        generation_id: job.generationId || null,
        variant_index: index,
      });
      if (res.data.action === "added") {
        next.set(index, res.data.favorite_id);
        toast.success(t('generation.favoriteAdded'));
      } else {
        next.delete(index);
        toast.success(t('generation.favoriteRemoved'));
      }
    } catch {
      toast.error(t('generation.favoriteError'));
    }
    setFavorites(next);
  };

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shrink-0"
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      );
    }
    return null;
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
      <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        {/* Header: Avatar + Prompt + Tags */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {renderAvatar()}
            <div
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
              style={{ backgroundColor: color, display: avatarUrl ? 'none' : 'flex' }}
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                job.persona.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          {/* Prompt + Tags */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{job.topic}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">
                {job.personaLabel} · {job.toneLabel} · {job.lengthLabel}
              </p>
              {job.evolutionDepth > 0 && (
                <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-[10px] px-1.5 py-0">
                  🧬 {t('evolve.round', { round: job.evolutionDepth })}
                </Badge>
              )}
            </div>
          </div>

          {/* Date badge */}
          {showDate && createdAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(createdAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          {/* Status */}
          {isGenerating && (
            <span className="text-xs text-orange-400 whitespace-nowrap shrink-0">
              {t('generation.nTweetsGenerating', { count: job.variantCount })}
            </span>
          )}

          {/* Delete button */}
          {onDelete && !isGenerating && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
              onClick={() => {
                if (window.confirm(t('history.deleteConfirm'))) {
                  onDelete(job.generationId);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Original tweet preview for quote/reply */}
        {tweetContent && (
          <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
            <div className="flex items-center gap-2 mb-1.5">
              {job.type === "quote" ? (
                <Twitter className="h-3.5 w-3.5 text-sky-400" />
              ) : (
                <Send className="h-3.5 w-3.5 text-green-400" />
              )}
              {tweetUrl && (
                <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                  {tweetUrl.match(/@?(\w+)\/status/)?.[1] ? `@${tweetUrl.match(/@?(\w+)\/status/)[1]}` : t('history.originalTweet')}
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{tweetContent}</p>
          </div>
        )}

        {/* Content: Skeleton rows (generating) or real content (completed) */}
        {isGenerating ? (
          <div className="space-y-2">
            {Array.from({ length: job.variantCount }).map((_, i) => (
              <SkeletonTweetRow key={i} />
            ))}
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {job.variants?.map((variant, index) => {
              const isEvolveSelected = selectedForEvolve.has(index);
              return (
              <div
                key={variant.id || index}
                className={cn(
                  "rounded-lg border p-3 space-y-2 relative transition-all",
                  isEvolveSelected
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-border"
                )}
              >
                {hasMultipleVariants && (
                  <button
                    onClick={() => toggleEvolveSelect(index)}
                    className={cn(
                      "absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10",
                      isEvolveSelected
                        ? "bg-violet-500 border-violet-500 text-white"
                        : "border-white/20 hover:border-violet-400"
                    )}
                  >
                    {isEvolveSelected && <Check className="w-3 h-3" />}
                  </button>
                )}
                <p className={cn("text-sm whitespace-pre-wrap", hasMultipleVariants && "pl-6")}>{variant.content}</p>
                <StyleScoreCard
                  scores={variant.style_scores || job.style_scores?.[index] || null}
                  isBest={bestIdx === index && bestIdx >= 0 && styleScores[bestIdx] > 0}
                />
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {t('common.nCharacters', { count: variant.character_count })}
                    </Badge>
                    {job.variants.length > 1 && (
                      <Badge variant="outline">{t('common.variant')} {index + 1}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(variant.content)}
                      className="gap-1 min-h-[36px] min-w-[36px] sm:min-w-0"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('common.copy')}</span>
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
                      title={t('generation.videoScriptConvert')}
                      disabled={hasSelection}
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
                      title={t('generation.imagePromptCreate')}
                      disabled={hasSelection}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEvolveIndex(evolveIndex === index ? null : index)}
                      className="gap-1.5 text-violet-400 hover:text-violet-300"
                      title={t('evolve.evolveButton')}
                      disabled={hasSelection}
                    >
                      <Dna className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('evolve.evolve')}</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleTweet(variant.content)}
                      className="gap-1 bg-sky-500 hover:bg-sky-600 text-white min-h-[36px] min-w-[36px] sm:min-w-0"
                      disabled={hasSelection}
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('common.tweetle')}</span>
                    </Button>
                  </div>
                </div>
                {evolveIndex === index && (
                  <EvolvePanel
                    variant={variant}
                    onEvolve={async (feedback, quickTags, variantCount) => {
                      setEvolveLoading(true);
                      try {
                        await onEvolve?.({
                          parentGenerationId: job.generationId,
                          selectedVariantIndices: [index],
                          feedback,
                          quickTags,
                          variantCount,
                        });
                        setEvolveIndex(null);
                      } catch (e) {
                        toast.error(t('evolve.error'));
                      } finally {
                        setEvolveLoading(false);
                      }
                    }}
                    isLoading={evolveLoading}
                    onClose={() => setEvolveIndex(null)}
                  />
                )}
              </div>
              );
            })}
          </div>

          {/* Merge evolve button - appears when 2+ variants selected */}
          {selectedForEvolve.size >= 2 && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-violet-400">
                  {selectedForEvolve.size} varyant seçildi
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedForEvolve(new Set())}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => setMergeEvolveOpen(!mergeEvolveOpen)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <Dna className="w-3.5 h-3.5" />
                    Seçilenleri Birlikte Geliştir ({selectedForEvolve.size})
                  </button>
                </div>
              </div>

              {mergeEvolveOpen && (
                <EvolvePanel
                  variants={Array.from(selectedForEvolve).map(idx => ({
                    generationId: job.generationId,
                    variantIndex: idx,
                    content: job.variants[idx]?.content || "",
                  }))}
                  onEvolve={async (feedback, quickTags, variantCount) => {
                    setEvolveLoading(true);
                    try {
                      await onEvolve?.({
                        parentGenerationId: job.generationId,
                        selectedVariantIndices: Array.from(selectedForEvolve),
                        feedback,
                        quickTags,
                        variantCount,
                      });
                      setSelectedForEvolve(new Set());
                      setMergeEvolveOpen(false);
                    } catch (e) {
                      toast.error(t('evolve.error'));
                    } finally {
                      setEvolveLoading(false);
                    }
                  }}
                  isLoading={evolveLoading}
                  onClose={() => setMergeEvolveOpen(false)}
                  isMerge={true}
                />
              )}
            </div>
          )}
          </>
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
