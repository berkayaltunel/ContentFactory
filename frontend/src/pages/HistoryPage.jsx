import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Calendar,
  Loader2,
  FileText,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import GenerationCard from "@/components/generation/GenerationCard";


const TYPE_CONFIG = {
  tweet: { labelKey: "create.contentTypes.tweet", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  quote: { labelKey: "create.contentTypes.quote", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  reply: { labelKey: "create.contentTypes.reply", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  article: { labelKey: "create.contentTypes.article", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  "style-transfer": { label: "✨ Style Transfer", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

function mapGenToJob(gen) {
  return {
    generationId: gen.id,
    topic: gen.topic || '',
    persona: gen.persona || 'expert',
    personaLabel: gen.persona || '',
    toneLabel: gen.tone || '',
    lengthLabel: gen.length || '',
    type: gen.type || 'tweet',
    status: 'completed',
    variants: (gen.variants || []).map((v, i) => ({
      ...v,
      variant_index: v.variant_index ?? i,
      character_count: v.character_count || v.content?.length || 0,
    })),
    variantCount: gen.variants?.length || 0,
    evolutionDepth: gen.evolution_depth || 0,
    style_scores: gen.style_scores || null,
  };
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  // scope=all: avatar artık her kartın kendi accountInfo'sundan geliyor
  const [filter, setFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // variant selection is now per-card (inside GenerationCard)

  useEffect(() => {
    if (isAuthenticated) fetchHistory();
  }, [isAuthenticated]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`${API}/generations/${id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast.success(t("history.deleted"));
    } catch {
      toast.error(t("history.deleteError"));
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(t('history.deleteAllConfirm'))) return;
    try {
      const res = await api.delete(`${API}/generations/all`);
      setGenerations([]);
      toast.success(t('history.allDeleted', { count: res.data.deleted }));
    } catch {
      toast.error(t("history.deleteError"));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(t('history.bulkDeleteConfirm', { count: selectedIds.size }))) return;
    try {
      const ids = Array.from(selectedIds);
      await api.delete(`${API}/generations/bulk`, { data: { ids } });
      setGenerations((prev) => prev.filter((g) => !selectedIds.has(g.id)));
      toast.success(t('history.allDeleted', { count: ids.length }));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      toast.error(t("history.deleteError"));
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

  const handleEvolve = async ({ parentGenerationId, selectedVariantIndices, feedback, quickTags, variantCount }) => {
    try {
      await api.post(`${API}/evolve`, {
        parent_generation_id: parentGenerationId,
        selected_variant_indices: selectedVariantIndices,
        feedback,
        quick_tags: quickTags,
        variant_count: variantCount,
      });
      toast.success(t('evolve.success'));
      fetchHistory();
    } catch (e) {
      toast.error(t('evolve.error'));
      throw e;
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`${API}/generations/history?limit=50&scope=all`);
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
          {t('history.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('history.subtitle')}
        </p>
      </div>

      {generations.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">{t('history.noContent')}</h3>
            <p className="text-muted-foreground">
              {t('history.noContentDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selection mode bar */}
          {selectionMode && (
            <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectedIds.size === filteredGenerations.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(filteredGenerations.map(g => g.id)));
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selectedIds.size === filteredGenerations.length && filteredGenerations.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Tümünü Seç
                </button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} öğe seçildi` : 'Öğe seçin'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={handleDeleteSelected}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil
                </Button>
              </div>
            </div>
          )}

          {/* Variant selection is now per-card (inside GenerationCard) */}

          {/* Filter tabs + actions */}
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
              {t('common.all')} ({generations.length})
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
                  {cfg.labelKey ? t(cfg.labelKey) : cfg.label || type} ({count})
                </button>
              );
            })}

            {/* Actions - sağ uca yapışık */}
            {!selectionMode && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); }}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Düzenle
                </Button>
              </div>
            )}
          </div>

          {/* Generation list */}
          <div className="space-y-4">
            {filteredGenerations.map((gen) => (
              <div
                key={gen.id}
                className={cn("relative flex items-start gap-0 transition-all duration-200", selectionMode && "cursor-pointer")}
                onClick={() => selectionMode && toggleSelect(gen.id)}
              >
                {selectionMode && (
                  <div className="flex items-start pt-4 pr-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    {selectedIds.has(gen.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                )}
                <div className={cn("flex-1 min-w-0 transition-all duration-200", selectedIds.has(gen.id) && "ring-1 ring-primary/40 rounded-lg")}>
                  <GenerationCard
                    job={mapGenToJob(gen)}
                    onDelete={selectionMode ? undefined : handleDelete}
                    showDate={true}
                    createdAt={gen.created_at}
                    tweetContent={gen.tweet_content}
                    tweetUrl={gen.tweet_url}
                    initialFavorites={gen.favorited_variants}
                    onEvolve={handleEvolve}
                    accountInfo={gen.account_info}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Variant evolve is now per-card (inside GenerationCard) */}
    </div>
  );
}
