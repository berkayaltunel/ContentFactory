import { useState } from "react";
import { 
  Twitter, 
  Sparkles, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Minus,
  Copy,
  RefreshCw,
  Link,
  Image,
  Repeat2,
  CircleHelp,
  Settings2,
  Lightbulb,
  Heart,
  Send
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Persona options
const personas = [
  { id: "expert", label: "Expert", desc: "Otorite → Insider perspective" },
  { id: "leaked", label: "Leaked", desc: "Exclusive bilgi vibe" },
  { id: "coach", label: "Coach", desc: "Teknik + motivasyon" },
  { id: "news", label: "News", desc: "Haber formatı" },
  { id: "meme", label: "Meme", desc: "Absürt viral" },
  { id: "against", label: "Against", desc: "Zıt görüş" },
];

// Tone options
const tones = [
  { id: "casual", label: "Casual", desc: "Sıfır yapı, doğal" },
  { id: "unfiltered", label: "Unfiltered", desc: "Ham düşünce" },
  { id: "structured", label: "Structured", desc: "Thesis→Evidence→Insight" },
  { id: "absurd", label: "Absurd", desc: "Shock→Escalate→Twist" },
];

// Length options for different tabs
const tweetLengths = [
  { id: "micro", label: "Micro", range: "50-100" },
  { id: "short", label: "Short", range: "140-280" },
  { id: "medium", label: "Medium", range: "400-600" },
  { id: "rush", label: "Rush", range: "700-1K" },
  { id: "thread", label: "Thread", range: "1K+" },
];

const replyLengths = [
  { id: "micro", label: "Micro", range: "50-100" },
  { id: "short", label: "Short", range: "140-280" },
  { id: "medium", label: "Medium", range: "400-600" },
];

const articleLengths = [
  { id: "brief", label: "Brief", range: "1.5-2K" },
  { id: "standard", label: "Standard", range: "3-3.5K" },
  { id: "deep", label: "Deep", range: "5K+" },
];

// Reply modes
const replyModes = [
  { id: "support", label: "Support", desc: "Destekleyici" },
  { id: "challenge", label: "Challenge", desc: "Sorgulayıcı" },
  { id: "question", label: "Question", desc: "Soru sor" },
  { id: "expand", label: "Expand", desc: "Genişlet" },
  { id: "joke", label: "Joke", desc: "Espri" },
];

// Article styles
const articleStyles = [
  { id: "raw", label: "Raw", desc: "Düşünce akışı" },
  { id: "authority", label: "Authority", desc: "Uzman makalesi" },
  { id: "story", label: "Story", desc: "Hikaye anlatımı" },
  { id: "tutorial", label: "Tutorial", desc: "Nasıl yapılır" },
  { id: "opinion", label: "Opinion", desc: "Görüş yazısı" },
];

// Language options
const languages = [
  { id: "auto", label: "Otomatik" },
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
];

// Chip selector component
function ChipSelector({ options, value, onChange, showDesc = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "chip",
            value === option.id && "active"
          )}
          data-testid={`chip-${option.id}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Length selector component
function LengthSelector({ options, value, onChange }) {
  const selected = options.find(o => o.id === value);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              value === option.id 
                ? "bg-white text-black border-white" 
                : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
            )}
            data-testid={`length-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-sm text-muted-foreground">{selected.range} karakter</p>
      )}
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

