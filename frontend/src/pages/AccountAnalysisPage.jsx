import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { User, Search, BarChart3, TrendingUp, ThumbsUp, ThumbsDown, Lightbulb, Clock } from "lucide-react";
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

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`${API}/analyze/history`);
      setHistory(res.data.analyses || []);
    } catch (err) {
      // ignore
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
        username: username.replace("@", ""),
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
                  {t('account.tweetsAnalyzed', { count: result.tweet_count_analyzed })}
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
      {!loading && !result && history.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4 text-muted-foreground">{t('account.previousAnalyses')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setUsername(item.username);
                }}
                className="p-4 rounded-xl border border-border bg-card hover:border-blue-500/30 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">@{item.username}</span>
                  <span className="text-sm font-bold text-blue-400">{item.overall_score}/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.tweet_count} tweet · {new Date(item.created_at).toLocaleDateString("tr-TR")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
