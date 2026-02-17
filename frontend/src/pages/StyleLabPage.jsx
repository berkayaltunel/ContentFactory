import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import {
  Star,
  Plus,
  TrendingUp,
  Heart,
  Repeat2,
  Trash2,
  RefreshCw,
  Loader2,
  Zap,
  Brain,
  Target,
  Wand2,
  Check,
  Copy,
  Fingerprint,
  Dna,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";


// Animated gradient background for cards
function GradientOrb({ className }) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-3xl opacity-20 animate-pulse",
        className
      )}
    />
  );
}

// Avatar with fallback
function Avatar({ url, name, size = 48 }) {
  const [error, setError] = useState(false);
  const initials = (name || "?").charAt(0).toUpperCase();

  if (!url || error) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// Style Profile Card (eski detaylı tasarım + avatar)
function StyleProfileCard({ profile, onDelete, onUse, onRefresh, onViewAnalysis }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh(profile.id);
      toast.success("Stil profili güncellendi! (100 tweet + AI analiz)");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Güncelleme başarısız");
    } finally {
      setRefreshing(false);
    }
  };

  const constraints = profile.constraints || {};
  const algoScore = profile.algo_insights?.avg_score ?? profile.style_fingerprint?.algo_score_avg ?? null;
  const tweetCount = profile.tweet_count ?? profile.style_summary?.tweet_count ?? 0;

  return (
    <Card className="group relative overflow-hidden border-border bg-gradient-to-br from-purple-500/10 via-card to-pink-500/10 hover:border-purple-500/30 transition-all duration-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                url={profile.avatar_url}
                name={profile.twitter_display_name || profile.name}
                size={48}
              />
              {profile.profile_version >= 2 && (
                <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-500 text-white leading-none">v2</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{profile.twitter_display_name || profile.name}</h3>
              {profile.twitter_username && (
                <p className="text-sm text-muted-foreground">@{profile.twitter_username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {tweetCount} tweet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
              title="Stili Yenile (100 tweet + AI analiz)"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(profile.id)}
              className="h-8 w-8 text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Style Summary - 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Tweet</p>
            <p className="font-semibold">{tweetCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Ort. Uzunluk</p>
            <p className="font-semibold">{profile.style_summary?.avg_length || 0} kr</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Algo Skoru</p>
            <p className="font-semibold">{algoScore != null ? Math.round(algoScore) : "—"}</p>
          </div>
        </div>

        {/* Constraint Badges */}
        {Object.keys(constraints).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {constraints.emoji_policy === "BANNED" && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-500/40 text-red-400">emoji yok</Badge>
            )}
            {constraints.hashtag_policy === "BANNED" && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-500/40 text-red-400">hashtag yok</Badge>
            )}
            {constraints.link_policy === "BANNED" && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-orange-500/40 text-orange-400">link yok</Badge>
            )}
            {constraints.line_break_policy === "BANNED" && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-orange-500/40 text-orange-400">tek satır</Badge>
            )}
            {constraints.line_break_policy === "REQUIRED" && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-500/40 text-blue-400">çok satır</Badge>
            )}
          </div>
        )}

        {/* View Analysis Button */}
        <Button
          variant="outline"
          onClick={() => onViewAnalysis(profile.id)}
          className="w-full mb-3 border-purple-500/30 hover:bg-purple-500/10"
        >
          <Brain className="h-4 w-4 mr-2" />
          Detaylı Analizi Gör
        </Button>

        <Button
          onClick={() => onUse(profile)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Bu Stille Üret
        </Button>
      </CardContent>
    </Card>
  );
}

