import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { User, Search, BarChart3, TrendingUp, ThumbsUp, ThumbsDown, Lightbulb, Clock, MoreVertical, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api, { API } from "@/lib/api";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";


function DimensionRadar({ dimensions }) {
  const { t } = useTranslation();
  if (!dimensions) return null;
  const data = [
    { subject: t('account.dimensions.content'), value: dimensions.content_quality || 0 },
    { subject: t('account.dimensions.engagement'), value: dimensions.engagement_rate || 0 },
    { subject: t('account.dimensions.consistency'), value: dimensions.consistency || 0 },
    { subject: t('account.dimensions.creativity'), value: dimensions.creativity || 0 },
    { subject: t('account.dimensions.community'), value: dimensions.community || 0 },
    { subject: t('account.dimensions.growth'), value: dimensions.growth_potential || 0 },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Radar
            name="Skor"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PostingHeatmap({ heatmap }) {
  const { t } = useTranslation();
  if (!heatmap || !Array.isArray(heatmap)) return null;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = t('coach.shortDays', { returnObjects: true });

  // Normalize
  let max = 0;
  heatmap.forEach(day => {
    if (day.hours) {
      Object.values(day.hours).forEach(v => { if (v > max) max = v; });
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `60px repeat(24, 1fr)` }}>
        <div />
        {hours.map(h => (
          <div key={h} className="text-[10px] text-muted-foreground text-center">{h}</div>
        ))}
        {heatmap.slice(0, 7).map((day, di) => (
          <>
            <div key={`label-${di}`} className="text-xs text-muted-foreground flex items-center">
              {days[di] || day.day?.substring(0, 3)}
            </div>
            {hours.map(h => {
              const count = day.hours?.[String(h)] || 0;
              const intensity = max > 0 ? count / max : 0;
              return (
                <div
                  key={`${di}-${h}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                      : "hsl(var(--secondary))",
                  }}
                  title={`${days[di] || day.day} ${h}:00 - ${count} tweet`}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, items, icon: Icon, color }) {
  const colorMap = {
    green: "border-green-500/30 bg-green-500/5",
    red: "border-red-500/30 bg-red-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
  };

  const titleColor = {
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };

  return (
    <div className={cn("rounded-xl border p-4", colorMap[color])}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-5 w-5", titleColor[color])} />
        <h4 className={cn("font-semibold", titleColor[color])}>{title}</h4>
      </div>
      <div className="space-y-2">
        {items?.map((item, i) => (
          <div key={i}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTweet({ tweet, index }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
      <div className="flex items-start gap-2">
        <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm">{tweet.content?.substring(0, 200)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>❤️ {tweet.likes || 0}</span>
            <span>🔁 {tweet.retweets || 0}</span>
            <span>💬 {tweet.replies || 0}</span>
          </div>
          {tweet.why_good && (
            <p className="text-xs text-blue-400 mt-1">💡 {tweet.why_good}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountAnalysisPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchHistory = useCallback(async (append = false) => {
    if (!append) setHistoryLoading(true);
    setHistoryError(false);
    try {
      const offset = append ? history.length : 0;
      const res = await api.get(`${API}/analyze/history`, { params: { limit: 20, offset } });
      const data = res.data.analyses || [];
      setHistory(prev => append ? [...prev, ...data] : data);
      setHasMore(res.data.has_more || false);
    } catch (err) {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [history.length]);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu analizi geçmişten silmek istediğine emin misin?")) return;
    try {
      await api.delete(`${API}/analyze/history/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success("Silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleViewDetail = async (item) => {
    try {
      setLoading(true);
      setLoadingStep("Rapor yükleniyor...");
      const res = await api.get(`${API}/analyze/history/${item.id}`);
      setResult({
        success: true,
        username: res.data.twitter_username,
        display_name: res.data.display_name,
        followers: res.data.followers_count,
        bio: res.data.bio,
        tweets_analyzed: res.data.tweet_count,
        tweet_count_analyzed: res.data.tweet_count,
        analysis: res.data.analysis,
      });
      setUsername(res.data.twitter_username);
    } catch {
      toast.error("Rapor yüklenemedi");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleAnalyze = async () => {
    if (!username.trim()) {
      toast.error(t('account.emptyUsername'));
      return;
    }
    setLoading(true);
    setResult(null);
    setLoadingStep(t('account.fetchingTweets'));

    try {
      setTimeout(() => setLoadingStep(t('account.aiAnalyzing')), 8000);
      setTimeout(() => setLoadingStep(t('account.preparingReport')), 15000);

      const res = await api.post(`${API}/analyze/account`, {
        twitter_username: username.replace("@", ""),
      });

      if (res.data.success) {
        setResult(res.data);
        toast.success(t('account.analysisComplete'));
        fetchHistory();
      } else {
        toast.error(res.data.error || t('account.analysisError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t('account.analysisError'));
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const analysis = result?.analysis;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <BarChart3 className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t('account.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('account.subtitle')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder={t('account.placeholder')}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
        >
          {loading ? t('account.analyzing') : t('account.analyze')}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-lg font-medium">{loadingStep}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('account.processingTime')}</p>
          <div className="w-64 mx-auto mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && analysis && (
        <div className="space-y-6">
          {/* Score Header */}
          <div className="flex items-center justify-between p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                {analysis.overall_score || 0}
              </div>
              <div>
                <h2 className="text-xl font-bold">@{result.username}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('account.tweetsAnalyzed', { count: result.tweets_analyzed || result.tweet_count_analyzed })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('account.overallScore')}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {analysis.overall_score || 0}/100
              </p>
            </div>
          </div>

          {/* Radar + Tone */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {t('account.performanceDimensions')}
              </h3>
              <DimensionRadar dimensions={analysis.dimensions} />
            </div>

            <div className="space-y-4">
              {/* Tone */}
              {analysis.tone_analysis && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">{t('account.toneAnalysis')}</h3>
                  <p className="text-sm text-muted-foreground">{analysis.tone_analysis}</p>
                </div>
              )}

              {/* Posting Frequency */}
              {analysis.posting_frequency && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {t('account.postingFrequency')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{analysis.posting_frequency}</p>
                </div>
              )}

              {/* Hashtag Strategy */}
              {analysis.hashtag_strategy && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">{t('account.hashtagStrategy')}</h3>
                  <p className="text-sm text-muted-foreground">{analysis.hashtag_strategy}</p>
                </div>
              )}

              {/* Growth Tips */}
              {analysis.growth_tips && (
                <div className="rounded-xl border border-border bg-card p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
                  <h3 className="font-semibold mb-2">{t('account.growthStrategy')}</h3>
                  <p className="text-sm text-muted-foreground">{analysis.growth_tips}</p>
                </div>
              )}
            </div>
          </div>

          {/* Strengths / Weaknesses / Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              title={t('account.strengths')}
              items={analysis.strengths}
              icon={ThumbsUp}
              color="green"
            />
            <InfoCard
              title={t('account.weaknesses')}
              items={analysis.weaknesses}
              icon={ThumbsDown}
              color="red"
            />
            <InfoCard
              title={t('account.recommendations')}
              items={analysis.recommendations}
              icon={Lightbulb}
              color="blue"
            />
          </div>

          {/* Posting Heatmap */}
          {analysis.posting_heatmap && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">{t('account.postingHeatmap')}</h3>
              <PostingHeatmap heatmap={analysis.posting_heatmap} />
            </div>
          )}

          {/* Top Tweets */}
          {analysis.top_tweets && analysis.top_tweets.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">{t('account.topTweets')}</h3>
              <div className="space-y-3">
                {analysis.top_tweets.map((tweet, i) => (
                  <TopTweet key={i} tweet={tweet} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {!loading && !result && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4 text-muted-foreground">{t('account.previousAnalyses')}</h3>

          {/* Loading */}
          {historyLoading && history.length === 0 && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-secondary rounded" />
                      <div className="h-3 w-48 bg-secondary rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {historyError && history.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Geçmiş yüklenemedi</p>
              <Button variant="outline" size="sm" onClick={() => fetchHistory()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Tekrar Dene
              </Button>
            </div>
          )}

          {/* Empty */}
          {!historyLoading && !historyError && history.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Henüz bir hesap analiz edilmedi</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Yukarıdan bir kullanıcı adı girerek başla</p>
            </div>
          )}

          {/* List */}
          {history.length > 0 && (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleViewDetail(item)}
                  className="p-4 rounded-xl border border-border bg-card hover:border-blue-500/30 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <img
                      src={item.avatar_url || `https://unavatar.io/x/${item.twitter_username}`}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div
                      className="h-10 w-10 rounded-full bg-blue-500/20 items-center justify-center shrink-0 text-blue-400 font-bold text-sm"
                      style={{ display: 'none' }}
                    >
                      {(item.display_name || item.twitter_username || '?').charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">@{item.twitter_username}</span>
                        {item.display_name && (
                          <span className="text-xs text-muted-foreground truncate">{item.display_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.tweet_count} tweet
                        {item.followers_count > 0 && ` · ${item.followers_count.toLocaleString()} takipçi`}
                        {' · '}
                        {new Date(item.updated_at || item.created_at).toLocaleDateString("tr-TR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <span className={cn(
                        "text-lg font-bold",
                        (item.overall_score || 0) >= 70 ? "text-green-400" :
                        (item.overall_score || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {item.overall_score || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>

                    {/* Menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {openMenuId === item.id && (
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Geçmişten sil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => fetchHistory(true)}>
                    Daha fazla yükle
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