// Generated content display
function GeneratedContent({ variants, onCopy, onRegenerate }) {
  const [favorites, setFavorites] = useState(new Set());

  const handleTweet = (content) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, '_blank');
    toast.success("Twitter açılıyor...");
  };

  const handleFavorite = async (variant, index) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(index)) {
      newFavorites.delete(index);
      toast.success("Favorilerden kaldırıldı");
    } else {
      newFavorites.add(index);
      toast.success("Favorilere eklendi!");
      // TODO: Save to backend when auth is ready
    }
    setFavorites(newFavorites);
  };

  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-4 mt-6" data-testid="generated-content">
      <h3 className="font-outfit text-lg font-semibold">Üretilen İçerik</h3>
      {variants.map((variant, index) => (
        <Card key={variant.id || index} className="bg-card border-border hover:border-primary/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="whitespace-pre-wrap">{variant.content}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{variant.character_count} karakter</Badge>
                {variants.length > 1 && (
                  <Badge variant="outline">Varyant {index + 1}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(variant.content)}
                  data-testid={`copy-variant-${index}`}
                  className="gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  Kopyala
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFavorite(variant, index)}
                  data-testid={`favorite-variant-${index}`}
                  className={cn("gap-1.5", favorites.has(index) && "text-red-500")}
                >
                  <Heart className={cn("h-4 w-4", favorites.has(index) && "fill-current")} />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleTweet(variant.content)}
                  data-testid={`tweet-variant-${index}`}
                  className="gap-1.5 bg-sky-500 hover:bg-sky-600 text-white"
                >
                  <Send className="h-4 w-4" />
                  Tweetle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Tweet Tab Content
function TweetTab() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("classic");
  const [length, setLength] = useState("short");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("expert");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState([]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Lütfen bir konu girin");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate/tweet`, {
        topic,
        mode,
        length,
        variants,
        persona,
        tone,
        language,
        additional_context: showContext ? additionalContext : null
      });

      if (response.data.success) {
        setGeneratedContent(response.data.variants);
        toast.success("İçerik başarıyla üretildi!");
      } else {
        toast.error(response.data.error || "Üretim başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

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
              ? "bg-white text-black" 
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
      <div className="relative">
        <Textarea
          placeholder="Ne hakkında tweet üreteyim?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-[120px] text-base resize-none pr-16"
          data-testid="tweet-input"
        />
        <span className="absolute bottom-3 right-3 text-sm text-muted-foreground">
          {topic.length}/280
        </span>
      </div>

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
            <span>GELİŞMİŞ AYARLAR</span>
            <span className="text-xs ml-2 text-muted-foreground">
              ({personas.find(p => p.id === persona)?.label}, {tones.find(t => t.id === tone)?.label})
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Persona */}
          <div className="space-y-2">
            <label className="text-sm font-medium">KARAKTER</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">TON</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">DİL</label>
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
        disabled={loading || !topic.trim()}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-btn"
      >
        {loading ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {loading ? "Üretiliyor..." : "Üret"}
      </Button>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Image className="h-4 w-4" />
        Görseller internetten araştırılıp size en uygun olanı getirilmektedir. Paylaşım sorumluluğu size aittir.
      </p>

      {/* Generated Content */}
      <GeneratedContent 
        variants={generatedContent} 
        onCopy={handleCopy}
        onRegenerate={handleGenerate}
      />
    </div>
  );
}

// Quote Tab Content
function QuoteTab() {
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetContent, setTweetContent] = useState("");
  const [fetched, setFetched] = useState(false);
  const [length, setLength] = useState("short");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("expert");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState([]);

  const handleFetch = () => {
    // In a real app, this would fetch the tweet from the URL
    // For now, we'll simulate it
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setTweetContent("Bu örnek bir tweet içeriğidir. Gerçek uygulamada tweet URL'den çekilecektir.");
    setFetched(true);
    toast.success("Tweet çekildi!");
  };

  const handleGenerate = async () => {
    if (!tweetContent.trim()) {
      toast.error("Lütfen önce tweet'i çekin");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate/quote`, {
        tweet_url: tweetUrl,
        tweet_content: tweetContent,
        length,
        variants,
        persona,
        tone,
        language,
        additional_context: showContext ? additionalContext : null
      });

      if (response.data.success) {
        setGeneratedContent(response.data.variants);
        toast.success("Quote tweet üretildi!");
      } else {
        toast.error(response.data.error || "Üretim başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

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
          <Button onClick={handleFetch} variant="secondary" data-testid="fetch-btn">
            <Link className="h-4 w-4 mr-2" />
            Çek
          </Button>
        </div>
      </div>

      {/* Tweet Preview */}
      {fetched && (
        <Card className="bg-secondary/50 border-border" data-testid="tweet-preview">
          <CardContent className="p-4">
            <p className="text-sm">{tweetContent}</p>
          </CardContent>
        </Card>
      )}

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
            <span>GELİŞMİŞ AYARLAR</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">KARAKTER</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">TON</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">DİL</label>
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
        disabled={loading || !fetched}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-quote-btn"
      >
        {loading ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {loading ? "Üretiliyor..." : "Üret"}
      </Button>

      {/* Generated Content */}
      <GeneratedContent 
        variants={generatedContent} 
        onCopy={handleCopy}
      />
    </div>
  );
}

// Reply Tab Content
function ReplyTab() {
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetContent, setTweetContent] = useState("");
  const [fetched, setFetched] = useState(false);
  const [length, setLength] = useState("short");
  const [replyMode, setReplyMode] = useState("support");
  const [variants, setVariants] = useState(3);
  const [persona, setPersona] = useState("expert");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("auto");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState([]);

  const handleFetch = () => {
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setTweetContent("Bu örnek bir tweet içeriğidir. Gerçek uygulamada tweet URL'den çekilecektir.");
    setFetched(true);
    toast.success("Tweet çekildi!");
  };

  const handleGenerate = async () => {
    if (!tweetContent.trim()) {
      toast.error("Lütfen önce tweet'i çekin");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate/reply`, {
        tweet_url: tweetUrl,
        tweet_content: tweetContent,
        length,
        reply_mode: replyMode,
        variants,
        persona,
        tone,
        language,
        additional_context: showContext ? additionalContext : null
      });

      if (response.data.success) {
        setGeneratedContent(response.data.variants);
        toast.success("Reply üretildi!");
      } else {
        toast.error(response.data.error || "Üretim başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
  };

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
          <Button onClick={handleFetch} variant="secondary" data-testid="reply-fetch-btn">
            <Link className="h-4 w-4 mr-2" />
            Çek
          </Button>
        </div>
      </div>

      {/* Tweet Preview */}
      {fetched && (
        <Card className="bg-secondary/50 border-border" data-testid="reply-tweet-preview">
          <CardContent className="p-4">
            <p className="text-sm">{tweetContent}</p>
          </CardContent>
        </Card>
      )}

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
        <label className="text-sm font-medium">REPLY MODU</label>
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
            <span>GELİŞMİŞ AYARLAR</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">KARAKTER</label>
            <ChipSelector options={personas} value={persona} onChange={setPersona} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">TON</label>
            <ChipSelector options={tones} value={tone} onChange={setTone} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">DİL</label>
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
        disabled={loading || !fetched}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-reply-btn"
      >
        {loading ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {loading ? "Üretiliyor..." : "Üret"}
      </Button>

      {/* Generated Content */}
      <GeneratedContent 
        variants={generatedContent} 
        onCopy={handleCopy}
      />
    </div>
  );
}

// Article Tab Content
function ArticleTab() {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [length, setLength] = useState("standard");
  const [style, setStyle] = useState("authority");
  const [language, setLanguage] = useState("auto");
  const [referenceLinks, setReferenceLinks] = useState([""]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState([]);

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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Lütfen bir konu girin");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate/article`, {
        topic,
        title: title || null,
        length,
        style,
        language,
        reference_links: referenceLinks.filter(l => l.trim()),
        additional_context: additionalContext || null
      });

      if (response.data.success) {
        setGeneratedContent(response.data.variants);
        toast.success("Article üretildi!");
      } else {
        toast.error(response.data.error || "Üretim başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı!");
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
        <label className="text-sm font-medium">STİL</label>
        <ChipSelector options={articleStyles} value={style} onChange={setStyle} />
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">DİL</label>
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
            <span>GELİŞMİŞ AYARLAR</span>
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
        disabled={loading || !topic.trim()}
        className="w-full h-12 text-base font-medium"
        data-testid="generate-article-btn"
      >
        {loading ? (
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-5 w-5 mr-2" />
        )}
        {loading ? "Üretiliyor..." : "Üret"}
      </Button>

      {/* Generated Content */}
      <GeneratedContent 
        variants={generatedContent} 
        onCopy={handleCopy}
      />
    </div>
  );
}

// Main X AI Module Component
export default function XAIModule() {
  return (
    <div className="max-w-3xl" data-testid="x-ai-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2">
          Viral Thread Engine
        </h1>
        <p className="text-muted-foreground">
          Dijital içerik strateji ve üretim merkezi.
        </p>
      </div>

      {/* Main Content Card */}
      <Card className="bg-card border-border mb-8">
        <CardContent className="p-6">
          {/* Tabs */}
          <Tabs defaultValue="tweet" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6" data-testid="x-ai-tabs">
              <TabsTrigger value="tweet" data-testid="tab-tweet">Tweet</TabsTrigger>
              <TabsTrigger value="quote" data-testid="tab-quote">Quote</TabsTrigger>
              <TabsTrigger value="reply" data-testid="tab-reply">Reply</TabsTrigger>
              <TabsTrigger value="article" data-testid="tab-article">Article</TabsTrigger>
            </TabsList>

            <TabsContent value="tweet">
              <TweetTab />
            </TabsContent>

            <TabsContent value="quote">
              <QuoteTab />
            </TabsContent>

            <TabsContent value="reply">
              <ReplyTab />
            </TabsContent>

            <TabsContent value="article">
              <ArticleTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Twitter className="h-6 w-6" />
            <h2 className="font-outfit text-2xl font-bold">Thread Architect</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Düşüncelerinizi viral zincirlere (threads) dönüştürün.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Repeat2 className="h-5 w-5 text-sky-400 mt-0.5" />
              <span className="text-sm">Uzun Metinleri Thread'e Dönüştürme</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <CircleHelp className="h-5 w-5 text-sky-400 mt-0.5" />
              <span className="text-sm">Zıt Görüş (Contrarian) Kanca Üretici</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Settings2 className="h-5 w-5 text-sky-400 mt-0.5" />
              <span className="text-sm">Karakter Sınırlı Akıllı Editör</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <Image className="h-5 w-5 text-sky-400 mt-0.5" />
              <span className="text-sm">Görsel İpucu (Visual Cue) Önerileri</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <Lightbulb className="h-4 w-4 text-sky-400 mt-0.5" />
            <p className="text-sm text-sky-200">
              İpucu: Blog yazılarınızı veya YouTube metinlerinizi "Repurpose" modu ile saniyeler içinde Tweet serisine çevirin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
