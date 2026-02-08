import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, Heart, Copy, ArrowRight, Twitter, FileText,
  MessageSquare, Quote, Calendar, Search, Lightbulb, Dna,
  BarChart3, TrendingUp, ExternalLink, Zap, Flame, Eye,
  ChevronRight, Cpu, Clock, Star, Target, Rocket,
} from "lucide-react";
import { FaXTwitter, FaYoutube, FaInstagram, FaTiktok, FaLinkedinIn } from "react-icons/fa6";
import { HiDocumentText } from "react-icons/hi2";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import ContentCalendar from "@/components/dashboard/ContentCalendar";

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

const typeConfig = {
  tweet:   { label: "Tweet",  color: "bg-sky-500/15 text-sky-500",     border: "from-sky-400 to-blue-500",    icon: Twitter },
  quote:   { label: "Alıntı", color: "bg-purple-500/15 text-purple-500", border: "from-purple-400 to-pink-500", icon: Quote },
  reply:   { label: "Yanıt",  color: "bg-emerald-500/15 text-emerald-500", border: "from-emerald-400 to-teal-500", icon: MessageSquare },
  article: { label: "Makale", color: "bg-orange-500/15 text-orange-500", border: "from-orange-400 to-amber-500", icon: FileText },
};

function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h < 6) return "🌙";
  if (h < 12) return "🌅";
  if (h < 18) return "🌞";
  return "🌆";
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

const dailyPrompts = [
  "Bugün takipçilerinle kişisel bir hikaye paylaşmaya ne dersin?",
  "Sektörünüzdeki en büyük yanılgıyı çürütün",
  "Bir yıl önce bilmeyi istediğiniz 3 şeyi paylaşın",
  "Bugünkü trend konulara bakıp viral bir bakış açısı yakalayın",
  "En son okuduğunuz kitaptan bir ders paylaşın",
  "Kariyerinizde aldığınız en iyi tavsiyeyi tweetleyin",
  "Takipçilerinize cesaret verici bir mesaj yazın",
  "Sektörünüzde herkesin bilmesi gereken 5 araç paylaşın",
  "Başarısızlıklarınızdan öğrendiğiniz en değerli dersi anlatın",
  "Bu hafta sizi heyecanlandıran bir gelişmeyi paylaşın",
  "Unpopular opinion: Sektörünüzde farklı düşündüğünüz bir konu",
  "Takipçilerinize bir soru sorun — etkileşim patlaması yaratın",
];

function getDailyPrompt() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyPrompts.length;
  return dailyPrompts[dayIndex];
}

/* ═══════════════════════════════════════════════════
   ANIMATED COUNTER (with pulse on finish)
   ═══════════════════════════════════════════════════ */

