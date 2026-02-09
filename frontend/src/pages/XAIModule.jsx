import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Twitter,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  RefreshCw,
  Link,
  Image,
  Upload,
  Repeat2,
  CircleHelp,
  Settings2,
  Lightbulb,
  X,
  User,
  Dna,
  Trash2,
  Brain,
  Loader2,
  Check,
  Fingerprint,
  Heart,
  Target,
  Wand2,
  Copy,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import GenerationCard from "@/components/generation/GenerationCard";
import FloatingQueue from "@/components/generation/FloatingQueue";
import { useProfile } from "@/contexts/ProfileContext";


// xpatla-style Persona options
const personas = [
  { id: "saf", label: "Saf", desc: "Karakter yok, sadece sen" },
  { id: "otorite", label: "Otorite", desc: "Insider perspective, kesin" },
  { id: "insider", label: "Insider", desc: "Exclusive bilgi vibe" },
  { id: "mentalist", label: "Mentalist", desc: "Teknik + motivasyon" },
  { id: "haber", label: "Haber", desc: "Haber formatı" },
];

// xpatla-style Tone options
const tones = [
  { id: "natural", label: "Natural", desc: "Sıfır yapı, doğal akış" },
  { id: "raw", label: "Raw", desc: "Ham düşünce akışı" },
  { id: "polished", label: "Polished", desc: "Thesis→Evidence→Insight" },
  { id: "unhinged", label: "Unhinged", desc: "Shock→Escalate→Twist" },
];

// Knowledge options (NEW!)
const knowledgeModes = [
  { id: null, label: "Yok", desc: "Ekstra bilgi modu yok" },
  { id: "insider", label: "insider", desc: "Perde arkası bilgi" },
  { id: "contrarian", label: "contrarian", desc: "Herkesin tersini savun" },
  { id: "hidden", label: "hidden", desc: "Gizli, az bilinen bilgi" },
  { id: "expert", label: "expert", desc: "Derin uzmanlık bilgisi" },
];

// xpatla-style Length options for different tabs
const tweetLengths = [
  { id: "micro", label: "Micro", range: "50-100" },
  { id: "punch", label: "Punch", range: "140-280" },
  { id: "spark", label: "Spark", range: "400-600" },
  { id: "storm", label: "Storm", range: "700-1K" },
  { id: "thread", label: "Thread", range: "3-7 tweet" },
];

const replyLengths = [
  { id: "micro", label: "Micro", range: "50-100" },
  { id: "punch", label: "Punch", range: "140-280" },
  { id: "spark", label: "Spark", range: "400-600" },
];

const articleLengths = [
  { id: "brief", label: "Brief", range: "1.5-2K" },
  { id: "standard", label: "Standard", range: "3-3.5K" },
  { id: "deep", label: "Deep", range: "5K+" },
];

// Reply modes
const replyModes = [
  { id: "support", label: "Support", desc: "Katılır ve değer ekler" },
  { id: "challenge", label: "Challenge", desc: "Saygılıca karşı görüş sunar" },
  { id: "question", label: "Question", desc: "Merak edilen bir soru sorar" },
  { id: "expand", label: "Expand", desc: "Konuyu yeni bir boyuta taşır" },
  { id: "joke", label: "Joke", desc: "Esprili ve eğlenceli yanıt verir" },
];

// Article styles
const articleStyles = [
  { id: "raw", label: "Raw", desc: "Kişisel düşüncelerini özgürce paylaşır" },
  { id: "authority", label: "Authority", desc: "Veri ve örneklerle desteklenmiş yazı" },
  { id: "story", label: "Story", desc: "Bir hikaye gibi anlatan yazı" },
  { id: "tutorial", label: "Tutorial", desc: "Adım adım öğreten rehber" },
  { id: "opinion", label: "Opinion", desc: "Net bir fikri savunan yazı" },
];

// Language options
const languages = [
  { id: "auto", label: "Otomatik" },
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
];

// Chip selector component
function ChipSelector({ options, value, onChange, size = "default" }) {
  const selected = options.find(o => o.id === value);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id || "none"}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "chip",
              size === "small" && "text-xs px-2 py-1",
              value === option.id && "active"
            )}
            data-testid={`chip-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {selected?.desc && (
        <p className="text-xs text-muted-foreground">{selected.desc}</p>
      )}
    </div>
  );
}

// Knowledge selector component (pill style like xpatla)
function KnowledgeSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {knowledgeModes.slice(1).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(value === option.id ? null : option.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              value === option.id
                ? "bg-sky-500 text-white border-sky-500"
                : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
            )}
            data-testid={`knowledge-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-muted-foreground">
          {knowledgeModes.find(k => k.id === value)?.desc}
        </p>
      )}
    </div>
  );
}

