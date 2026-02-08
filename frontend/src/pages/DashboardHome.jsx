import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, Heart, Copy, ArrowRight, Twitter, FileText,
  MessageSquare, Quote, BarChart3, Calendar, TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

const typeConfig = {
  tweet: { label: "Tweet", color: "bg-sky-500/15 text-sky-600", icon: Twitter },
  quote: { label: "Alıntı", color: "bg-purple-500/15 text-purple-600", icon: Quote },
  reply: { label: "Yanıt", color: "bg-emerald-500/15 text-emerald-600", icon: MessageSquare },
  article: { label: "Makale", color: "bg-orange-500/15 text-orange-600", icon: FileText },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0, thisWeek: 0 });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [styleProfiles, setStyleProfiles] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, historyRes, stylesRes] = await Promise.allSettled([
          api.get(`${API}/user/stats`),
          api.get(`${API}/generations/history?limit=3`),
          api.get(`${API}/styles/list`),
        ]);
        if (statsRes.status === "fulfilled" && statsRes.value.data) setStats(statsRes.value.data);
        if (historyRes.status === "fulfilled" && historyRes.value.data) setRecentGenerations(Array.isArray(historyRes.value.data) ? historyRes.value.data.slice(0, 3) : (historyRes.value.data.generations || []).slice(0, 3));
        if (stylesRes.status === "fulfilled" && stylesRes.value.data) setStyleProfiles(Array.isArray(stylesRes.value.data) ? stylesRes.value.data : (stylesRes.value.data.styles || []));
      } catch (e) { /* ignore */ }
    };
    load();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  const firstName = user?.name?.split(" ")[0] || "Kullanıcı";

  const statCards = [
    { label: "Toplam Üretim", value: stats.generations, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Tweet", value: stats.tweets, icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Favori", value: stats.favorites, icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Bu Hafta", value: stats.thisWeek || 0, icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-3xl font-bold tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">İçerik üretim panelinize hoş geldiniz</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/dashboard/x-ai")} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2">
            <Sparkles className="h-4 w-4" /> Yeni İçerik Üret
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5 rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", s.bg)}>
                  <Icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-outfit font-bold">{(s.value || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Generations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit text-xl font-semibold">Son Üretimler</h2>
          <Link to="/dashboard/history" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
            Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentGenerations.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {recentGenerations.map((gen, i) => {
              const type = typeConfig[gen.type] || typeConfig.tweet;
              const TypeIcon = type.icon;
              return (
                <Card key={gen.id || i} className="p-5 rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all group">
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
                    {(gen.content || gen.text || "").slice(0, 120)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {gen.created_at ? new Date(gen.created_at).toLocaleDateString("tr-TR") : ""}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(gen.content || gen.text || "")}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-rose-500 transition-colors">
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 rounded-2xl border-border/50 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Henüz içerik üretmediniz</p>
            <Button variant="outline" className="mt-3 rounded-xl" onClick={() => navigate("/dashboard/x-ai")}>
              İlk İçeriğini Üret
            </Button>
          </Card>
        )}
      </section>

      {/* Style Profiles */}
      {styleProfiles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit text-xl font-semibold">Stil Profilleri</h2>
            <Link to="/dashboard/style-lab" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              Style Lab <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {styleProfiles.slice(0, 3).map((profile, i) => (
              <Card key={profile.id || i} className="p-5 rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {(profile.name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile.name || profile.screen_name}</p>
                    <p className="text-[11px] text-muted-foreground">{profile.tweet_count || profile.analyzed_count || 0} tweet analiz edildi</p>
                  </div>
                </div>
                <div className="flex gap-2 text-[11px] text-muted-foreground mb-3">
                  {profile.avg_length && <span>~{profile.avg_length} karakter</span>}
                  {profile.avg_likes && <span>~{profile.avg_likes} beğeni</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                  onClick={() => navigate("/dashboard/x-ai")}
                >
                  Bu Stille Üret
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
