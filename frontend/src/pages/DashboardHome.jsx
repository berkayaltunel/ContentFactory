import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, Heart, Copy, ArrowRight, Twitter, FileText,
  MessageSquare, Quote, Calendar, Search, Lightbulb, Dna,
  BarChart3, TrendingUp, ExternalLink, Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import ContentCalendar from "@/components/dashboard/ContentCalendar";

/* ── Helpers ────────────────────────────────────── */

const typeConfig = {
  tweet: { label: "Tweet", color: "bg-sky-500/15 text-sky-500", border: "from-sky-400 to-blue-500", icon: Twitter },
  quote: { label: "Alıntı", color: "bg-purple-500/15 text-purple-500", border: "from-purple-400 to-pink-500", icon: Quote },
  reply: { label: "Yanıt", color: "bg-emerald-500/15 text-emerald-500", border: "from-emerald-400 to-teal-500", icon: MessageSquare },
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

/* ── AnimatedCounter ────────────────────────────── */

function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
}

/* ── Main Component ─────────────────────────────── */

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0 });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [styleProfiles, setStyleProfiles] = useState([]);
  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, historyRes, stylesRes] = await Promise.allSettled([
          api.get(`${API}/user/stats`),
          api.get(`${API}/generations/history?limit=3`),
          api.get(`${API}/styles/list`),
        ]);
        if (statsRes.status === "fulfilled" && statsRes.value.data) setStats(statsRes.value.data);
        if (historyRes.status === "fulfilled" && historyRes.value.data) {
          const data = historyRes.value.data;
          setRecentGenerations(Array.isArray(data) ? data.slice(0, 3) : (data.generations || []).slice(0, 3));
        }
        if (stylesRes.status === "fulfilled" && stylesRes.value.data) {
          const data = stylesRes.value.data;
          setStyleProfiles(Array.isArray(data) ? data : (data.styles || []));
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

  const inlineStats = [
    { label: "Üretim", value: stats.generations, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Tweet", value: stats.tweets, icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Favori", value: stats.favorites, icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  const getContent = (gen) => {
    if (gen.variants && gen.variants.length > 0 && gen.variants[0].content) {
      return gen.variants[0].content;
    }
    return gen.content || gen.text || "";
  };

  const dailyPrompt = getDailyPrompt();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Greeting Section + Inline Stats ── */}
      <div
        className="relative rounded-3xl p-8 overflow-hidden animate-stagger"
        style={{ "--i": 0 }}
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-indigo-500/10 to-pink-500/10 animate-gradient-shift rounded-3xl" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-outfit text-3xl md:text-4xl font-bold tracking-tight mb-1">
                {getGreetingEmoji()} {getGreeting()}, {firstName}
              </h1>
              <p className="text-muted-foreground">İçerik üretim panelinize hoş geldiniz</p>
            </div>

            {/* Inline stat pills */}
            <div className="flex gap-2 flex-wrap">
              {inlineStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 shadow-sm"
                  >
                    <div className={cn("p-1.5 rounded-lg", s.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", s.color)} />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-outfit font-bold leading-none">
                        <AnimatedCounter value={s.value || 0} />
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTopicSubmit()}
                placeholder="Ne hakkında içerik üretmek istersiniz?"
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <Button
              onClick={handleTopicSubmit}
              className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-medium shimmer-btn"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Üret
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content Calendar ── */}
      <section className="animate-stagger" style={{ "--i": 2 }}>
        <ContentCalendar />
      </section>

      {/* ── Recent Generations ── */}
      <section className="animate-stagger" style={{ "--i": 4 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit text-xl font-semibold">Son Üretimler</h2>
          <Link to="/dashboard/history" className="text-sm text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors">
            Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentGenerations.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {recentGenerations.map((gen, i) => {
              const type = typeConfig[gen.type] || typeConfig.tweet;
              const TypeIcon = type.icon;
              const content = getContent(gen);
              return (
                <Card
                  key={gen.id || i}
                  className="rounded-2xl border-border/50 shadow-sm hover-lift group overflow-hidden animate-stagger"
                  style={{ "--i": i + 5 }}
                >
                  {/* Gradient top border */}
                  <div className={cn("h-[2px] bg-gradient-to-r", type.border)} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={cn("text-[11px] gap-1 rounded-lg", type.color)}>
                        <TypeIcon className="h-3 w-3" /> {type.label}
                      </Badge>
                      {gen.persona && (
                        <Badge variant="outline" className="text-[10px] rounded-lg">{gen.persona}</Badge>
                      )}
                      {gen.tone && (
                        <Badge variant="outline" className="text-[10px] rounded-lg">{gen.tone}</Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-3 mb-4 text-foreground/80">
                      {content.slice(0, 140)}{content.length > 140 ? "..." : ""}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {gen.created_at ? new Date(gen.created_at).toLocaleDateString("tr-TR") : ""}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleCopy(content)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Kopyala"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-rose-500 transition-colors" title="Favori">
                          <Heart className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`, '_blank')}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-sky-500 transition-colors"
                          title="Tweet"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
            <div className="p-12 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-purple-500/60" />
              </div>
              <h3 className="font-outfit font-semibold text-lg mb-1">Henüz içerik üretmediniz</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                İlk içeriğinizi oluşturun ve yaratıcılığınızı keşfedin
              </p>
              <Button
                onClick={() => navigate("/dashboard/x-ai")}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2"
              >
                <Sparkles className="h-4 w-4" /> İlk İçeriğini Üret
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* ── Style Profiles ── */}
      <section className="animate-stagger" style={{ "--i": 8 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit text-xl font-semibold">Stil Profilleri</h2>
          <Link to="/dashboard/style-lab" className="text-sm text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors">
            Style Lab <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {styleProfiles.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {styleProfiles.slice(0, 3).map((profile, i) => {
              const summary = profile.style_summary || {};
              return (
                <Card
                  key={profile.id || i}
                  className="p-5 rounded-2xl border-border/50 shadow-sm hover-lift animate-stagger"
                  style={{ "--i": i + 9 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm animate-ring-pulse">
                        {(profile.name || "S").charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{profile.name || profile.screen_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {summary.tweet_count || profile.tweet_count || profile.analyzed_count || 0} tweet analiz edildi
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[11px] text-muted-foreground mb-4">
                    {(summary.avg_length || profile.avg_length) && (
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" /> ~{summary.avg_length || profile.avg_length} kar.
                      </span>
                    )}
                    {(summary.avg_likes || profile.avg_likes) && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> ~{summary.avg_likes || profile.avg_likes} beğeni
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30 transition-all"
                    onClick={() => navigate("/dashboard/x-ai")}
                  >
                    Bu Stille Üret <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-3">
                <Dna className="h-7 w-7 text-purple-500/60" />
              </div>
              <h3 className="font-outfit font-semibold mb-1">Stil profiliniz yok</h3>
              <p className="text-sm text-muted-foreground mb-4">Style Lab'da bir Twitter hesabı analiz ederek başlayın</p>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/style-lab")}>
                <Dna className="h-4 w-4 mr-2" /> Style Lab'a Git
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* ── Bugünün İlhamı ── */}
      <section className="animate-stagger" style={{ "--i": 12 }}>
        <Card className="rounded-2xl border-border/50 overflow-hidden relative">
          <div className="h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="p-6 md:p-8 relative">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 shrink-0">
                <Lightbulb className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-outfit font-semibold text-lg mb-1">Bugünün İlhamı</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">{dailyPrompt}</p>
                <Button
                  size="sm"
                  onClick={() => navigate(`/dashboard/x-ai?topic=${encodeURIComponent(dailyPrompt)}`)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" /> Bu Konuda Üret
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