// AI Analysis Dialog (moved from StyleLabPage)
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
            {fp.tweet_count || 0} tweet analiz edildi
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                Uzunluk Dağılımı
              </h4>
              <div className="space-y-2">
                {["short", "medium", "long"].map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {key === "short" ? "Kısa (<100)" : key === "medium" ? "Orta (100-200)" : "Uzun (200+)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            key === "short" ? "bg-sky-400" : key === "medium" ? "bg-purple-400" : "bg-pink-400"
                          )}
                          style={{ width: `${fp.length_distribution?.[key] || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{fp.length_distribution?.[key] || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Kullanım Oranları
              </h4>
              <div className="space-y-2">
                {[
                  { label: "Soru (?)", val: fp.question_ratio },
                  { label: "Ünlem (!)", val: fp.exclamation_ratio },
                  { label: "Link paylaşımı", val: fp.link_usage },
                  { label: "Hashtag/tweet", val: fp.hashtag_usage },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{val || 0}{label.includes("Hashtag") ? "" : "%"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {sections.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                AI Derinlemesine Analiz
              </h4>
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
                    {section.title && <h5 className="font-medium text-purple-300 mb-2">{section.title}</h5>}
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          {stylePrompt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-pink-400" />
                  Stil Prompt
                </h4>
                <Button variant="ghost" size="sm" onClick={handleCopyPrompt} className="h-8 text-xs">
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

// Style DNA Panel: Compact profile selector for X AI (detailed management in Style Lab)
function StyleDNAPanel() {
  const { profiles, activeProfile, activeProfileId, setActiveProfile, refreshProfiles } = useProfile();
  const [addMode, setAddMode] = useState(false);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addProgress, setAddProgress] = useState(0);
  const [addStep, setAddStep] = useState("");
  const [profileListOpen, setProfileListOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const navigate = useNavigate();

  // Quick add: scrape tweets → analyze → create profile (all in one flow)
  const handleQuickAdd = async () => {
    const clean = username.trim().replace("@", "");
    if (!clean) {
      toast.error("Kullanıcı adı girin");
      return;
    }
    setAdding(true);
    setAddProgress(0);
    setAddStep("scraping");

    try {
      setAddStep("scraping");
      setAddProgress(20);
      const sourceRes = await api.post(`${API}/sources/add`, { twitter_username: clean });
      const source = sourceRes.data;
      setAddProgress(40);

      setAddStep("analyzing");
      setAddProgress(60);
      await api.post(`${API}/styles/analyze-source/${source.id}`);
      setAddProgress(80);

      setAddStep("creating");
      const profileName = `${source.twitter_display_name || clean} Style`;
      const profileRes = await api.post(`${API}/styles/create`, {
        name: profileName,
        source_ids: [source.id],
      });
      setAddProgress(100);

      await refreshProfiles();
      await setActiveProfile(profileRes.data.id);

      toast.success(`@${clean} stili oluşturuldu ve aktif edildi!`);
      setUsername("");
      setAddMode(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Profil oluşturulamadı");
    } finally {
      setAdding(false);
      setAddProgress(0);
      setAddStep("");
    }
  };

  const handleViewAnalysis = async () => {
    if (!activeProfileId) return;
    try {
      const [profileRes, promptRes] = await Promise.all([
        api.get(`${API}/styles/${activeProfileId}`),
        api.get(`${API}/styles/${activeProfileId}/prompt`),
      ]);
      setSelectedProfileData({
        ...profileRes.data,
        style_prompt: promptRes.data.style_prompt,
      });
      setAnalysisOpen(true);
    } catch (error) {
      toast.error("Analiz yüklenemedi");
    }
  };

  const stepLabels = {
    scraping: "Tweet'ler çekiliyor...",
    analyzing: "AI analiz yapıyor...",
    creating: "Profil oluşturuluyor...",
  };

  return (
    <>
      <div className="mb-6">
        <Card className={cn(
          "border-border overflow-hidden transition-all",
          activeProfile && "border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5"
        )}>
          <CardContent className="p-4">
            {/* Active profile display */}
            {activeProfile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Dna className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{activeProfile.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {activeProfile.style_summary?.tweet_count || 0} tweet
                        </Badge>
                      </div>
                      <p className="text-xs text-purple-400">
                        Üretimler bu stilde yapılacak
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleViewAnalysis}
                      className="h-8 w-8"
                      title="Detaylı analiz"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfileListOpen(!profileListOpen)}
                      className="h-8 text-xs gap-1"
                    >
                      Değiştir
                      <ChevronDown className={cn("h-3 w-3 transition-transform", profileListOpen && "rotate-180")} />
                    </Button>
                  </div>
                </div>

                {/* Profile switcher dropdown */}
                {profileListOpen && (
                  <div className="border-t border-border/50 pt-3 space-y-1">
                    {profiles.filter(p => p.id !== activeProfileId).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => { setActiveProfile(profile.id); setProfileListOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">
                              {profile.name?.charAt(0)?.toUpperCase() || "S"}
                            </span>
                          </div>
                          <span>{profile.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {profile.style_summary?.tweet_count || 0} tweet
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setActiveProfile(null); setProfileListOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Stil klonlamayı kapat</span>
                    </button>
                    <div className="border-t border-border/50 pt-2 mt-2">
                      <button
                        onClick={() => navigate("/dashboard/style-lab")}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-purple-400 hover:bg-purple-500/10 transition-colors"
                      >
                        <Dna className="h-4 w-4" />
                        <span>Style Lab'da Yönet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : !addMode ? (
              /* No profile: Show compact options */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Dna className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stil Klonlama</p>
                    <p className="text-xs text-muted-foreground">
                      Bir Twitter hesabının yazım stilini klonla
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileListOpen(!profileListOpen)}
                      className="h-8 text-xs gap-1"
                    >
                      Profil Seç
                      <ChevronDown className={cn("h-3 w-3 transition-transform", profileListOpen && "rotate-180")} />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddMode(true)}
                    className="h-8 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Plus className="h-3 w-3" />
                    Hızlı Ekle
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Profile list when no active profile */}
            {!activeProfile && profileListOpen && profiles.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-3 space-y-1">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => { setActiveProfile(profile.id); setProfileListOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {profile.name?.charAt(0)?.toUpperCase() || "S"}
                      </span>
                    </div>
                    <span>{profile.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {profile.style_summary?.tweet_count || 0} tweet
                    </span>
                  </button>
                ))}
                <div className="border-t border-border/50 pt-2 mt-2">
                  <button
                    onClick={() => navigate("/dashboard/style-lab")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Dna className="h-4 w-4" />
                    <span>Style Lab'da Yönet</span>
                  </button>
                </div>
              </div>
            )}

            {/* Add mode: Quick add flow */}
            {addMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dna className="h-5 w-5 text-purple-400" />
                    <p className="text-sm font-medium">Hızlı Stil Profili</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setAddMode(false); setUsername(""); }}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Twitter kullanıcı adı gir, tweet'ler çekilecek ve AI ile stil profili oluşturulacak.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      placeholder="kullanici_adi"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-8"
                      disabled={adding}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                    />
                  </div>
                  <Button
                    onClick={handleQuickAdd}
                    disabled={adding || !username.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2"
                  >
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {adding ? "İşleniyor" : "Oluştur"}
                  </Button>
                </div>
                {adding && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{stepLabels[addStep] || "Hazırlanıyor..."}</span>
                      <span className="text-muted-foreground">{addProgress}%</span>
                    </div>
                    <Progress value={addProgress} className="h-1.5" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AIAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        profileData={selectedProfileData}
      />
    </>
  );
}

// Length selector component
function LengthSelector({ options, value, onChange }) {
  const selected = options.find(o => o.id === value);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <div key={option.id} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                value === option.id 
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
              )}
              data-testid={`length-${option.id}`}
            >
              {option.label}
            </button>
            <span className="text-xs text-muted-foreground mt-1">{option.range} kar.</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Variant counter component
function VariantCounter({ value, onChange, max = 5 }) {
  return (
    <div className="flex items-center gap-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        data-testid="variant-minus"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="text-xl font-semibold w-8 text-center">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        data-testid="variant-plus"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Image upload component (NEW!)
function ImageUpload({ imageUrl, onImageChange, onImageRemove, onBase64Change }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Görsel 5MB'dan küçük olmalı");
        return;
      }
      const url = URL.createObjectURL(file);
      onImageChange(url);
      
      // Convert to base64 for API
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onBase64Change) onBase64Change(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-muted-foreground/50 transition-colors cursor-pointer"
      onClick={() => !imageUrl && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {imageUrl ? (
        <div className="relative">
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            className="max-h-32 rounded-lg mx-auto"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageRemove();
            }}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <div className="text-center">
            <p className="text-sm font-medium">Görsel ekle (opsiyonel)</p>
            <p className="text-xs">Max 5MB - JPG, PNG, WebP</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Tweet Tab Content
function TweetTab({ jobs, onAddJob, onDismissJob, initialTopic, initialContext }) {
  const { activeProfileId, activeProfile } = useProfile();
  const [topic, setTopic] = useState(initialTopic || "");
  const [mode, setMode] = useState("classic");
  const [length, setLength] = useState("punch");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("otorite");
  const [tone, setTone] = useState("natural");
  const [knowledge, setKnowledge] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState(initialContext || "");
  // Trend'den gelince ek bağlam otomatik açık
  const [showContext, setShowContext] = useState(!!initialContext);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Lütfen bir konu girin");
      return;
    }

    onAddJob({
      type: "tweet",
      topic,
      mode,
      length,
      variants,
      persona,
      tone,
      knowledge,
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: tweetLengths.find((l) => l.id === length)?.label || length,
      knowledgeLabel: knowledge ? knowledgeModes.find((k) => k.id === knowledge)?.label : null,
      style_profile_id: activeProfileId,
      image_url: imageUrl,
      image_base64: imageBase64,
    });
  };

  // Get summary text for collapsed advanced settings
  const advancedSummary = `${personas.find(p => p.id === persona)?.label} · ${tones.find(t => t.id === tone)?.label}${knowledge ? ` · ${knowledge}` : ''}`;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("classic")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === "classic"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
          data-testid="mode-classic"
        >
          Klasik
        </button>
        <button
          type="button"
          onClick={() => setMode("apex")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1",
            mode === "apex"
              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
          data-testid="mode-apex"
        >
          <Zap className="h-4 w-4" />
          APEX
        </button>
      </div>

      {/* Main Input */}
      <div className={mode === "apex" ? "gradient-border-wrapper" : ""}>
        <Textarea
          placeholder={mode === "apex" ? "APEX modunda viral içerik üret..." : "Konu yaz, haber linki veya tweet URL'si yapıştır..."}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={cn(
            "min-h-[120px] text-base resize-none pr-16",
            mode !== "apex" && "border-border"
          )}
          data-testid="tweet-input"
        />
      </div>
      <div className="flex justify-end -mt-8 mr-3 relative z-10">
        <span className="text-sm text-muted-foreground bg-card px-1">
          {topic.length}/280
        </span>
      </div>

      {/* Image Upload (NEW!) */}
      <ImageUpload 
        imageUrl={imageUrl}
        onImageChange={setImageUrl}
        onImageRemove={() => { setImageUrl(null); setImageBase64(null); }}
        onBase64Change={setImageBase64}
      />

      {/* Length Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Uzunluk</label>
        <LengthSelector
          options={tweetLengths}
          value={length}
          onChange={setLength}
        />
      </div>

      {/* Variant Counter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Varyant Sayısı</label>
        <VariantCounter value={variants} onChange={setVariants} />
      </div>

      {/* Advanced Settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            data-testid="advanced-toggle"
          >
            <Settings2 className="h-4 w-4" />
            <span>Gelişmiş Ayarlar</span>
            <span className="text-xs ml-2 text-muted-foreground">
              • {advancedSummary}
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Persona */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Karakter</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ton</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>

          {/* Knowledge (NEW!) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Knowledge</label>
            <KnowledgeSelector value={knowledge} onChange={setKnowledge} />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dil</label>
            <ChipSelector options={languages} value={language} onChange={setLanguage} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Context */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
            className="rounded border-border"
            data-testid="context-checkbox"
          />
          <span className="text-sm font-medium">Ek Bağlam (Opsiyonel)</span>
        </label>
        {showContext && (
          <div className="space-y-1">
            <Textarea
              placeholder="AI'a vermek istediğin ek bilgi veya yönlendirme..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="context-input"
            />
            <p className="text-xs text-muted-foreground">
              Örnek: "daha teknik bir dil kullan" veya "startup ekosistemine odaklan"
            </p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!topic.trim()}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-btn"
      >
        {hasActiveJob ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {hasActiveJob ? "Sıraya Ekle" : "Üret"}
      </Button>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Image className="h-4 w-4" />
        Görseller internetten araştırılıp size en uygun olanı getirilmektedir. Paylaşım sorumluluğu size aittir.
      </p>

      {/* Generation Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-outfit text-lg font-semibold">Üretilen İçerik</h3>
          {jobs.map((job) => (
            <GenerationCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Floating Queue Notifications */}
      <FloatingQueue jobs={jobs} onDismiss={onDismissJob} />
    </div>
  );
}

// Tweet Preview Card Component
function TweetPreviewCard({ tweet }) {
  if (!tweet) return null;
  
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  return (
    <Card className="bg-secondary/50 border-border overflow-hidden" data-testid="tweet-preview">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {tweet.author?.avatar && (
            <img 
              src={tweet.author.avatar.replace('_normal', '_bigger')} 
              alt={tweet.author.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{tweet.author?.name}</span>
              <span className="text-muted-foreground text-xs truncate">@{tweet.author?.username}</span>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap">{tweet.text}</p>
            {tweet.media?.length > 0 && (
              <div className="mt-2 rounded-lg overflow-hidden">
                {tweet.media.filter(m => m.type === 'photo').slice(0, 1).map((m, i) => (
                  <img key={i} src={m.url} alt="" className="max-h-48 rounded-lg" />
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>💬 {formatNumber(tweet.metrics?.replies)}</span>
              <span>🔁 {formatNumber(tweet.metrics?.retweets)}</span>
              <span>❤️ {formatNumber(tweet.metrics?.likes)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quote Tab Content
function QuoteTab({ jobs, onAddJob, onDismissJob }) {
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetContent, setTweetContent] = useState("");
  const [tweetData, setTweetData] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [length, setLength] = useState("punch");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("otorite");
  const [tone, setTone] = useState("natural");
  const [knowledge, setKnowledge] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const handleFetch = async () => {
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setFetching(true);
    try {
      const response = await api.get(`${API}/tweet/fetch`, { params: { url: tweetUrl } });
      if (response.data.success) {
        setTweetData(response.data.tweet);
        setTweetContent(response.data.tweet.text);
        setFetched(true);
        toast.success("Tweet çekildi!");
      } else {
        toast.error("Tweet çekilemedi");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Tweet çekilemedi");
    } finally {
      setFetching(false);
    }
  };

  const handleGenerate = () => {
    if (!tweetContent.trim()) {
      toast.error("Lütfen önce tweet'i çekin");
      return;
    }

    onAddJob({
      type: "quote",
      topic: tweetContent.slice(0, 60) + "...",
      tweetUrl,
      tweetContent,
      length,
      variants,
      persona,
      tone,
      knowledge,
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: tweetLengths.find((l) => l.id === length)?.label || length,
    });
  };

  const advancedSummary = `${personas.find(p => p.id === persona)?.label} · ${tones.find(t => t.id === tone)?.label}${knowledge ? ` · ${knowledge}` : ''}`;

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tweet linkini yapıştır</label>
        <div className="flex gap-2">
          <Input
            placeholder="https://x.com/user/status/123..."
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            className="flex-1"
            data-testid="quote-url-input"
          />
          <Button onClick={handleFetch} variant="secondary" disabled={fetching} data-testid="fetch-btn">
            {fetching ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
            {fetching ? "Çekiliyor..." : "Çek"}
          </Button>
        </div>
      </div>

      {/* Tweet Preview */}
      {fetched && <TweetPreviewCard tweet={tweetData} />}

      {/* Length Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Uzunluk</label>
        <LengthSelector
          options={tweetLengths.slice(0, 4)}
          value={length}
          onChange={setLength}
        />
      </div>

      {/* Variant Counter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Varyant Sayısı</label>
        <VariantCounter value={variants} onChange={setVariants} />
      </div>

      {/* Advanced Settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Settings2 className="h-4 w-4" />
            <span>Gelişmiş Ayarlar</span>
            <span className="text-xs ml-2 text-muted-foreground">• {advancedSummary}</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Karakter</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ton</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Knowledge</label>
            <KnowledgeSelector value={knowledge} onChange={setKnowledge} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dil</label>
            <ChipSelector options={languages} value={language} onChange={setLanguage} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Context */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm font-medium">Ek Bağlam (Opsiyonel)</span>
        </label>
        {showContext && (
          <Textarea
            placeholder="AI'a vermek istediğin ek bilgi veya yönlendirme..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!fetched}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-quote-btn"
      >
        {hasActiveJob ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {hasActiveJob ? "Sıraya Ekle" : "Üret"}
      </Button>

      {/* Generation Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-outfit text-lg font-semibold">Üretilen İçerik</h3>
          {jobs.map((job) => (
            <GenerationCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Floating Queue Notifications */}
      <FloatingQueue jobs={jobs} onDismiss={onDismissJob} />
    </div>
  );
}

// Reply Tab Content
function ReplyTab({ jobs, onAddJob, onDismissJob }) {
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetContent, setTweetContent] = useState("");
  const [tweetData, setTweetData] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [length, setLength] = useState("punch");
  const [replyMode, setReplyMode] = useState("support");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("otorite");
  const [tone, setTone] = useState("natural");
  const [knowledge, setKnowledge] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const handleFetch = async () => {
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setFetching(true);
    try {
      const response = await api.get(`${API}/tweet/fetch`, { params: { url: tweetUrl } });
      if (response.data.success) {
        setTweetData(response.data.tweet);
        setTweetContent(response.data.tweet.text);
        setFetched(true);
        toast.success("Tweet çekildi!");
      } else {
        toast.error("Tweet çekilemedi");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Tweet çekilemedi");
    } finally {
      setFetching(false);
    }
  };

  const handleGenerate = () => {
    if (!tweetContent.trim()) {
      toast.error("Lütfen önce tweet'i çekin");
      return;
    }

    onAddJob({
      type: "reply",
      topic: tweetContent.slice(0, 60) + "...",
      tweetUrl,
      tweetContent,
      length,
      replyMode,
      variants,
      persona,
      tone,
      knowledge,
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: replyLengths.find((l) => l.id === length)?.label || length,
    });
  };

  const advancedSummary = `${personas.find(p => p.id === persona)?.label} · ${tones.find(t => t.id === tone)?.label}${knowledge ? ` · ${knowledge}` : ''}`;

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Reply atacağın tweet linkini yapıştır</label>
        <div className="flex gap-2">
          <Input
            placeholder="https://x.com/user/status/123..."
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            className="flex-1"
            data-testid="reply-url-input"
          />
          <Button onClick={handleFetch} variant="secondary" disabled={fetching} data-testid="reply-fetch-btn">
            {fetching ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
            {fetching ? "Çekiliyor..." : "Çek"}
          </Button>
        </div>
      </div>

      {/* Tweet Preview */}
      {fetched && <TweetPreviewCard tweet={tweetData} />}

      {/* Length Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Uzunluk</label>
        <LengthSelector
          options={replyLengths}
          value={length}
          onChange={setLength}
        />
      </div>

      {/* Reply Mode Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Reply Modu</label>
        <ChipSelector options={replyModes} value={replyMode} onChange={setReplyMode} />
      </div>

      {/* Variant Counter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Varyant Sayısı</label>
        <VariantCounter value={variants} onChange={setVariants} />
      </div>

      {/* Advanced Settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Settings2 className="h-4 w-4" />
            <span>Gelişmiş Ayarlar</span>
            <span className="text-xs ml-2 text-muted-foreground">• {advancedSummary}</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Karakter</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ton</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Knowledge</label>
            <KnowledgeSelector value={knowledge} onChange={setKnowledge} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dil</label>
            <ChipSelector options={languages} value={language} onChange={setLanguage} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Context */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm font-medium">Ek Bağlam (Opsiyonel)</span>
        </label>
        {showContext && (
          <Textarea
            placeholder="AI'a vermek istediğin ek bilgi veya yönlendirme..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!fetched}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-reply-btn"
      >
        {hasActiveJob ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {hasActiveJob ? "Sıraya Ekle" : "Üret"}
      </Button>

      {/* Generation Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-outfit text-lg font-semibold">Üretilen İçerik</h3>
          {jobs.map((job) => (
            <GenerationCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Floating Queue Notifications */}
      <FloatingQueue jobs={jobs} onDismiss={onDismissJob} />
    </div>
  );
}

// Article Tab Content
function ArticleTab({ jobs, onAddJob, onDismissJob }) {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [length, setLength] = useState("standard");
  const [style, setStyle] = useState("authority");
  const [language, setLanguage] = useState("auto");
  const [referenceLinks, setReferenceLinks] = useState([""]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const addReferenceLink = () => {
    if (referenceLinks.length < 5) {
      setReferenceLinks([...referenceLinks, ""]);
    }
  };

  const updateReferenceLink = (index, value) => {
    const updated = [...referenceLinks];
    updated[index] = value;
    setReferenceLinks(updated);
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Lütfen bir konu girin");
      return;
    }

    onAddJob({
      type: "article",
      topic,
      title: title || null,
      length,
      style,
      language,
      variants: 1,
      persona: "otorite",
      referenceLinks: referenceLinks.filter((l) => l.trim()),
      additionalContext: additionalContext || null,
      personaLabel: "Article",
      toneLabel: articleStyles.find((s) => s.id === style)?.label || style,
      lengthLabel: articleLengths.find((l) => l.id === length)?.label || length,
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
        <Lightbulb className="h-5 w-5 text-sky-400" />
        <p className="text-sm text-sky-200">
          Konu veya fikir yaz, X Article + Cover Image generate
        </p>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Başlık (optional - AI will generate)</label>
        <Input
          placeholder="Article başlığı..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="article-title-input"
        />
      </div>

      {/* Topic Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Article topic, idea or main message...</label>
        <Textarea
          placeholder="Makalenin ana konusu veya fikri..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-[160px] resize-none"
          data-testid="article-topic-input"
        />
      </div>

      {/* Length Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Uzunluk</label>
        <LengthSelector
          options={articleLengths}
          value={length}
          onChange={setLength}
        />
      </div>

      {/* Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Stil</label>
        <ChipSelector options={articleStyles} value={style} onChange={setStyle} />
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Dil</label>
        <ChipSelector options={languages} value={language} onChange={setLanguage} />
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Settings2 className="h-4 w-4" />
            <span>Gelişmiş Ayarlar</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Reference Links */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Referans Linkler</label>
            {referenceLinks.map((link, index) => (
              <Input
                key={index}
                placeholder={`Referans link ${index + 1} (optional)`}
                value={link}
                onChange={(e) => updateReferenceLink(index, e.target.value)}
                data-testid={`reference-link-${index}`}
              />
            ))}
            {referenceLinks.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReferenceLink}
                data-testid="add-reference-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Link ekle (max 5)
              </Button>
            )}
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ek Notlar</label>
            <Textarea
              placeholder="AI'a vermek istediğin ek bilgi veya yönlendirme..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="article-context-input"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!topic.trim()}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-article-btn"
      >
        {hasActiveJob ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {hasActiveJob ? "Sıraya Ekle" : "Üret"}
      </Button>

      {/* Generation Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-outfit text-lg font-semibold">Üretilen İçerik</h3>
          {jobs.map((job) => (
            <GenerationCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Floating Queue Notifications */}
      <FloatingQueue jobs={jobs} onDismiss={onDismissJob} />
    </div>
  );
}

// ── Collapsible Guide (XPatla-style) ────────────────
function GuideAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all group"
      >
        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-foreground/90 flex-1 text-left">
          ✨ Yeni misin? Kendi stilini oluşturmanın en hızlı yolunu keşfet
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {open && (
        <div className="mt-3 px-5 py-5 rounded-2xl bg-card/50 border border-border/50 animate-in slide-in-from-top-2 fade-in duration-200">
          <p className="text-sm text-foreground/90 mb-1 font-medium">
            Henüz yeterli içeriğin yok mu? Sorun değil.
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            Type Hype, beğendiğin hesapların yazım DNA'sını analiz eder ve sana özel içerikler üretir. İşte kendi stilini oluşturmanın yol haritası:
          </p>

          <ol className="space-y-3 mb-5">
            {[
              { emoji: "🔍", text: "İlham aldığın bir hesap bul (alanında fark yaratan biri)" },
              { emoji: "🧬", text: "O hesabı Style Lab'a ekle, AI yazım stilini çözsün" },
              { emoji: "✍️", text: "O stilde, senin konularında içerik üret" },
              { emoji: "🚀", text: "Üretilen içerikleri kendi hesabından paylaş" },
              { emoji: "📊", text: "20-30 paylaşım sonra kendi hesabını Style Lab'a ekle" },
              { emoji: "🎯", text: "Artık AI senin özgün stilini biliyor, sana özel üretiyor" },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-base shrink-0 w-7">{step.emoji}</span>
                <div>
                  <span className="text-sm text-foreground/80">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>

          <div className="pt-4 border-t border-border/30">
            <p className="text-xs text-amber-500/70">
              💡 Kısaca: AI'a en iyilerden öğret, sonra sana özel üretsin. İlk tweet'ten itibaren profesyonel görün.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Job ID counter
let jobIdCounter = 0;

// Main X AI Module Component
export default function XAIModule() {
  const [jobs, setJobs] = useState([]);
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const initialContext = searchParams.get("trend_context") || "";

  const updateJob = useCallback((jobId, updates) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  }, []);

  const dismissJob = useCallback((jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const addJob = useCallback(
    async (params) => {
      const jobId = `job-${++jobIdCounter}`;
      const newJob = {
        id: jobId,
        type: params.type,
        status: "generating",
        startedAt: Date.now(),
        topic: params.topic,
        persona: params.persona,
        personaLabel: params.personaLabel,
        toneLabel: params.toneLabel,
        lengthLabel: params.lengthLabel,
        knowledgeLabel: params.knowledgeLabel,
        variantCount: params.variants,
        variants: null,
      };

      setJobs((prev) => [newJob, ...prev]);

      try {
        let endpoint = `${API}/generate/${params.type}`;
        let body = {};

        if (params.type === "tweet") {
          body = {
            topic: params.topic,
            mode: params.mode,
            length: params.length,
            variants: params.variants,
            persona: params.persona,
            tone: params.tone,
            knowledge: params.knowledge || null,
            language: params.language,
            additional_context: params.additionalContext,
            style_profile_id: params.style_profile_id || null,
            image_url: params.image_url || null,
            image_base64: params.image_base64 || null,
          };
        } else if (params.type === "quote") {
          body = {
            tweet_url: params.tweetUrl,
            tweet_content: params.tweetContent,
            length: params.length,
            variants: params.variants,
            persona: params.persona,
            tone: params.tone,
            knowledge: params.knowledge || null,
            language: params.language,
            additional_context: params.additionalContext,
          };
        } else if (params.type === "reply") {
          body = {
            tweet_url: params.tweetUrl,
            tweet_content: params.tweetContent,
            length: params.length,
            reply_mode: params.replyMode,
            variants: params.variants,
            persona: params.persona,
            tone: params.tone,
            knowledge: params.knowledge || null,
            language: params.language,
            additional_context: params.additionalContext,
          };
        } else if (params.type === "article") {
          body = {
            topic: params.topic,
            title: params.title || null,
            length: params.length,
            style: params.style,
            language: params.language,
            reference_links: params.referenceLinks,
            additional_context: params.additionalContext,
          };
        }

        const response = await api.post(endpoint, body);

        if (response.data.success) {
          updateJob(jobId, {
            status: "completed",
            variants: response.data.variants,
            generationId: response.data.generation_id,
          });
          toast.success("İçerik başarıyla üretildi!");
        } else {
          updateJob(jobId, { status: "error" });
          toast.error(response.data.error || "Üretim başarısız");
        }
      } catch (error) {
        updateJob(jobId, { status: "error" });
        toast.error(error.response?.data?.detail || "Bir hata oluştu");
      }
    },
    [updateJob]
  );

  return (
    <div className="max-w-4xl mx-auto" data-testid="x-ai-module">
      {/* Hero Header */}
      <div className="mt-4 mb-10 text-center">
        <h1 className="font-outfit text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          Konu yaz, <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">viral tweetler</span> üret
        </h1>
        <p className="text-muted-foreground text-lg">
          AI senin stilinde viral içerik üretsin
        </p>
      </div>

      {/* Collapsible Guide */}
      <GuideAccordion />

      {/* Style DNA Panel */}
      <StyleDNAPanel />

      {/* Main Content Card */}
      <Card className="bg-card border-border/50 rounded-2xl shadow-lg shadow-black/[0.03] dark:shadow-black/20 mb-8">
        <CardContent className="p-8">
          {/* Tabs */}
          <Tabs defaultValue="tweet" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6" data-testid="x-ai-tabs">
              <TabsTrigger value="tweet" data-testid="tab-tweet">Tweet</TabsTrigger>
              <TabsTrigger value="quote" data-testid="tab-quote">Alıntı</TabsTrigger>
              <TabsTrigger value="reply" data-testid="tab-reply">Yanıt</TabsTrigger>
              <TabsTrigger value="article" data-testid="tab-article">Makale</TabsTrigger>
            </TabsList>

            <TabsContent value="tweet">
              <TweetTab jobs={jobs.filter(j => j.type === "tweet")} onAddJob={addJob} onDismissJob={dismissJob} initialTopic={initialTopic} initialContext={initialContext} />
            </TabsContent>

            <TabsContent value="quote">
              <QuoteTab jobs={jobs.filter(j => j.type === "quote")} onAddJob={addJob} onDismissJob={dismissJob} />
            </TabsContent>

            <TabsContent value="reply">
              <ReplyTab jobs={jobs.filter(j => j.type === "reply")} onAddJob={addJob} onDismissJob={dismissJob} />
            </TabsContent>

            <TabsContent value="article">
              <ArticleTab jobs={jobs.filter(j => j.type === "article")} onAddJob={addJob} onDismissJob={dismissJob} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}
