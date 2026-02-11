import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Twitter,
  TrendingUp,
  Heart,
  MessageCircle,
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
  ExternalLink,
  ChevronRight,
  Fingerprint,
  Dna,
} from "lucide-react";
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

// Source card with tweet preview
function SourceCard({ source, onDelete, onRefresh, onAnalyze }) {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTweets();
  }, [source.id]);

  const fetchTweets = async () => {
    try {
      const response = await api.get(`${API}/sources/${source.id}/tweets?limit=5`);
      setTweets(response.data || []);
    } catch (error) {
      console.error("Failed to fetch tweets:", error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh(source.id);
      await fetchTweets();
      toast.success("Tweet'ler güncellendi!");
    } catch (error) {
      toast.error("Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-500">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {source.twitter_display_name?.charAt(0) || source.twitter_username?.charAt(0) || "?"}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center">
                <Twitter className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{source.twitter_display_name || source.twitter_username}</h3>
              <p className="text-sm text-muted-foreground">@{source.twitter_username}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(source.id)}
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {source.tweet_count} tweet
          </Badge>
          {source.last_scraped_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(source.last_scraped_at).toLocaleDateString("tr-TR")} tarihinde çekildi
            </span>
          )}
        </div>

        {/* Tweet Preview */}
        <div className="space-y-2">
          {tweets.slice(0, expanded ? 5 : 2).map((tweet, idx) => (
            <div
              key={tweet.id || idx}
              className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-sm"
            >
              <p className="line-clamp-2 text-muted-foreground">{tweet.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {tweet.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Repeat2 className="h-3 w-3" /> {tweet.retweets}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {tweet.replies}
                </span>
              </div>
            </div>
          ))}
        </div>

        {tweets.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 text-muted-foreground"
          >
            {expanded ? "Daha az göster" : `+${tweets.length - 2} tweet daha`}
            <ChevronRight className={cn("h-4 w-4 ml-1 transition-transform", expanded && "rotate-90")} />
          </Button>
        )}

        {/* Analyze Button */}
        <Button
          onClick={() => onAnalyze(source)}
          className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Brain className="h-4 w-4 mr-2" />
          Stil Analizi Yap
        </Button>
      </CardContent>
    </Card>
  );
}

