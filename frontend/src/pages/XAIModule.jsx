import { useState, useCallback, useRef } from "react";
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
  Repeat2,
  CircleHelp,
  Settings2,
  Lightbulb,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import GenerationCard from "@/components/generation/GenerationCard";
import FloatingQueue from "@/components/generation/FloatingQueue";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Persona options
const personas = [
  { id: "expert", label: "Expert", desc: "Konuyu iyi bilen uzman gibi yazar" },
  { id: "leaked", label: "Leaked", desc: "Perde arkası bilgi paylaşır gibi yazar" },
  { id: "coach", label: "Coach", desc: "Hem öğretir hem motive eder" },
  { id: "news", label: "News", desc: "Tarafsız haber muhabiri gibi yazar" },
  { id: "meme", label: "Meme", desc: "Komik ve viral internet diliyle yazar" },
  { id: "against", label: "Against", desc: "Herkesin tersini savunarak dikkat çeker" },
];

// Tone options
const tones = [
  { id: "casual", label: "Casual", desc: "Arkadaşınla sohbet eder gibi yazar" },
  { id: "unfiltered", label: "Unfiltered", desc: "Aklına geleni filtresiz yazar" },
  { id: "structured", label: "Structured", desc: "Düzenli ve mantıklı bir akışla yazar" },
  { id: "absurd", label: "Absurd", desc: "Beklenmedik ve şaşırtıcı bir dille yazar" },
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
function ChipSelector({ options, value, onChange }) {
  const selected = options.find(o => o.id === value);
  return (
    <div className="space-y-1.5">
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
      {selected?.desc && (
        <p className="text-xs text-muted-foreground">{selected.desc}</p>
      )}
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
                ? "bg-foreground text-background border-foreground"
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

// Tweet Tab Content
function TweetTab({ jobs, onAddJob, onDismissJob }) {
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
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: tweetLengths.find((l) => l.id === length)?.label || length,
    });
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
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
          data-testid="mode-classic"
        >
          Klasik
        </button>
        <button
          type="button"
          onClick={() => setMode("ultra")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1",
            mode === "ultra"
              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
          data-testid="mode-ultra"
        >
          <Zap className="h-4 w-4" />
          ULTRA
        </button>
      </div>

      {/* Main Input */}
      <div className={mode === "ultra" ? "gradient-border-wrapper" : ""}>
        <Textarea
          placeholder={mode === "ultra" ? "ULTRA modunda viral içerik üret..." : "Ne hakkında tweet üreteyim?"}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={cn(
            "min-h-[120px] text-base resize-none pr-16",
            mode !== "ultra" && "border-border"
          )}
          data-testid="tweet-input"
        />
      </div>
      <div className="flex justify-end -mt-8 mr-3 relative z-10">
        <span className="text-sm text-muted-foreground bg-card px-1">
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

// Quote Tab Content
function QuoteTab({ jobs, onAddJob, onDismissJob }) {
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

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const handleFetch = () => {
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setTweetContent("Bu örnek bir tweet içeriğidir. Gerçek uygulamada tweet URL'den çekilecektir.");
    setFetched(true);
    toast.success("Tweet çekildi!");
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
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: tweetLengths.find((l) => l.id === length)?.label || length,
    });
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

  const hasActiveJob = jobs.some((j) => j.status === "generating");

  const handleFetch = () => {
    if (!tweetUrl.trim()) {
      toast.error("Lütfen bir tweet linki girin");
      return;
    }
    setTweetContent("Bu örnek bir tweet içeriğidir. Gerçek uygulamada tweet URL'den çekilecektir.");
    setFetched(true);
    toast.success("Tweet çekildi!");
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
      language,
      additionalContext: showContext ? additionalContext : null,
      personaLabel: personas.find((p) => p.id === persona)?.label || persona,
      toneLabel: tones.find((t) => t.id === tone)?.label || tone,
      lengthLabel: replyLengths.find((l) => l.id === length)?.label || length,
    });
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
      persona: "expert",
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

// Job ID counter
let jobIdCounter = 0;

// Main X AI Module Component
export default function XAIModule() {
  const [jobs, setJobs] = useState([]);
  const { getAccessToken } = useAuth();

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
            language: params.language,
            additional_context: params.additionalContext,
          };
        } else if (params.type === "quote") {
          body = {
            tweet_url: params.tweetUrl,
            tweet_content: params.tweetContent,
            length: params.length,
            variants: params.variants,
            persona: params.persona,
            tone: params.tone,
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

        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post(endpoint, body, { headers });

        if (response.data.success) {
          updateJob(jobId, {
            status: "completed",
            variants: response.data.variants,
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
    [updateJob, getAccessToken]
  );

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
              <TweetTab jobs={jobs.filter(j => j.type === "tweet")} onAddJob={addJob} onDismissJob={dismissJob} />
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
