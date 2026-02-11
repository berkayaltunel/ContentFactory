import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Upload, TrendingUp, Lightbulb, Search, Globe, GraduationCap, BarChart3, MessageSquare, Users, Image, Sparkles, Compass, Languages, ThumbsUp, Clock, Star, Eye, MessageCircle, CheckCircle, AlertTriangle, Zap, Target, ArrowRight } from "lucide-react";
import { FaYoutube } from "react-icons/fa6";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "https://api.typehype.io";

// Supabase auth token'ını localStorage'dan al (lib/api.js ile aynı mantık)
const getAuthToken = () => {
  try {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!key) return null;
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed?.access_token || null;
  } catch { return null; }
};

const apiCall = async (endpoint, method = "POST", body = null) => {
  const token = getAuthToken();
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-TH-Client": "web-app" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  return res.json();
};

const apiUpload = async (endpoint, formData) => {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-TH-Client": "web-app" },
    body: formData,
  });
  return res.json();
};

/* ── Helpers ── */

// AI analysis dict veya string olabilir, her zaman string'e çevir
const flattenAnalysis = (ai) => {
  if (!ai) return null;
  if (typeof ai === "string") return ai;
  // Dict ise: analysis, summary, feedback, veya tüm value'ları birleştir
  if (ai.analysis) return typeof ai.analysis === "string" ? ai.analysis : JSON.stringify(ai.analysis, null, 2);
  if (ai.summary) return typeof ai.summary === "string" ? ai.summary : JSON.stringify(ai.summary, null, 2);
  if (ai.feedback) return typeof ai.feedback === "string" ? ai.feedback : JSON.stringify(ai.feedback, null, 2);
  // Tüm key-value'ları markdown listesine çevir
  return Object.entries(ai).filter(([k]) => k !== "success").map(([k, v]) => `**${k.replace(/_/g, " ")}:** ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n\n");
};

const simpleMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-white">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-white">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-white/70">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 text-white/70">$1</li>')
    .replace(/\n/g, "<br/>");
};

const MetricCard = ({ label, value, sub }) => (
  <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
  </div>
);

const ErrorCard = ({ message }) => (
  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{message}</div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
  </div>
);

const AIResult = ({ html }) => (
  <div className="bg-[#141414] border border-white/10 rounded-xl p-5 mt-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
);

const SectionHeading = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-bold text-white font-outfit">{title}</h2>
    <p className="text-white/40 text-sm mt-1">{subtitle}</p>
  </div>
);

/* ── TABS CONFIG ── */

const TABS = [
  { id: "channel", label: "Kanal Analizi", icon: BarChart3 },
  { id: "video", label: "Video Analizi", icon: FaYoutube },
  { id: "comments", label: "Yorum Analizi", icon: MessageSquare },
  { id: "competitor", label: "Rakip Analizi", icon: Users },
  { id: "thumbnail", label: "Kapak AI", icon: Image },
  { id: "ideas", label: "Fikir Üretici", icon: Lightbulb },
  { id: "niche", label: "Niş Analizi", icon: Compass },
  { id: "trends", label: "Trend Keşfi", icon: TrendingUp },
  { id: "keywords", label: "Keyword Trendleri", icon: Search },
  { id: "transflow", label: "TransFlow", icon: Languages },
  { id: "school", label: "Üretici Okulu", icon: GraduationCap },
];

/* ══════════════════════════════════════════════════════
   TAB 1: Kanal Analizi
   ══════════════════════════════════════════════════════ */
function ChannelTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/channel/analyze", "POST", { url: url });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      // Flatten: metrics + ai_analysis -> top level
      setData({ ...res.metrics, analysis: res.ai_analysis, channel: res.channel, videos_analyzed: res.videos_analyzed });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Kanalının gerçek potansiyelini gör." subtitle="YouTube kanal URL'sini gir, AI detaylı analiz yapsın." />
      <div className="flex gap-3 mb-6">
        <Input placeholder="https://youtube.com/@kanal" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} className="bg-[#141414] border-white/10 text-white flex-1" />
        <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analiz Et"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MetricCard label="Abone" value={data.subscriber_count?.toLocaleString("tr-TR")} />
            <MetricCard label="Video Sayısı" value={data.video_count?.toLocaleString("tr-TR")} />
            <MetricCard label="Toplam Görüntülenme" value={data.total_views?.toLocaleString("tr-TR")} />
            <MetricCard label="Ort. Görüntülenme" value={data.avg_views?.toLocaleString("tr-TR")} />
          </div>
          {data.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
        </>
      )}
    </div>
  );
}

/* ── Video Tab Helpers ── */
const parseDuration = (iso) => {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}:` : "";
  const min = m[2] || "0";
  const sec = (m[3] || "0").padStart(2, "0");
  return h ? `${h}${min.padStart(2, "0")}:${sec}` : `${min}:${sec}`;
};

const ScoreBadge = ({ score, suffix = "/10" }) => {
  const n = parseFloat(score);
  const color = n >= 7 ? "bg-green-500/20 text-green-400 border-green-500/30" : n >= 5 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-red-500/20 text-red-400 border-red-500/30";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${color}`}>{score}{suffix}</span>;
};

/* ══════════════════════════════════════════════════════
   TAB 2: Video Analizi
   ══════════════════════════════════════════════════════ */
function VideoTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/video/analyze", "POST", { url: url });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData({ ...res.metrics, analysis: res.ai_analysis, video: res.video });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const a = data?.analysis; // shorthand for ai_analysis
  const v = data?.video;

  return (
    <div>
      <SectionHeading title="Bu video neden tuttu? Ya da neden tutmadı?" subtitle="Video URL'sini gir, performans analizi al." />
      <div className="flex gap-3 mb-6">
        <Input placeholder="https://youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} className="bg-[#141414] border-white/10 text-white flex-1" />
        <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analiz Et"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data && (
        <div className="space-y-4">
          {/* ── Video Info Card ── */}
          {v && (
            <div className="bg-[#141414] border border-white/10 rounded-xl p-4 flex gap-4 items-start">
              {(v.thumbnails?.high?.url || v.thumbnails?.medium?.url || v.thumbnail) && (
                <img src={v.thumbnails?.high?.url || v.thumbnails?.medium?.url || v.thumbnail} alt="" className="w-44 rounded-lg aspect-video object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2">{v.title}</h3>
                <p className="text-white/40 text-sm mt-1">{v.channelTitle || v.channel_title}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                  <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{Number(v.viewCount || data.views || 0).toLocaleString("tr-TR")}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" />{Number(v.likeCount || data.likes || 0).toLocaleString("tr-TR")}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{Number(v.commentCount || data.comments || 0).toLocaleString("tr-TR")}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Metric Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Etkileşim Oranı", value: data.engagement_rate ? `%${data.engagement_rate}` : "—", icon: TrendingUp, gradient: "from-green-500 to-emerald-600" },
              { label: "Beğeni Oranı", value: data.like_rate ? `%${data.like_rate}` : "—", icon: ThumbsUp, gradient: "from-blue-500 to-cyan-600" },
              { label: "Süre", value: parseDuration(v?.duration), icon: Clock, gradient: "from-red-500 to-rose-600" },
              { label: "Performans Skoru", value: data.performance_score != null ? `${data.performance_score}/100` : "—", icon: Star, gradient: "from-yellow-500 to-amber-600" },
            ].map((m, i) => (
              <div key={i} className="bg-[#141414] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0`}>
                  <m.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">{m.label}</p>
                  <p className="text-xl font-bold text-white">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── AI Analysis ── */}
          {a && typeof a === "object" && (
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-fuchsia-400" />
                <h2 className="text-xl font-bold text-white">AI Analizi</h2>
              </div>

              {/* Overall */}
              {a.overall_assessment && (
                <p className="text-white/70 leading-relaxed">{a.overall_assessment}</p>
              )}

              {/* Title Analysis */}
              {a.title_analysis && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Başlık Analizi</h3>
                    {a.title_analysis.score != null && <ScoreBadge score={a.title_analysis.score} />}
                  </div>
                  {a.title_analysis.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase">Güçlü Yönler</p>
                      <ul className="space-y-1">{a.title_analysis.strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-green-400/80 text-sm"><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{s}</span></li>)}</ul>
                    </div>
                  )}
                  {a.title_analysis.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase">Geliştirilebilir</p>
                      <ul className="space-y-1">{a.title_analysis.improvements.map((s, i) => <li key={i} className="flex items-start gap-2 text-yellow-400/80 text-sm"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{s}</span></li>)}</ul>
                    </div>
                  )}
                  {a.title_analysis.alternative_titles?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase">Alternatif Başlıklar</p>
                      <div className="space-y-1">{a.title_analysis.alternative_titles.map((t, i) => <div key={i} className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 rounded-lg px-3 py-2"><ArrowRight className="h-3 w-3 shrink-0" />{t}</div>)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* SEO Analysis */}
              {a.seo_analysis && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">SEO Analizi</h3>
                    {a.seo_analysis.score != null && <ScoreBadge score={a.seo_analysis.score} />}
                  </div>
                  {a.seo_analysis.tag_quality && <p className="text-white/60 text-sm">Etiket Kalitesi: <span className="text-white">{a.seo_analysis.tag_quality}</span></p>}
                  {a.seo_analysis.missing_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">{a.seo_analysis.missing_keywords.map((k, i) => <span key={i} className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2.5 py-1">+ {k}</span>)}</div>
                  )}
                  {a.seo_analysis.description_tips?.length > 0 && (
                    <ul className="space-y-1">{a.seo_analysis.description_tips.map((t, i) => <li key={i} className="flex items-start gap-2 text-white/60 text-sm"><Lightbulb className="h-4 w-4 mt-0.5 text-yellow-400 shrink-0" /><span>{t}</span></li>)}</ul>
                  )}
                </div>
              )}

              {/* Engagement Analysis */}
              {a.engagement_analysis && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Etkileşim Analizi</h3>
                  {a.engagement_analysis.quality && <p className="text-white/60 text-sm">Kalite: <span className="text-white font-medium">{a.engagement_analysis.quality}</span></p>}
                  {a.engagement_analysis.like_to_view_assessment && <p className="text-white/60 text-sm">{a.engagement_analysis.like_to_view_assessment}</p>}
                  {a.engagement_analysis.comment_engagement && <p className="text-white/60 text-sm">{a.engagement_analysis.comment_engagement}</p>}
                </div>
              )}

              {/* Content Tips */}
              {a.content_tips?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">İçerik Önerileri</h3>
                  <ol className="space-y-2">{a.content_tips.map((t, i) => <li key={i} className="flex items-start gap-3 text-white/70 text-sm"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xs font-bold shrink-0">{i + 1}</span><span>{t}</span></li>)}</ol>
                </div>
              )}

              {/* Viral Potential */}
              {a.viral_potential && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Viral Potansiyel</h3>
                    {a.viral_potential.score != null && <ScoreBadge score={a.viral_potential.score} />}
                  </div>
                  {a.viral_potential.factors?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase">Faktörler</p>
                      <ul className="space-y-1">{a.viral_potential.factors.map((f, i) => <li key={i} className="flex items-start gap-2 text-green-400/80 text-sm"><Zap className="h-4 w-4 mt-0.5 shrink-0" /><span>{f}</span></li>)}</ul>
                    </div>
                  )}
                  {a.viral_potential.missing_elements?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase">Eksik Unsurlar</p>
                      <ul className="space-y-1">{a.viral_potential.missing_elements.map((f, i) => <li key={i} className="flex items-start gap-2 text-red-400/80 text-sm"><Target className="h-4 w-4 mt-0.5 shrink-0" /><span>{f}</span></li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {/* Similar Video Ideas */}
              {a.similar_video_ideas?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Benzer Video Fikirleri</h3>
                  <div className="grid gap-2 md:grid-cols-2">{a.similar_video_ideas.map((idea, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-white font-medium text-sm">{idea.title}</p>
                      {idea.why && <p className="text-white/40 text-xs mt-1">{idea.why}</p>}
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          {/* Fallback: if analysis is string, use old renderer */}
          {a && typeof a === "string" && <AIResult html={simpleMarkdown(a)} />}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 3: Yorum Analizi
   ══════════════════════════════════════════════════════ */
function CommentsTab() {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState("50");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/comments/analyze", "POST", { url: url, limit: parseInt(limit) });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      // summary is AI JSON with sentiment_distribution, categories, analysis etc.
      setData({ ...res, ...(res.summary || {}), analysis: res.summary?.analysis || res.summary?.summary || (typeof res.summary === "string" ? res.summary : null) });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="İzleyicilerin aslında ne düşünüyor?" subtitle="Yorumları analiz et, duygu dağılımını gör." />
      <div className="flex gap-3 mb-6 flex-wrap">
        <Input placeholder="https://youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} className="bg-[#141414] border-white/10 text-white flex-1 min-w-[200px]" />
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-[120px] bg-[#141414] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 yorum</SelectItem>
            <SelectItem value="50">50 yorum</SelectItem>
            <SelectItem value="100">100 yorum</SelectItem>
            <SelectItem value="200">200 yorum</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analiz Et"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data && (
        <>
          {data.sentiment_distribution && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricCard label="Pozitif" value={`%${data.sentiment_distribution.positive || 0}`} />
              <MetricCard label="Nötr" value={`%${data.sentiment_distribution.neutral || 0}`} />
              <MetricCard label="Negatif" value={`%${data.sentiment_distribution.negative || 0}`} />
            </div>
          )}
          {data.categories && data.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {data.categories.map((c, i) => (
                <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">{c}</Badge>
              ))}
            </div>
          )}
          {data.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 4: Rakip Analizi
   ══════════════════════════════════════════════════════ */
function CompetitorTab() {
  const [myChannel, setMyChannel] = useState("");
  const [competitors, setCompetitors] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const addCompetitor = () => { if (competitors.length < 5) setCompetitors([...competitors, ""]); };
  const removeCompetitor = (i) => { setCompetitors(competitors.filter((_, idx) => idx !== i)); };
  const updateCompetitor = (i, v) => { const c = [...competitors]; c[i] = v; setCompetitors(c); };

  const analyze = async () => {
    if (!myChannel.trim()) return;
    const valid = competitors.filter((c) => c.trim());
    if (valid.length === 0) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/competitor/analyze", "POST", { my_channel: myChannel, competitor_channels: valid });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData({ ...res, analysis: res.ai_analysis || res.analysis });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Rakibinin sırrını çöz." subtitle="Kanalını rakiplerle karşılaştır." />
      <div className="space-y-3 mb-6">
        <Input placeholder="Senin kanal URL'n" value={myChannel} onChange={(e) => setMyChannel(e.target.value)} className="bg-[#141414] border-white/10 text-white" />
        <p className="text-xs text-white/40">Rakip kanallar (max 5)</p>
        {competitors.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder={`Rakip ${i + 1} URL`} value={c} onChange={(e) => updateCompetitor(i, e.target.value)} className="bg-[#141414] border-white/10 text-white flex-1" />
            {competitors.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeCompetitor(i)} className="text-white/40 hover:text-red-400"><X className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
        <div className="flex gap-3">
          {competitors.length < 5 && (
            <Button variant="outline" size="sm" onClick={addCompetitor} className="border-white/10 text-white/60 hover:text-white"><Plus className="h-4 w-4 mr-1" />Rakip Ekle</Button>
          )}
          <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Karşılaştır"}
          </Button>
        </div>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data?.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 5: Kapak AI (Thumbnail)
   ══════════════════════════════════════════════════════ */
function ThumbnailTab() {
  const [mode, setMode] = useState("url"); // url | file
  const [ytUrl, setYtUrl] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    const formData = new FormData();
    if (mode === "file" && file) formData.append("image", file);
    else if (mode === "url" && ytUrl.trim()) formData.append("youtube_url", ytUrl);
    else return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiUpload("/api/youtube-studio/thumbnail/analyze", formData);
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Thumbnail'in tıklanıyor mu?" subtitle="Kapak görselini AI ile analiz et." />
      <div className="flex gap-2 mb-4">
        {["url", "file"].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === m ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-[#141414] text-white/50 hover:text-white border border-white/10"}`}>
            {m === "url" ? "YouTube URL" : "Dosya Yükle"}
          </button>
        ))}
      </div>
      {mode === "url" ? (
        <Input placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} className="bg-[#141414] border-white/10 text-white mb-4" />
      ) : (
        <div className="mb-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 text-white/50 hover:text-white transition-all w-full justify-center">
            <Upload className="h-5 w-5" />
            {file ? file.name : "Görsel seç veya sürükle"}
          </button>
        </div>
      )}
      <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white mb-6">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analiz Et"}
      </Button>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data && (
        <>
          {data.scores && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(data.scores).map(([k, v]) => (
                <MetricCard key={k} label={k.replace(/_/g, " ")} value={typeof v === "number" ? `${v}/10` : v} />
              ))}
            </div>
          )}
          {data.feedback && <AIResult html={simpleMarkdown(data.feedback)} />}
          {data.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 6: Fikir Üretici
   ══════════════════════════════════════════════════════ */
function IdeasTab() {
  const [mode, setMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/ideas/generate", "POST", { mode, topic, count: parseInt(count) });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Bir sonraki viral videon burada." subtitle="AI ile video fikri üret." />
      <div className="flex gap-2 mb-4">
        {[["topic", "Konu"], ["channel", "Kanal"], ["trending", "Trending"]].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === m ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-[#141414] text-white/50 hover:text-white border border-white/10"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-3 mb-6">
        <Input placeholder={mode === "channel" ? "Kanal URL'si" : "Konu veya anahtar kelime"} value={topic} onChange={(e) => setTopic(e.target.value)} className="bg-[#141414] border-white/10 text-white flex-1" />
        <Select value={count} onValueChange={setCount}>
          <SelectTrigger className="w-[100px] bg-[#141414] border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["3", "5", "10"].map((n) => <SelectItem key={n} value={n}>{n} fikir</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Üret"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data?.ideas && (
        <div className="grid gap-3">
          {data.ideas.map((idea, i) => (
            <div key={i} className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-1">{idea.title || idea}</h3>
              {idea.description && <p className="text-white/60 text-sm">{idea.description}</p>}
              {idea.tags && <div className="flex flex-wrap gap-1 mt-2">{idea.tags.map((t, j) => <Badge key={j} variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">{t}</Badge>)}</div>}
            </div>
          ))}
        </div>
      )}
      {data?.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 7: Niş Analizi
   ══════════════════════════════════════════════════════ */
function NicheTab() {
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [interestInput, setInterestInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [timeAvailability, setTimeAvailability] = useState("medium");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const addTag = (list, setList, input, setInput) => {
    const v = input.trim();
    if (v && !list.includes(v)) { setList([...list, v]); setInput(""); }
  };

  const analyze = async () => {
    if (interests.length === 0) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/niche/analyze", "POST", { interests, skills, time_availability: timeAvailability, target_audience: targetAudience });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Senin için en doğru YouTube nişini bul." subtitle="İlgi alanlarını ve becerilerini gir." />
      <div className="space-y-4 mb-6">
        <div>
          <p className="text-xs text-white/40 mb-2">İlgi Alanları</p>
          <div className="flex gap-2 mb-2">
            <Input placeholder="İlgi alanı ekle..." value={interestInput} onChange={(e) => setInterestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(interests, setInterests, interestInput, setInterestInput))} className="bg-[#141414] border-white/10 text-white flex-1" />
            <Button variant="outline" size="sm" onClick={() => addTag(interests, setInterests, interestInput, setInterestInput)} className="border-white/10 text-white/60"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1">{interests.map((t, i) => <Badge key={i} className="bg-purple-500/20 text-purple-300 border-purple-500/30 cursor-pointer" onClick={() => setInterests(interests.filter((_, j) => j !== i))}>{t} ×</Badge>)}</div>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-2">Beceriler</p>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Beceri ekle..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(skills, setSkills, skillInput, setSkillInput))} className="bg-[#141414] border-white/10 text-white flex-1" />
            <Button variant="outline" size="sm" onClick={() => addTag(skills, setSkills, skillInput, setSkillInput)} className="border-white/10 text-white/60"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1">{skills.map((t, i) => <Badge key={i} className="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 cursor-pointer" onClick={() => setSkills(skills.filter((_, j) => j !== i))}>{t} ×</Badge>)}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40 mb-2">Zaman Ayırabilirlik</p>
            <Select value={timeAvailability} onValueChange={setTimeAvailability}>
              <SelectTrigger className="bg-[#141414] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Az (Haftada 1-2 video)</SelectItem>
                <SelectItem value="medium">Orta (Haftada 3-4 video)</SelectItem>
                <SelectItem value="high">Yüksek (Günlük video)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-2">Hedef Kitle</p>
            <Input placeholder="ör: 18-25 yaş, teknoloji meraklıları" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="bg-[#141414] border-white/10 text-white" />
          </div>
        </div>
        <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Niş Analizi Yap"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data?.niches && (
        <div className="grid gap-3 mb-4">
          {data.niches.map((n, i) => (
            <div key={i} className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold">{n.name || n.niche || n}</h3>
              {n.description && <p className="text-white/60 text-sm mt-1">{n.description}</p>}
              {n.score && <Badge className="mt-2 bg-green-500/20 text-green-300">Skor: {n.score}</Badge>}
            </div>
          ))}
        </div>
      )}
      {data?.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 8: Trend Keşfi
   ══════════════════════════════════════════════════════ */
function TrendsTab() {
  const [region, setRegion] = useState("TR");
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState(null);
  const [rising, setRising] = useState(null);
  const [error, setError] = useState(null);

  const fetchTrends = async () => {
    setLoading(true); setError(null);
    try {
      const [t, r] = await Promise.all([
        apiCall(`/api/youtube-studio/trends?region=${region}`, "GET"),
        apiCall(`/api/youtube-studio/trends/rising?region=${region}`, "GET"),
      ]);
      if (t.error) throw new Error(t.error);
      setTrends(t);
      setRising(r);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="Trendleri yakala, geride kalma." subtitle="Bölgeye göre trend videolar ve yükselen konular." />
      <div className="flex gap-3 mb-6">
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-[150px] bg-[#141414] border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[["TR", "Türkiye"], ["US", "ABD"], ["GB", "İngiltere"], ["DE", "Almanya"], ["FR", "Fransa"], ["JP", "Japonya"], ["BR", "Brezilya"], ["IN", "Hindistan"]].map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={fetchTrends} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Keşfet"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {trends?.videos && (
        <>
          <h3 className="text-lg font-semibold text-white mb-3">Trend Videolar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {trends.videos.map((v, i) => (
              <a key={i} href={v.url || `https://youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener noreferrer" className="bg-[#141414] border border-white/10 rounded-xl p-3 hover:border-purple-500/30 transition-colors block">
                {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full rounded-lg mb-2 aspect-video object-cover" />}
                <h4 className="text-white text-sm font-medium line-clamp-2">{v.title}</h4>
                <p className="text-white/40 text-xs mt-1">{v.channel || v.channel_title} • {v.views?.toLocaleString("tr-TR")} görüntülenme</p>
              </a>
            ))}
          </div>
        </>
      )}
      {rising?.topics && (
        <>
          <h3 className="text-lg font-semibold text-white mb-3">Yükselen Konular</h3>
          <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10"><th className="text-left text-white/40 px-4 py-2">Konu</th><th className="text-left text-white/40 px-4 py-2">Büyüme</th></tr></thead>
              <tbody>
                {rising.topics.map((t, i) => (
                  <tr key={i} className="border-b border-white/5"><td className="text-white px-4 py-2">{t.topic || t.title || t}</td><td className="text-green-400 px-4 py-2">{t.growth || t.trend || "↑"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 9: Keyword Trendleri
   ══════════════════════════════════════════════════════ */
function KeywordsTab() {
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!niche.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/keywords/analyze", "POST", { niche, keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="İzleyiciler ne arıyor?" subtitle="Anahtar kelime analizi ve SEO önerileri." />
      <div className="space-y-3 mb-6">
        <Input placeholder="Niş / Konu" value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-[#141414] border-white/10 text-white" />
        <Input placeholder="Anahtar kelimeler (virgülle ayır)" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="bg-[#141414] border-white/10 text-white" />
        <Button onClick={analyze} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analiz Et"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data?.keywords && (
        <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10"><th className="text-left text-white/40 px-4 py-2">Keyword</th><th className="text-left text-white/40 px-4 py-2">Hacim</th><th className="text-left text-white/40 px-4 py-2">Rekabet</th><th className="text-left text-white/40 px-4 py-2">Skor</th></tr></thead>
            <tbody>
              {data.keywords.map((k, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="text-white px-4 py-2">{k.keyword}</td>
                  <td className="text-white/60 px-4 py-2">{k.volume || "—"}</td>
                  <td className="text-white/60 px-4 py-2">{k.competition || "—"}</td>
                  <td className="text-purple-400 px-4 py-2">{k.score || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.long_tail && (
        <div className="mb-4">
          <h3 className="text-white font-semibold mb-2">Long-Tail Öneriler</h3>
          <div className="flex flex-wrap gap-2">{data.long_tail.map((lt, i) => <Badge key={i} className="bg-violet-500/20 text-violet-300">{lt}</Badge>)}</div>
        </div>
      )}
      {data?.seo_tips && <AIResult html={simpleMarkdown(data.seo_tips)} />}
      {data?.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 10: TransFlow
   ══════════════════════════════════════════════════════ */
function TransFlowTab() {
  const [type, setType] = useState("title");
  const [sourceLang, setSourceLang] = useState("tr");
  const [targetLang, setTargetLang] = useState("en");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const LANGS = [["tr", "Türkçe"], ["en", "İngilizce"], ["de", "Almanca"], ["fr", "Fransızca"], ["es", "İspanyolca"], ["ar", "Arapça"], ["ja", "Japonca"], ["ko", "Korece"], ["pt", "Portekizce"], ["ru", "Rusça"], ["zh", "Çince"]];

  const translate = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiCall("/api/youtube-studio/translate", "POST", { type, source_lang: sourceLang, target_lang: targetLang, text });
      if (res.error || res.detail) throw new Error(res.error || res.detail);
      setData(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeading title="İçeriğini dünyaya aç." subtitle="Başlık, açıklama, etiket ve altyazı çevirisi + SEO." />
      <div className="space-y-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[["title", "Başlık"], ["description", "Açıklama"], ["tags", "Etiketler"], ["subtitle", "Altyazı"]].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${type === v ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-[#141414] text-white/50 hover:text-white border border-white/10"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40 mb-2">Kaynak Dil</p>
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className="bg-[#141414] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-2">Hedef Dil</p>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="bg-[#141414] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Textarea placeholder="Çevrilecek metni gir..." value={text} onChange={(e) => setText(e.target.value)} rows={5} className="bg-[#141414] border-white/10 text-white" />
        <Button onClick={translate} disabled={loading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Çevir"}
        </Button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorCard message={error} />}
      {data?.translation && (
        <div className="bg-[#141414] border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-xs text-white/40 mb-2">Çeviri</p>
          <p className="text-white whitespace-pre-wrap">{data.translation}</p>
        </div>
      )}
      {data?.seo_suggestions && <AIResult html={simpleMarkdown(data.seo_suggestions)} />}
      {data?.analysis && <AIResult html={simpleMarkdown(flattenAnalysis(data.analysis))} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 11: Üretici Okulu
   ══════════════════════════════════════════════════════ */
function SchoolTab() {
  const sections = [
    {
      title: "🚀 Sıfırdan YouTube Kanalı Açma",
      content: `**1. Google Hesabı Oluştur**\nYouTube kanalınız Google hesabınıza bağlıdır.\n\n**2. Kanal Adı Seçimi**\n- Akılda kalıcı, kısa, telaffuzu kolay\n- Nişinizle alakalı olsun\n- Gelecekte değişebileceğini unutmayın\n\n**3. Kanal Görselleri**\n- Profil fotoğrafı: 800x800px, yüzünüz veya logonuz\n- Banner: 2560x1440px, markanızı yansıtan\n- Watermark: 150x150px, şeffaf arka plan\n\n**4. Kanal Açıklaması**\n- İlk 2 cümlede ne yaptığınızı anlatın\n- Yükleme programınızı belirtin\n- Sosyal medya linklerinizi ekleyin\n\n**5. İlk Ayarlar**\n- Varsayılan yükleme ayarlarını düzenleyin\n- Anahtar kelimeleri ekleyin\n- Ülke ve dil seçin`,
    },
    {
      title: "🎥 Ekipman Tavsiyeleri (Bütçeye Göre)",
      content: `**Başlangıç (0-500₺)**\n- Telefon kamerası (çoğu modern telefon yeterli)\n- Doğal ışık (pencere önü)\n- Ücretsiz düzenleme: DaVinci Resolve, CapCut\n- Yaka mikrofonu (50-100₺)\n\n**Orta Seviye (500-3000₺)**\n- Webcam: Logitech C920/C922\n- Mikrofon: Blue Yeti / Rode NT-USB Mini\n- Ring Light veya softbox\n- Tripod\n\n**Profesyonel (3000₺+)**\n- Kamera: Sony ZV-1, Canon M50\n- Mikrofon: Rode NT1, Shure SM7B\n- LED Panel ışıklar\n- Yeşil perde\n- Profesyonel düzenleme: Premiere Pro, Final Cut\n\n**Altın Kural:** İçerik > Ekipman. Harika ekipmanla kötü içerik yapmaktansa, telefonla harika içerik yapın.`,
    },
    {
      title: "📋 İlk 10 Video Kuralı",
      content: `**Neden İlk 10 Video Kritik?**\nYouTube algoritması kanalınızı bu videolarla tanır.\n\n**Kurallar:**\n1. Nişinize %100 sadık kalın\n2. Her video 8+ dakika olsun (monetizasyon için)\n3. İlk 30 saniye hook olmalı — "Bu videoda öğreneceksiniz..."\n4. Thumbnail'lere özen gösterin\n5. Başlıkta anahtar kelime olsun\n6. Açıklamaya en az 250 kelime yazın\n7. 3-5 hashtag kullanın\n8. End screen ve kartlar ekleyin\n9. Tutarlı yükleme programı (haftada min 2)\n10. Her videodan sonra analytics'i inceleyin\n\n**Beklenti Yönetimi:**\n- İlk 10 videoda 100 abone normal\n- 50 videoya kadar büyük büyüme beklemeyin\n- Tutarlılık her şeyden önemli`,
    },
    {
      title: "📈 Büyüme Stratejileri",
      content: `**Organik Büyüme:**\n- SEO optimizasyonu (başlık, açıklama, etiketler)\n- Trend konulara hızlı tepki verin\n- Shorts kullanın (keşfet algoritması farklı)\n- Community sekmesini aktif kullanın\n- Diğer YouTuber'larla collab yapın\n\n**İçerik Stratejisi:**\n- %70 evergreen (her zaman geçerli) içerik\n- %20 trend/gündem içerik\n- %10 deneysel içerik\n\n**Algoritma İpuçları:**\n- CTR (tıklanma oranı) %5+ hedefleyin\n- Ortalama izlenme süresi %50+ olmalı\n- İlk 48 saat kritik — tüm sosyal medyada paylaşın\n- Yorumlara cevap verin (engagement artırır)\n- Abone ol + bildirim çanı hatırlatın\n\n**Monetizasyon Yolu:**\n- 1000 abone + 4000 saat izlenme = Partner Programı\n- Sponsorluklar genelde 10K+ abonede başlar\n- Merch, Patreon, digital ürünler alternatif gelir`,
    },
  ];

  return (
    <div>
      <SectionHeading title="Sıfırdan YouTube'a." subtitle="Yeni başlayanlar için kapsamlı rehber." />
      <Accordion type="single" collapsible className="space-y-2">
        {sections.map((s, i) => (
          <AccordionItem key={i} value={`s-${i}`} className="bg-[#141414] border border-white/10 rounded-xl px-4">
            <AccordionTrigger className="text-white font-semibold hover:no-underline py-4">{s.title}</AccordionTrigger>
            <AccordionContent>
              <div className="text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: simpleMarkdown(s.content) }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */

const TAB_COMPONENTS = {
  channel: ChannelTab,
  video: VideoTab,
  comments: CommentsTab,
  competitor: CompetitorTab,
  thumbnail: ThumbnailTab,
  ideas: IdeasTab,
  niche: NicheTab,
  trends: TrendsTab,
  keywords: KeywordsTab,
  transflow: TransFlowTab,
  school: SchoolTab,
};

export default function YouTubeStudioPage() {
  const [activeTab, setActiveTab] = useState("channel");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
            <FaYoutube className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white font-outfit">YouTube Studio</h1>
            <p className="text-white/40 text-sm">Kanalını büyüt, içeriğini optimize et.</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-[#1a1a2e] text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-[#141414]"
                }`}
              >
                <Icon className="h-4 w-4" style={{ width: "1em", height: "1em" }} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl">
        <ActiveComponent />
      </div>
    </div>
  );
}