function AnimatedCounter({ value, duration = 900, className = "" }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    setDone(false);
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className={cn(done && "animate-count-pulse", className)}>
      {display.toLocaleString()}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   MINI WEEKLY BARS (CSS-only bar chart)
   ═══════════════════════════════════════════════════ */

function WeeklyBars({ data = [] }) {
  // data: array of 7 numbers (Mon-Sun generation counts)
  const max = Math.max(...data, 1);
  const days = ["P", "S", "Ç", "P", "C", "C", "P"];

  return (
    <div className="flex items-end gap-1.5 h-16">
      {days.map((d, i) => {
        const h = data[i] ? (data[i] / max) * 100 : 8;
        const isToday = i === ((new Date().getDay() + 6) % 7);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full relative rounded-t-sm overflow-hidden" style={{ height: "48px" }}>
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-sm bar-animate",
                  isToday
                    ? "bg-gradient-to-t from-purple-600 to-purple-400"
                    : data[i] > 0
                      ? "bg-gradient-to-t from-purple-500/40 to-purple-400/30"
                      : "bg-muted/30"
                )}
                style={{ height: `${h}%`, "--bar-i": i }}
              />
            </div>
            <span className={cn(
              "text-[9px] font-medium",
              isToday ? "text-purple-500" : "text-muted-foreground/60"
            )}>
              {d}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TOOL CARD
   ═══════════════════════════════════════════════════ */

function ToolCard({ icon: Icon, label, desc, path, gradient, delay }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="tool-card relative overflow-hidden group flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 border border-border/40 hover:border-purple-500/20 transition-all duration-300 text-left"
      style={{ "--bento-i": delay }}
    >
      <div className={cn(
        "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
        gradient
      )}>
        <Icon className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate group-hover:text-purple-500 transition-colors">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-purple-500/60 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   PLATFORM SHORTCUT
   ═══════════════════════════════════════════════════ */

function PlatformPill({ icon: Icon, label, path, color }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 transition-all duration-200"
    >
      <Icon className={cn("h-3.5 w-3.5 transition-colors", color)} />
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0 });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [styleProfiles, setStyleProfiles] = useState([]);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, historyRes, stylesRes, calRes] = await Promise.allSettled([
          api.get(`${API}/user/stats`),
          api.get(`${API}/generations/history?limit=5`),
          api.get(`${API}/styles/list`),
          api.get(`${API}/generations/calendar?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
        ]);
        if (statsRes.status === "fulfilled" && statsRes.value.data) setStats(statsRes.value.data);
        if (historyRes.status === "fulfilled" && historyRes.value.data) {
          const data = historyRes.value.data;
          setRecentGenerations(Array.isArray(data) ? data.slice(0, 5) : (data.generations || []).slice(0, 5));
        }
        if (stylesRes.status === "fulfilled" && stylesRes.value.data) {
          const data = stylesRes.value.data;
          setStyleProfiles(Array.isArray(data) ? data : (data.styles || []));
        }
        // Build weekly data from calendar
        if (calRes.status === "fulfilled" && calRes.value.data?.days) {
          const days = calRes.value.data.days;
          const now = new Date();
          const weekly = [0, 0, 0, 0, 0, 0, 0];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().split("T")[0];
            if (days[key]) weekly[i] = days[key].count || 0;
          }
          setWeeklyData(weekly);
        }
      } catch (e) { /* ignore */ }
    };
    load();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  const handleTopicSubmit = () => {
    if (topicInput.trim()) {
      navigate(`/dashboard/x-ai?topic=${encodeURIComponent(topicInput.trim())}`);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Kullanıcı";
  const dailyPrompt = getDailyPrompt();
  const streak = weeklyData.reduceRight((acc, v) => (v > 0 && acc.active ? { count: acc.count + 1, active: true } : { ...acc, active: false }), { count: 0, active: true }).count;
  const weekTotal = weeklyData.reduce((a, b) => a + b, 0);
  const activeProfile = styleProfiles[0];

  const getContent = (gen) => {
    if (gen.variants?.length > 0 && gen.variants[0].content) return gen.variants[0].content;
    return gen.content || gen.text || "";
  };

  /* Tools & platforms */
  const tools = [
    { icon: Dna,         label: "Style Lab",      desc: "Yazım stilini analiz et",    path: "/dashboard/style-lab",        gradient: "from-purple-500 to-indigo-600" },
    { icon: TrendingUp,  label: "Trendler",       desc: "Güncel trendleri keşfet",    path: "/dashboard/trends",           gradient: "from-emerald-500 to-teal-600" },
    { icon: BarChart3,   label: "Hesap Analizi",  desc: "Hesabını analiz et",         path: "/dashboard/account-analysis", gradient: "from-sky-500 to-blue-600" },
    { icon: Sparkles,    label: "AI Coach",       desc: "AI koçunla konuş",           path: "/dashboard/coach",            gradient: "from-amber-500 to-orange-600" },
  ];

  const platforms = [
    { icon: FaXTwitter,   label: "X",         path: "/dashboard/x-ai",      color: "group-hover:text-foreground" },
    { icon: FaYoutube,    label: "YouTube",    path: "/dashboard/youtube",   color: "group-hover:text-red-500" },
    { icon: FaInstagram,  label: "Instagram",  path: "/dashboard/instaflow", color: "group-hover:text-pink-500" },
    { icon: FaTiktok,     label: "TikTok",     path: "/dashboard/tiktrend",  color: "group-hover:text-foreground" },
    { icon: FaLinkedinIn, label: "LinkedIn",   path: "/dashboard/linkshare", color: "group-hover:text-blue-600" },
    { icon: HiDocumentText, label: "Blog",     path: "/dashboard/blog",      color: "group-hover:text-orange-500" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-1">

      {/* ═══════════════════════════════════════════
          BENTO GRID
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">

        {/* ─── 1. GREETING + SEARCH (2 col) ─── */}
        <div
          className="bento-card relative md:col-span-2 rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 0 }}
        >
          {/* Decorative orbs */}
          <div className="bento-orb w-32 h-32 bg-purple-500/15 top-[-20px] right-[-20px]" />
          <div className="bento-orb w-24 h-24 bg-indigo-500/10 bottom-[-10px] left-[-10px]" style={{ animationDelay: "2s" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getGreetingEmoji()}</span>
              <h1 className="font-outfit text-2xl md:text-3xl font-bold tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mb-5">
              Bugün ne üretmek istersin?
            </p>

            <div className="flex gap-2.5">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTopicSubmit()}
                  placeholder="Konu yaz, AI üretsin..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-background/80 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              <Button
                onClick={handleTopicSubmit}
                className="h-11 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shimmer-btn"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> Üret
              </Button>
            </div>
          </div>
        </div>

        {/* ─── 2. TOTAL GENERATIONS (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 1 }}
        >
          <div className="bento-orb w-20 h-20 bg-purple-500/10 top-[-10px] right-[-10px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <Badge className="text-[10px] bg-purple-500/10 text-purple-500 border-0 rounded-lg">
                Bu ay
              </Badge>
            </div>
            <p className="font-outfit text-3xl font-bold tracking-tight mb-0.5">
              <AnimatedCounter value={stats.generations || 0} />
            </p>
            <p className="text-xs text-muted-foreground">Toplam Üretim</p>
          </div>
        </div>

        {/* ─── 3. FAVORITES (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 2 }}
        >
          <div className="bento-orb w-20 h-20 bg-rose-500/10 top-[-10px] right-[-10px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500/15 to-pink-500/15 flex items-center justify-center">
                <Heart className="h-5 w-5 text-rose-500" />
              </div>
              <Badge className="text-[10px] bg-rose-500/10 text-rose-500 border-0 rounded-lg">
                Koleksiyon
              </Badge>
            </div>
            <p className="font-outfit text-3xl font-bold tracking-tight mb-0.5">
              <AnimatedCounter value={stats.favorites || 0} />
            </p>
            <p className="text-xs text-muted-foreground">Favori İçerik</p>
          </div>
        </div>

        {/* ─── 4. CONTENT CALENDAR (2 col, 2 row) ─── */}
        <div
          className="bento-card relative md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 3 }}
        >
          <div className="h-full">
            <ContentCalendar />
          </div>
        </div>

        {/* ─── 5. STREAK & WEEKLY (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 4 }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className={cn(
                  "h-5 w-5",
                  streak > 0 ? "text-orange-500 animate-streak-fire" : "text-muted-foreground/40"
                )} />
                <span className="text-sm font-semibold">Streak</span>
              </div>
              <span className="font-outfit text-2xl font-bold">
                {streak > 0 ? (
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">{streak}</span>
                ) : (
                  <span className="text-muted-foreground/40">0</span>
                )}
              </span>
            </div>

            <div className="mt-1 mb-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>Bu hafta</span>
                <span className="font-medium">{weekTotal} üretim</span>
              </div>
              <WeeklyBars data={weeklyData} />
            </div>
          </div>
        </div>

        {/* ─── 6. STYLE PROFILE (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 5 }}
        >
          <div className="bento-orb w-20 h-20 bg-indigo-500/10 bottom-[-10px] right-[-10px]" style={{ animationDelay: "1s" }} />
          <div className="relative z-10">
            {activeProfile ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm animate-ring-pulse">
                      {(activeProfile.name || "S").charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{activeProfile.name || activeProfile.screen_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {activeProfile.style_summary?.tweet_count || activeProfile.tweet_count || 0} tweet analiz edildi
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/dashboard/x-ai")}
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-medium"
                >
                  Bu Stille Üret <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/15 to-indigo-500/15 flex items-center justify-center mb-2">
                  <Dna className="h-5 w-5 text-purple-500/50 animate-float" />
                </div>
                <p className="text-xs text-muted-foreground mb-3">Henüz stil profili yok</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/dashboard/style-lab")}
                  className="w-full h-8 rounded-xl text-xs"
                >
                  Style Lab <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── 7. RECENT GENERATION PREVIEW (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-5 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 6 }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Son Üretim</span>
              <Link to="/dashboard/history" className="text-[10px] text-purple-500 hover:text-purple-400 flex items-center gap-0.5 transition-colors">
                Tümü <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentGenerations.length > 0 ? (
              <div className="space-y-2.5">
                {recentGenerations.slice(0, 3).map((gen, i) => {
                  const type = typeConfig[gen.type] || typeConfig.tweet;
                  const content = getContent(gen);
                  return (
                    <button
                      key={gen.id || i}
                      onClick={() => handleCopy(content)}
                      className="group w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div className={cn("shrink-0 mt-0.5 h-2 w-2 rounded-full", type.color.split(" ")[0])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed line-clamp-2 text-foreground/80">
                          {content.slice(0, 80)}{content.length > 80 ? "..." : ""}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                          {gen.created_at ? new Date(gen.created_at).toLocaleDateString("tr-TR") : ""}
                        </p>
                      </div>
                      <Copy className="shrink-0 h-3 w-3 text-muted-foreground/30 group-hover:text-purple-500 transition-colors mt-1" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Sparkles className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/60">Henüz üretim yok</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── 8. BUGÜNÜN İLHAMI (1 col) ─── */}
        <div
          className="bento-card relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.05] border border-amber-500/10"
          style={{ "--bento-i": 7 }}
        >
          <div className="bento-orb w-24 h-24 bg-amber-500/10 top-[-15px] left-[-15px]" style={{ animationDelay: "3s" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Lightbulb className="h-4.5 w-4.5 text-amber-500" style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-sm font-semibold">Bugünün İlhamı</span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed mb-4 line-clamp-3">
              {dailyPrompt}
            </p>
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard/x-ai?topic=${encodeURIComponent(dailyPrompt)}`)}
              className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Bu Konuda Üret
            </Button>
          </div>
        </div>

        {/* ─── 9. ARAÇLAR & PLATFORMLAR (full width) ─── */}
        <div
          className="bento-card relative md:col-span-4 rounded-3xl p-6 overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40"
          style={{ "--bento-i": 8 }}
        >
          <div className="bento-orb w-40 h-40 bg-purple-500/5 bottom-[-30px] right-[-30px]" />
          <div className="relative z-10">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 flex items-center justify-center">
                <Rocket className="h-4.5 w-4.5 text-purple-500" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Araçlar & Platformlar</h3>
                <p className="text-[11px] text-muted-foreground">Tüm güçlü araçların tek bakışta</p>
              </div>
            </div>

            {/* Tools grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {tools.map((t, i) => (
                <ToolCard key={t.label} {...t} delay={9 + i} />
              ))}
            </div>

            {/* Platform pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground/60 mr-1">Platformlar:</span>
              {platforms.map((p) => (
                <PlatformPill key={p.label} {...p} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