// Style Profile Card
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

  return (
    <Card className="group relative overflow-hidden border-border bg-gradient-to-br from-purple-500/10 via-card to-pink-500/10 hover:border-purple-500/30 transition-all duration-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Dna className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">
                {profile.source_ids?.length || 0} kaynak · {profile.style_summary?.tweet_count || 0} tweet
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

        {/* Style Summary */}
        {profile.style_summary && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Ort. Uzunluk</p>
              <p className="font-semibold">{profile.style_summary.avg_length} karakter</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Ort. Beğeni</p>
              <p className="font-semibold">{profile.style_summary.avg_likes?.toFixed(0) || 0}</p>
            </div>
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
                <Sparkles className="h-5 w-5 text-yellow-400" />
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

// Add Source Dialog
function AddSourceDialog({ open, onOpenChange, onAdd }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAdd = async () => {
    if (!username.trim()) {
      toast.error("Kullanıcı adı girin");
      return;
    }

    setLoading(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      await onAdd(username.trim().replace("@", ""));
      setProgress(100);
      toast.success(`@${username} eklendi!`);
      setUsername("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eklenemedi");
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-sky-400" />
            Twitter Hesabı Ekle
          </DialogTitle>
          <DialogDescription>
            Stil öğrenmek istediğiniz Twitter hesabının kullanıcı adını girin.
            Son 50 tweet çekilecek.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                placeholder="kullanici_adi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-8"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={loading || !username.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tweet'ler çekiliyor...</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Analysis Result Dialog
function AnalysisDialog({ open, onOpenChange, source, analysis, onCreateProfile }) {
  const [profileName, setProfileName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (source) {
      setProfileName(`${source.twitter_display_name || source.twitter_username} Style`);
    }
  }, [source]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateProfile(profileName, [source.id]);
      toast.success("Stil profili oluşturuldu!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Profil oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  if (!analysis) return null;

  const fp = analysis.fingerprint || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-purple-400" />
            Stil Analizi: @{source?.twitter_username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 text-center">
              <p className="text-3xl font-bold text-sky-400">{fp.avg_length || 0}</p>
              <p className="text-sm text-muted-foreground">Ort. Karakter</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/20 text-center">
              <p className="text-3xl font-bold text-pink-400">{fp.avg_engagement?.likes?.toFixed(0) || 0}</p>
              <p className="text-sm text-muted-foreground">Ort. Beğeni</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 text-center">
              <p className="text-3xl font-bold text-purple-400">{fp.emoji_usage?.toFixed(1) || 0}</p>
              <p className="text-sm text-muted-foreground">Emoji/Tweet</p>
            </div>
          </div>

          {/* Length Distribution */}
          <div className="space-y-2">
            <h4 className="font-medium">Uzunluk Dağılımı</h4>
            <div className="flex gap-2">
              <div className="flex-1 p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-lg font-semibold">{fp.length_distribution?.short || 0}%</p>
                <p className="text-xs text-muted-foreground">Kısa</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-lg font-semibold">{fp.length_distribution?.medium || 0}%</p>
                <p className="text-xs text-muted-foreground">Orta</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-lg font-semibold">{fp.length_distribution?.long || 0}%</p>
                <p className="text-xs text-muted-foreground">Uzun</p>
              </div>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <h4 className="font-medium">Ton Analizi</h4>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1">
                Casual: {fp.tone_markers?.casual || 0}%
              </Badge>
              <Badge variant="secondary" className="gap-1">
                Formal: {fp.tone_markers?.formal || 0}%
              </Badge>
              <Badge variant="secondary" className="gap-1">
                Provocative: {fp.tone_markers?.provocative || 0}%
              </Badge>
            </div>
          </div>

          {/* Structure */}
          <div className="space-y-2">
            <h4 className="font-medium">Yapı</h4>
            <div className="flex gap-2">
              <Badge variant="outline">{fp.structure?.single || 0}% Tek Tweet</Badge>
              <Badge variant="outline">{fp.structure?.thread || 0}% Thread</Badge>
              <Badge variant="outline">{fp.structure?.list || 0}% Liste</Badge>
            </div>
          </div>

          {/* Example Tweets */}
          {fp.example_tweets?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">En İyi Tweet'ler</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fp.example_tweets.slice(0, 3).map((tweet, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-sm line-clamp-2">{tweet.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" /> {tweet.likes}
                      <Repeat2 className="h-3 w-3 ml-2" /> {tweet.retweets}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style Prompt Preview */}
          <div className="space-y-2">
            <h4 className="font-medium">Üretilecek Stil Prompt</h4>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
              {analysis.style_prompt}
            </div>
          </div>

          {/* Create Profile */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Input
              placeholder="Profil adı"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !profileName.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Dna className="h-4 w-4 mr-2" />
              )}
              Profil Oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Page
export default function StyleLabPage() {
  const [sources, setSources] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, profilesRes] = await Promise.all([
        api.get(`${API}/sources/list`),
        api.get(`${API}/styles/list`),
      ]);
      setSources(sourcesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (username) => {
    const response = await api.post(`${API}/sources/add`, {
      twitter_username: username,
    });
    setSources([response.data, ...sources]);
  };

  const handleDeleteSource = async (sourceId) => {
    await api.delete(`${API}/sources/${sourceId}`);
    setSources(sources.filter((s) => s.id !== sourceId));
    toast.success("Kaynak silindi");
  };

  const handleRefreshSource = async (sourceId) => {
    await api.post(`${API}/sources/${sourceId}/refresh`);
    fetchData();
  };

  const handleAnalyze = async (source) => {
    setSelectedSource(source);
    try {
      const response = await api.post(`${API}/styles/analyze-source/${source.id}`);
      setAnalysis(response.data);
      setAnalysisDialogOpen(true);
    } catch (error) {
      toast.error("Analiz başarısız");
    }
  };

  const handleCreateProfile = async (name, sourceIds) => {
    const response = await api.post(`${API}/styles/create`, {
      name,
      source_ids: sourceIds,
    });
    setProfiles([response.data, ...profiles]);
  };

  const handleDeleteProfile = async (profileId) => {
    await api.delete(`${API}/styles/${profileId}`);
    setProfiles(profiles.filter((p) => p.id !== profileId));
    toast.success("Profil silindi");
  };

  const handleRefreshProfile = async (profileId) => {
    const response = await api.post(`${API}/styles/${profileId}/refresh`);
    // Refresh the profiles list to get updated data
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

  const navigate = useNavigate();
  const handleUseProfile = (profile) => {
    navigate(`/dashboard/create?platform=twitter&style=${profile.id}`);
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
            Twitter Hesabı Ekle
          </Button>
        </div>
      </div>

      {/* Style Profiles */}
      {profiles.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-outfit text-2xl font-bold flex items-center gap-2">
              <Fingerprint className="h-6 w-6 text-purple-400" />
              Stil Profilleri
            </h2>
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
      )}

      {/* Sources */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-outfit text-2xl font-bold flex items-center gap-2">
            <Twitter className="h-6 w-6 text-sky-400" />
            Kaynak Hesaplar
          </h2>
          <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Hesap Ekle
          </Button>
        </div>

        {sources.length === 0 ? (
          <Card className="border-dashed border-2 border-border bg-card/50">
            <CardContent className="py-16 text-center">
              <Twitter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-outfit text-xl font-semibold mb-2">Henüz kaynak yok</h3>
              <p className="text-muted-foreground mb-6">
                Stil öğrenmek için Twitter hesapları ekleyin
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Hesabı Ekle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onDelete={handleDeleteSource}
                onRefresh={handleRefreshSource}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddSource}
      />

      <AnalysisDialog
        open={analysisDialogOpen}
        onOpenChange={setAnalysisDialogOpen}
        source={selectedSource}
        analysis={analysis}
        onCreateProfile={handleCreateProfile}
      />

      <AIAnalysisDialog
        open={aiAnalysisOpen}
        onOpenChange={setAiAnalysisOpen}
        profileData={selectedProfileData}
      />
    </div>
  );
}