// Detaylı AI Analiz Dialog
function AIAnalysisDialog({ open, onOpenChange, profileData }) {
  const [copied, setCopied] = useState(false);
  
  if (!profileData) return null;

  const fp = profileData.style_fingerprint || {};
  const aiAnalysis = fp.ai_analysis || "";
  const examples = fp.example_tweets || [];
  const stylePrompt = profileData.style_prompt || "";

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(stylePrompt);
    setCopied(true);
    toast.success("Stil prompt kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  // AI analizini bölümlere ayır
  const sections = [];
  if (aiAnalysis) {
    const parts = aiAnalysis.split(/\d+\.\s+\*\*/);
    for (const part of parts) {
      if (!part.trim()) continue;
      const titleEnd = part.indexOf("**");
      if (titleEnd > 0) {
        const title = part.substring(0, titleEnd).replace(/\*\*/g, "").trim();
        const content = part.substring(titleEnd + 2).replace(/^\s*:\s*/, "").trim();
        sections.push({ title, content });
      } else {
        sections.push({ title: "", content: part.trim() });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Stil Analizi: {profileData.name}
          </DialogTitle>
          <DialogDescription>
            {fp.tweet_count || 0} tweet analiz edildi · GPT-4o ile derinlemesine inceleme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 text-center">
              <p className="text-2xl font-bold text-sky-400">{fp.tweet_count || 0}</p>
              <p className="text-xs text-muted-foreground">Tweet</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/20 text-center">
              <p className="text-2xl font-bold text-pink-400">{fp.avg_length || 0}</p>
              <p className="text-xs text-muted-foreground">Ort. Karakter</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
              <p className="text-2xl font-bold text-green-400">{fp.avg_engagement?.likes?.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Ort. Beğeni</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 text-center">
              <p className="text-2xl font-bold text-purple-400">{fp.emoji_usage?.toFixed(1) || 0}</p>
              <p className="text-xs text-muted-foreground">Emoji/Tweet</p>
            </div>
          </div>

          {/* Length & Tone Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                Uzunluk Dağılımı
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Kısa (&lt;100)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${fp.length_distribution?.short || 0}%` }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{fp.length_distribution?.short || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Orta (100-200)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${fp.length_distribution?.medium || 0}%` }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{fp.length_distribution?.medium || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uzun (200+)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-pink-400 rounded-full" style={{ width: `${fp.length_distribution?.long || 0}%` }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{fp.length_distribution?.long || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Kullanım Oranları
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Soru (?) kullanımı</span>
                  <span className="text-sm font-medium">{fp.question_ratio || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ünlem (!) kullanımı</span>
                  <span className="text-sm font-medium">{fp.exclamation_ratio || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Link paylaşımı</span>
                  <span className="text-sm font-medium">{fp.link_usage || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hashtag/tweet</span>
                  <span className="text-sm font-medium">{fp.hashtag_usage || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Sections */}
          {sections.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                AI Derinlemesine Analiz
              </h4>
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
                    {section.title && (
                      <h5 className="font-medium text-purple-300 mb-2">{section.title}</h5>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eğer AI analizi yoksa basit prompt göster */}
          {sections.length === 0 && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-purple-400" />
                Stil Parmak İzi
              </h4>
              <p className="text-sm text-muted-foreground">
                Henüz AI analizi yapılmadı. "Stili Yenile" butonuna tıklayarak detaylı AI analizi başlatabilirsiniz.
              </p>
            </div>
          )}

          {/* Top Tweets */}
          {examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                En İyi Tweet'ler
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {examples.slice(0, 5).map((tweet, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-sm">{tweet.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {tweet.likes}</span>
                      <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" /> {tweet.retweets}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yasaklı Kalıplar */}
          {fp.banned_patterns?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                🚫 Asla Yapmaz
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {fp.banned_patterns.map((pattern, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-300">
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viral Pattern Analizi */}
          {profileData.viral_patterns && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                🔥 Ne Zaman Viral Oluyor?
              </h4>
              {profileData.viral_patterns.viral_avg_length && profileData.viral_patterns.flop_avg_length && (
                <div className="flex gap-3 mb-2">
                  <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-lg font-bold text-green-400">{Math.round(profileData.viral_patterns.viral_avg_length)}</p>
                    <p className="text-xs text-muted-foreground">Viral ort. uzunluk</p>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-lg font-bold text-red-400">{Math.round(profileData.viral_patterns.flop_avg_length)}</p>
                    <p className="text-xs text-muted-foreground">Flop ort. uzunluk</p>
                  </div>
                </div>
              )}
              {profileData.viral_patterns.insights?.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {profileData.viral_patterns.insights.map((insight, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 text-sm text-green-300">
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Açılış & Kapanış Stratejisi */}
          {(fp.opening_psychology || fp.closing_strategy) && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                Açılış & Kapanış
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {fp.opening_psychology && (
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Nasıl Açıyor?</p>
                    <p className="text-sm font-medium mb-3">{fp.opening_psychology.dominant_pattern || "—"}</p>
                    {fp.opening_psychology.distribution && (
                      <div className="space-y-1.5">
                        {Object.entries(fp.opening_psychology.distribution).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground w-20 truncate">{key}</span>
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${val}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-8 text-right">{val}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {fp.closing_strategy && (
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Nasıl Kapıyor?</p>
                    <p className="text-sm font-medium mb-3">{fp.closing_strategy.dominant || "—"}</p>
                    {fp.closing_strategy.distribution && (
                      <div className="space-y-1.5">
                        {Object.entries(fp.closing_strategy.distribution).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground w-20 truncate">{key}</span>
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${val}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-8 text-right">{val}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Yazım Kuralları */}
          {profileData.constraints && Object.keys(profileData.constraints).length > 0 && (() => {
            const c = profileData.constraints;
            const rules = [];
            if (c.emoji_policy === "BANNED") rules.push({ label: "Emoji", status: "banned" });
            else if (c.emoji_policy === "REQUIRED") rules.push({ label: "Emoji", status: "required" });
            if (c.hashtag_policy === "BANNED") rules.push({ label: "Hashtag", status: "banned" });
            else if (c.hashtag_policy === "REQUIRED") rules.push({ label: "Hashtag", status: "required" });
            if (c.link_policy === "BANNED") rules.push({ label: "Link", status: "banned" });
            if (c.line_break_policy === "BANNED") rules.push({ label: "Tek satır yazıyor", status: "required" });
            else if (c.line_break_policy === "REQUIRED") rules.push({ label: "Çok satırlı yazıyor", status: "required" });
            if (c.min_length) rules.push({ label: `En az ${c.min_length} karakter`, status: "required" });
            if (c.max_length) rules.push({ label: `En fazla ${c.max_length} karakter`, status: "required" });
            if (rules.length === 0) return null;
            return (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">⚙️ Yazım Kuralları</h4>
                <div className="grid grid-cols-2 gap-2">
                  {rules.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-sm">
                      {r.status === "banned" ? (
                        <span className="text-red-400 text-xs">✕</span>
                      ) : (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                      <span className="text-muted-foreground">{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Style Prompt */}
          {stylePrompt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-pink-400" />
                  Stil Prompt (AI Üretimde Kullanılan)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="h-8 text-xs"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {stylePrompt}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Profile Dialog (direkt @username ile profil oluştur)
function AddProfileDialog({ open, onOpenChange, onAdd }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleAdd = async () => {
    const handle = username.trim().replace("@", "");
    if (!handle) {
      toast.error("Kullanıcı adı girin");
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatus("Kullanıcı aranıyor...");

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p < 30) return p + 5;
        if (p < 60) return p + 3;
        if (p < 85) return p + 1;
        return p;
      });
    }, 800);

    const statusTimer = setTimeout(() => setStatus("Tweetler çekiliyor..."), 3000);
    const statusTimer2 = setTimeout(() => setStatus("Stil analizi yapılıyor..."), 8000);
    const statusTimer3 = setTimeout(() => setStatus("Profil oluşturuluyor..."), 14000);

    try {
      const response = await api.post(`${API}/styles/create-from-handle`, {
        twitter_username: handle,
      });
      setProgress(100);
      setStatus("Tamamlandı!");
      await onAdd(response.data);
      toast.success(`@${handle} stil profili oluşturuldu!`);
      setUsername("");
      onOpenChange(false);
    } catch (error) {
      const detail = error.response?.data?.detail || "Profil oluşturulamadı";
      toast.error(detail);
    } finally {
      clearInterval(progressTimer);
      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      clearTimeout(statusTimer3);
      setLoading(false);
      setProgress(0);
      setStatus("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaXTwitter className="h-5 w-5" />
            Stil Profili Ekle
          </DialogTitle>
          <DialogDescription>
            Stilini klonlamak istediğin Twitter hesabının kullanıcı adını gir.
            Tweetleri analiz edilip stil profili oluşturulacak.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                placeholder="kullanici_adi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-8"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={loading || !username.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground/50 px-0.5">
                <span className={progress >= 10 ? "text-muted-foreground" : ""}>Tweet</span>
                <span className={progress >= 30 ? "text-muted-foreground" : ""}>Analiz</span>
                <span className={progress >= 60 ? "text-muted-foreground" : ""}>Embedding</span>
                <span className={progress >= 85 ? "text-muted-foreground" : ""}>Profil</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Page
export default function StyleLabPage() {
  const navigate = useNavigate();
  const { setActiveProfile } = useProfile();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${API}/styles/list`);
      setProfiles(response.data || []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = async (profileData) => {
    setProfiles([profileData, ...profiles]);
  };

  const handleDeleteProfile = async (profileId) => {
    await api.delete(`${API}/styles/${profileId}`);
    setProfiles(profiles.filter((p) => p.id !== profileId));
    toast.success("Profil silindi");
  };

  const handleRefreshProfile = async (profileId) => {
    const response = await api.post(`${API}/styles/${profileId}/refresh`);
    const profilesRes = await api.get(`${API}/styles/list`);
    setProfiles(profilesRes.data || []);
    return response.data;
  };

  const handleViewAnalysis = async (profileId) => {
    try {
      const [profileRes, promptRes] = await Promise.all([
        api.get(`${API}/styles/${profileId}`),
        api.get(`${API}/styles/${profileId}/prompt`),
      ]);
      setSelectedProfileData({
        ...profileRes.data,
        style_prompt: promptRes.data.style_prompt,
      });
      setAiAnalysisOpen(true);
    } catch (error) {
      toast.error("Analiz yüklenemedi");
    }
  };

  const handleUseProfile = async (profile) => {
    // ProfileContext'teki aktif profili de güncelle
    if (setActiveProfile) {
      await setActiveProfile(profile.id);
    }
    navigate(`/dashboard/create?platform=x&style=${profile.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl" data-testid="style-lab-page">
      {/* Hero Header */}
      <div className="relative mb-12 p-8 rounded-3xl bg-gradient-to-br from-purple-500/10 via-card to-pink-500/10 border border-purple-500/20 overflow-hidden">
        <GradientOrb className="w-64 h-64 bg-purple-500 -top-32 -left-32" />
        <GradientOrb className="w-64 h-64 bg-pink-500 -bottom-32 -right-32" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Dna className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-outfit text-4xl font-bold tracking-tight">Style Lab</h1>
              <p className="text-muted-foreground">Twitter stillerini öğren, klonla, üret</p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            Beğendiğin Twitter hesaplarının yazım stilini AI ile analiz et. 
            Onların tarzında viral içerikler üret.
          </p>

          <Button
            onClick={() => setAddDialogOpen(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Stil Profili Ekle
          </Button>
        </div>
      </div>

      {/* Style Profiles */}
      {profiles.length > 0 ? (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-outfit text-2xl font-bold flex items-center gap-2">
              <Fingerprint className="h-6 w-6 text-purple-400" />
              Stil Profilleri
            </h2>
            <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Profil Ekle
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <StyleProfileCard
                key={profile.id}
                profile={profile}
                onDelete={handleDeleteProfile}
                onUse={handleUseProfile}
                onRefresh={handleRefreshProfile}
                onViewAnalysis={handleViewAnalysis}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed border-2 border-border bg-card/50">
          <CardContent className="py-16 text-center">
            <Fingerprint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">Henüz stil profili yok</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Beğendiğin bir Twitter hesabının yazım stilini analiz edip
              kendi içeriklerinde kullanabilirsin.
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              İlk Stil Profilini Ekle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Profile Dialog */}
      <AddProfileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddProfile}
      />

      {/* AI Analysis Dialog */}
      <AIAnalysisDialog
        open={aiAnalysisOpen}
        onOpenChange={setAiAnalysisOpen}
        profileData={selectedProfileData}
      />
    </div>
  );
}
