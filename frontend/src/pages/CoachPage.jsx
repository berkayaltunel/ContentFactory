// AI Coach - Kişiselleştirilmiş içerik koçu
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, Award,
  Calendar, RefreshCw, Loader2, BarChart3, Zap, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";


const insightIcons = {
  tip: Lightbulb,
  warning: AlertTriangle,
  suggestion: TrendingUp,
  praise: Award,
};

const insightColors = {
  tip: "border-blue-500/30 bg-blue-500/5",
  warning: "border-yellow-500/30 bg-yellow-500/5",
  suggestion: "border-green-500/30 bg-green-500/5",
  praise: "border-purple-500/30 bg-purple-500/5",
};

const insightIconColors = {
  tip: "text-blue-400",
  warning: "text-yellow-400",
  suggestion: "text-green-400",
  praise: "text-purple-400",
};

function StatBar({ label, data, colorMap }) {
  if (!data || Object.keys(data).length === 0) return null;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const defaultColors = ["bg-sky-500", "bg-purple-500", "bg-pink-500", "bg-green-500", "bg-yellow-500", "bg-orange-500"];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex rounded-full overflow-hidden h-3 bg-secondary">
        {Object.entries(data).map(([key, count], i) => (
          <div
            key={key}
            className={cn(colorMap?.[key] || defaultColors[i % defaultColors.length], "transition-all")}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${key}: ${count} (${Math.round((count / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data).map(([key, count], i) => (
          <span key={key} className="text-xs text-muted-foreground">
            <span className={cn("inline-block w-2 h-2 rounded-full mr-1", colorMap?.[key] || defaultColors[i % defaultColors.length])} />
            {key}: {count} ({Math.round((count / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

// SHORT_DAYS moved inside components that need translation

function getHeatmapColor(score) {
  if (score >= 0.85) return "bg-emerald-400";
  if (score >= 0.7) return "bg-emerald-700";
  if (score >= 0.5) return "bg-emerald-900";
  if (score >= 0.3) return "bg-zinc-700";
  return "bg-zinc-800";
}

function PostingHeatmap({ postingData, bestNow, postingLoading }) {
  const { t } = useTranslation();
  const SHORT_DAYS = t('coach.shortDays', { returnObjects: true });
  if (postingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!postingData) return null;

  const { heatmap, days, best_slots, timezone } = postingData;
  const evenHours = Array.from({ length: 12 }, (_, i) => i * 2);

  return (
    <div className="space-y-4">
      {/* Şimdi Paylaşsam? */}
      {bestNow && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  {t('coach.postNow')}
                </p>
                <p className="text-lg font-bold mt-1">{bestNow.verdict}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('coach.score', { score: Math.round((bestNow.current_score || 0) * 100) })}</p>
                {bestNow.next_best && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('coach.nextBest', { day: bestNow.next_best.day, time: bestNow.next_best.time, hours: bestNow.next_best.hours_away })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Hour labels */}
          <div className="flex ml-10">
            {evenHours.map((h) => (
              <div key={h} className="w-7 text-center text-xs text-muted-foreground">{h}</div>
            ))}
          </div>
          {/* Rows */}
          {heatmap.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
              <span className="w-8 text-xs text-muted-foreground text-right mr-1">{SHORT_DAYS[dayIdx]}</span>
              {row.map((score, hourIdx) => (
                <div
                  key={hourIdx}
                  className={cn("w-[11px] h-[11px] rounded-sm cursor-pointer transition-colors hover:ring-1 hover:ring-white/50", getHeatmapColor(score))}
                  title={`${days?.[dayIdx] || SHORT_DAYS[dayIdx]} ${String(hourIdx).padStart(2, "0")}:00 - Skor: ${score.toFixed(2)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Timezone */}
      {timezone && <p className="text-xs text-muted-foreground">{timezone}</p>}

      {/* Best 5 Slots */}
      {best_slots && best_slots.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{t('coach.top5Slots')}</p>
          <div className="flex flex-wrap gap-2">
            {best_slots.slice(0, 5).map((slot, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {slot.day} {slot.time} — {Math.round(slot.score * 100)}%
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoachPage() {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [postingData, setPostingData] = useState(null);
  const [bestNow, setBestNow] = useState(null);
  const [postingLoading, setPostingLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInsights();
    fetchPostingData();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/coach/insights`);
      setInsights(res.data);
    } catch (e) {
      toast.error(t('coach.coachDataError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPostingData = async () => {
    setPostingLoading(true);
    try {
      const [heatmapRes, bestNowRes] = await Promise.all([
        api.get(`${API}/posting-times/heatmap`),
        api.get(`${API}/posting-times/best-now`),
      ]);
      setPostingData(heatmapRes.data);
      setBestNow(bestNowRes.data);
    } catch (e) {
      // silent fail - posting times is optional
    } finally {
      setPostingLoading(false);
    }
  };

  const fetchWeeklyPlan = async () => {
    setPlanLoading(true);
    try {
      const res = await api.get(`${API}/coach/weekly-plan?niche=tech`);
      setWeeklyPlan(res.data);
    } catch (e) {
      toast.error(t('coach.weeklyPlanError'));
    } finally {
      setPlanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = insights?.stats || {};
  const insightsList = insights?.insights || [];

  return (
    <div className="max-w-4xl" data-testid="coach-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-outfit text-3xl font-bold tracking-tight">{t('coach.title')}</h1>
            <p className="text-muted-foreground">{t('coach.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 border-sky-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-sky-400">{stats.total || 0}</p>
            <p className="text-sm text-muted-foreground">{t('coach.totalGeneration')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-red-500/10 border-pink-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-pink-400">{stats.favorites || 0}</p>
            <p className="text-sm text-muted-foreground">{t('coach.favorite')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.favorite_ratio || 0}%</p>
            <p className="text-sm text-muted-foreground">{t('coach.favoriteRatio')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <StatBar label={t('coach.personaDistribution')} data={stats.personas} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <StatBar label={t('coach.toneDistribution')} data={stats.tones} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <StatBar label={t('coach.lengthDistribution')} data={stats.lengths} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <StatBar label={t('coach.contentType')} data={stats.types} />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insightsList.length > 0 && (
        <div className="mb-8">
          <h2 className="font-outfit text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            {t('coach.aiSuggestions')}
          </h2>
          <div className="space-y-3">
            {insightsList.map((insight, i) => {
              const Icon = insightIcons[insight.type] || Lightbulb;
              return (
                <Card key={i} className={cn("border", insightColors[insight.type])}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", insightIconColors[insight.type])} />
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      {insight.action && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-2 text-xs"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (insight.action) params.set("topic", insight.action);
                            navigate(`/dashboard/create?platform=twitter${params.toString() ? `?${params.toString()}` : ""}`);
                          }}
                        >
                          {insight.action}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {insights?.message && (
        <Card className="mb-8 border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{insights.message}</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard/create?platform=twitter")}>
              {t('coach.startGenerating')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weekly Plan */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            {t('coach.weeklyPlan')}
          </h2>
          <Button variant="outline" size="sm" onClick={fetchWeeklyPlan} disabled={planLoading}>
            {planLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {weeklyPlan ? t('coach.recreatePlan') : t('coach.createPlan')}
          </Button>
        </div>

        {weeklyPlan ? (
          <div className="space-y-2">
            {weeklyPlan.weekly_goal && (
              <p className="text-sm text-muted-foreground mb-3">
                {t('coach.weeklyGoal', { goal: weeklyPlan.weekly_goal })}
              </p>
            )}
            {(weeklyPlan.plan || []).map((day, i) => (
              <Card key={i} className="hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <p className="font-medium text-sm">{day.day}</p>
                    <p className="text-xs text-muted-foreground">{day.best_time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{day.topic_suggestion}</p>
                    <p className="text-xs text-muted-foreground">{day.reasoning}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="secondary" className="text-xs">{day.content_type}</Badge>
                    <Badge variant="outline" className="text-xs">{day.persona}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/dashboard/create?platform=twitter?topic=${encodeURIComponent(day.topic_suggestion)}${day.persona ? `&persona=${encodeURIComponent(day.persona)}` : ""}${day.tone ? `&tone=${encodeURIComponent(day.tone)}` : ""}`)}
                    className="shrink-0"
                  >
                    {t('coach.write')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('coach.noPlan')}</p>
              <Button variant="outline" className="mt-4" onClick={fetchWeeklyPlan} disabled={planLoading}>
                {t('coach.createPlan')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Optimal Paylaşım Saatleri */}
      <div className="mb-8">
        <h2 className="font-outfit text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-emerald-400" />
          {t('coach.optimalPostingTimes')}
        </h2>
        <Card>
          <CardContent className="p-4">
            <PostingHeatmap postingData={postingData} bestNow={bestNow} postingLoading={postingLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
