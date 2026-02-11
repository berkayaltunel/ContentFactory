import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
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
  Settings2,
  X,
  Dna,
  Trash2,
  Brain,
  Loader2,
  Check,
  Heart,
  Target,
  Wand2,
  Copy,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Quote,
  FileText,
  Send,
  Mic,
  Smile,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import GenerationCard from "@/components/generation/GenerationCard";
import FloatingQueue from "@/components/generation/FloatingQueue";
import { useProfile } from "@/contexts/ProfileContext";

// ══════════════════════════════════════════
// DATA: Personas, Tones, Lengths, etc.
// ══════════════════════════════════════════

const personas = [
  { id: "saf", label: "Saf", desc: "Karakter yok, sadece sen" },
  { id: "otorite", label: "Otorite", desc: "Insider perspective, kesin" },
  { id: "insider", label: "Insider", desc: "Exclusive bilgi vibe" },
  { id: "mentalist", label: "Mentalist", desc: "Teknik + motivasyon" },
  { id: "haber", label: "Haber", desc: "Haber formatı" },
];

const tones = [
  { id: "natural", label: "Natural", desc: "Sıfır yapı, doğal akış" },
  { id: "raw", label: "Raw", desc: "Ham düşünce akışı" },
  { id: "polished", label: "Polished", desc: "Thesis→Evidence→Insight" },
  { id: "unhinged", label: "Unhinged", desc: "Shock→Escalate→Twist" },
];

const knowledgeModes = [
  { id: null, label: "Yok", desc: "Ekstra bilgi modu yok" },
  { id: "insider", label: "insider", desc: "Perde arkası bilgi" },
  { id: "contrarian", label: "contrarian", desc: "Herkesin tersini savun" },
  { id: "hidden", label: "hidden", desc: "Gizli, az bilinen bilgi" },
  { id: "expert", label: "expert", desc: "Derin uzmanlık bilgisi" },
];

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

const replyModes = [
  { id: "support", label: "Support", desc: "Katılır ve değer ekler" },
  { id: "challenge", label: "Challenge", desc: "Saygılıca karşı görüş sunar" },
  { id: "question", label: "Question", desc: "Merak edilen bir soru sorar" },
  { id: "expand", label: "Expand", desc: "Konuyu yeni bir boyuta taşır" },
  { id: "joke", label: "Joke", desc: "Esprili ve eğlenceli yanıt verir" },
];

const articleStyles = [
  { id: "raw", label: "Raw", desc: "Kişisel düşüncelerini özgürce paylaşır" },
  { id: "authority", label: "Authority", desc: "Veri ve örneklerle desteklenmiş yazı" },
  { id: "story", label: "Story", desc: "Bir hikaye gibi anlatan yazı" },
  { id: "tutorial", label: "Tutorial", desc: "Adım adım öğreten rehber" },
  { id: "opinion", label: "Opinion", desc: "Net bir fikri savunan yazı" },
];

const languages = [
  { id: "auto", label: "Otomatik" },
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
];

// Content type tabs for quick actions
const contentTypes = [
  { id: "tweet", icon: MessageSquare, label: "Tweet" },
  { id: "quote", icon: Quote, label: "Alıntı" },
  { id: "reply", icon: Repeat2, label: "Yanıt" },
  { id: "thread", icon: FileText, label: "Thread" },
];

const PLATFORM_CONTENT_TYPES = {
  twitter: [
    { id: "tweet", icon: MessageSquare, label: "Tweet" },
    { id: "quote", icon: Quote, label: "Alıntı" },
    { id: "reply", icon: Repeat2, label: "Yanıt" },
    { id: "thread", icon: FileText, label: "Thread" },
  ],
  youtube: [
    { id: "video-script", icon: FileText, label: "Video Script" },
    { id: "title-desc", icon: MessageSquare, label: "Başlık + Açıklama" },
    { id: "shorts-script", icon: Repeat2, label: "Shorts Script" },
  ],
  instagram: [
    { id: "caption", icon: MessageSquare, label: "Caption" },
    { id: "reel-script", icon: FileText, label: "Reel Script" },
    { id: "story", icon: Quote, label: "Story Metni" },
  ],
  tiktok: [
    { id: "hook", icon: Repeat2, label: "Hook" },
    { id: "script", icon: FileText, label: "Script" },
    { id: "caption", icon: MessageSquare, label: "Caption" },
  ],
  linkedin: [
    { id: "post", icon: MessageSquare, label: "Post Yaz" },
    { id: "article", icon: FileText, label: "Makale" },
    { id: "carousel", icon: Quote, label: "Carousel" },
  ],
  blog: [
    { id: "blog-article", icon: FileText, label: "Blog Yazısı" },
    { id: "blog-listicle", icon: MessageSquare, label: "Listicle" },
    { id: "blog-tutorial", icon: Quote, label: "Tutorial" },
  ],
};

const PLATFORM_PLACEHOLDERS = {
  twitter: {
    tweet: "Tweet konusu yaz veya bir fikir paylaş...",
    quote: "Alıntı yapacağın tweet linkini yapıştır...",
    reply: "Reply atacağın tweet linkini yapıştır...",
    thread: "Thread konusu yaz, detaylı bir fikir paylaş...",
  },
  youtube: {
    "video-script": "Video konusunu anlat...",
    "title-desc": "Video içeriğini özetle...",
    "shorts-script": "Shorts için kısa bir fikir yaz...",
  },
  instagram: {
    caption: "Post konusunu yaz...",
    "reel-script": "Reel fikri veya konusu...",
    story: "Story metni için konu...",
  },
  tiktok: {
    hook: "Dikkat çekici bir konu yaz...",
    script: "TikTok videosu için konu...",
    caption: "Video açıklaması için konu...",
  },
  linkedin: {
    post: "LinkedIn post konusu yaz...",
    article: "Makale konusu yaz...",
    carousel: "Carousel konusu yaz...",
  },
  blog: {
    article: "Blog yazısı konusu...",
    listicle: "Liste yazısı konusu...",
    tutorial: "Tutorial konusu...",
  },
};

const PLATFORM_HEADINGS = {
  twitter: "Timeline seni hatırlasın, sadece scroll'lamasın.",
  youtube: "İzleyici \"abone ol\"a kendi uzanacak.",
  instagram: "Scroll'u durduran sen ol.",
  tiktok: "1 saniye. Ya hook'larsın ya kaybolursun.",
  linkedin: "Bağlantıların seni okusun, sadece kabul etmesin.",
  blog: "Okuyanın hayatında bir şey değişsin.",
};

// ══════════════════════════════════════════
// SVG Icons (Manus-style)
// ══════════════════════════════════════════

const TypeHypeLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// ══════════════════════════════════════════
// SETTINGS POPUP
// ══════════════════════════════════════════

// LinkedIn ayarları
const linkedinPersonas = [
  { id: "thought_leader", label: "Vizyon Lideri", desc: "Sektörün geleceğini gören, trendleri yorumlayan" },
  { id: "storyteller", label: "Hikayeci", desc: "İş deneyimlerini hikayeye dönüştüren" },
  { id: "data_driven", label: "Veri Odaklı", desc: "Rakamlarla konuşan, analitik düşünen" },
  { id: "motivator", label: "Motivatör", desc: "Kariyer ve iş hayatında motive eden mentor" },
];
const linkedinFormats = [
  { id: "standard", label: "Standart", desc: "Klasik LinkedIn post formatı" },
  { id: "listicle", label: "Liste", desc: "Numaralı/madde işaretli format" },
  { id: "story", label: "Hikaye", desc: "Kişisel deneyim anlatısı" },
  { id: "carousel_text", label: "Carousel", desc: "Slide bazlı metin formatı" },
  { id: "poll", label: "Anket", desc: "Tartışma başlatıcı soru formatı" },
  { id: "micro", label: "Kısa", desc: "2-3 cümlelik kısa post" },
];

// Blog ayarları
const blogStyles = [
  { id: "informative", label: "Bilgilendirici", desc: "Eğitici, net, araştırmaya dayalı" },
  { id: "personal", label: "Kişisel", desc: "Kişisel deneyim ve bakış açısı" },
  { id: "technical", label: "Teknik", desc: "How-to, adım adım rehber" },
  { id: "opinion", label: "Fikir Yazısı", desc: "Güçlü görüş ve argüman" },
  { id: "listicle", label: "Listicle", desc: "N tane madde formatı" },
  { id: "case_study", label: "Case Study", desc: "Gerçek örnek analizi" },
];
const blogFrameworks = [
  { id: "answer_first", label: "Answer-First", desc: "Sonuçla başla, detay sonra" },
  { id: "pas", label: "PAS", desc: "Problem → Ajite → Çözüm" },
  { id: "aida", label: "AIDA", desc: "Dikkat → İlgi → İstek → Aksiyon" },
  { id: "storytelling", label: "Storytelling", desc: "Hikaye anlatım yapısı" },
];
const blogLevels = [
  { id: "quick", label: "Quick Take", desc: "500-800 kelime" },
  { id: "standard", label: "Standard", desc: "1000-1500 kelime" },
  { id: "deep_dive", label: "Deep Dive", desc: "2000-3000 kelime" },
  { id: "ultimate", label: "Ultimate", desc: "3000+ kelime rehber" },
];

function SettingsPopup({ open, onClose, settings, onSettingsChange, activeTab, activePlatform }) {
  if (!open) return null;

  const currentLengths = activeTab === "reply" ? replyLengths : 
                         activeTab === "article" ? articleLengths : tweetLengths;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Popup */}
      <div 
        style={{
          position: "relative",
          zIndex: 50,
          width: "100%",
          marginTop: "8px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--m-popup-bg)",
            border: "1px solid var(--m-border)",
            borderRadius: "16px",
            padding: "14px 16px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--m-text)" }}>
              Üretim Ayarları
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--m-text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Persona */}
          <div className="mb-2.5">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Karakter
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSettingsChange({ ...settings, persona: p.id })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: settings.persona === p.id ? "none" : "1px solid var(--m-border)",
                    background: settings.persona === p.id ? "var(--m-pill-active-bg)" : "transparent",
                    color: settings.persona === p.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {personas.find((p) => p.id === settings.persona)?.desc && (
              <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                {personas.find((p) => p.id === settings.persona).desc}
              </p>
            )}
          </div>

          {/* Tone */}
          <div className="mb-2">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Ton
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSettingsChange({ ...settings, tone: t.id })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: settings.tone === t.id ? "none" : "1px solid var(--m-border)",
                    background: settings.tone === t.id ? "var(--m-pill-active-bg)" : "transparent",
                    color: settings.tone === t.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tones.find((t) => t.id === settings.tone)?.desc && (
              <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                {tones.find((t) => t.id === settings.tone).desc}
              </p>
            )}
          </div>

          {/* Length */}
          <div className="mb-2">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Uzunluk
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {currentLengths.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSettingsChange({ ...settings, length: l.id })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: settings.length === l.id ? "none" : "1px solid var(--m-border)",
                    background: settings.length === l.id ? "var(--m-pill-active-bg)" : "transparent",
                    color: settings.length === l.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {l.label} <span style={{ opacity: 0.5, marginLeft: "4px" }}>{l.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Knowledge */}
          <div className="mb-2">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Knowledge Mode
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {knowledgeModes.map((k) => (
                <button
                  key={k.id || "none"}
                  onClick={() => onSettingsChange({ ...settings, knowledge: k.id })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: settings.knowledge === k.id ? "none" : "1px solid var(--m-border)",
                    background: settings.knowledge === k.id ? "var(--m-pill-active-bg)" : "transparent",
                    color: settings.knowledge === k.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {knowledgeModes.find((k) => k.id === settings.knowledge)?.desc && settings.knowledge && (
              <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                {knowledgeModes.find((k) => k.id === settings.knowledge).desc}
              </p>
            )}
          </div>

          {/* Language */}
          <div className="mb-2">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Dil
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {languages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSettingsChange({ ...settings, language: l.id })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: settings.language === l.id ? "none" : "1px solid var(--m-border)",
                    background: settings.language === l.id ? "var(--m-pill-active-bg)" : "transparent",
                    color: settings.language === l.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* LinkedIn-specific settings */}
          {activePlatform === "linkedin" && (
            <>
              <div className="mb-2.5">
                <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                  LinkedIn Persona
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {linkedinPersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSettingsChange({ ...settings, linkedinPersona: p.id })}
                      style={{
                        padding: "6px 14px", borderRadius: "999px",
                        border: settings.linkedinPersona === p.id ? "none" : "1px solid var(--m-border)",
                        background: settings.linkedinPersona === p.id ? "var(--m-pill-active-bg)" : "transparent",
                        color: settings.linkedinPersona === p.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                        fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >{p.label}</button>
                  ))}
                </div>
                {linkedinPersonas.find((p) => p.id === settings.linkedinPersona)?.desc && (
                  <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                    {linkedinPersonas.find((p) => p.id === settings.linkedinPersona).desc}
                  </p>
                )}
              </div>
              <div className="mb-2.5">
                <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                  Format
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {linkedinFormats.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onSettingsChange({ ...settings, linkedinFormat: f.id })}
                      style={{
                        padding: "6px 14px", borderRadius: "999px",
                        border: settings.linkedinFormat === f.id ? "none" : "1px solid var(--m-border)",
                        background: settings.linkedinFormat === f.id ? "var(--m-pill-active-bg)" : "transparent",
                        color: settings.linkedinFormat === f.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                        fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >{f.label}</button>
                  ))}
                </div>
                {linkedinFormats.find((f) => f.id === settings.linkedinFormat)?.desc && (
                  <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                    {linkedinFormats.find((f) => f.id === settings.linkedinFormat).desc}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Blog-specific settings */}
          {activePlatform === "blog" && (
            <>
              <div className="mb-2.5">
                <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                  Yazı Stili
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {blogStyles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSettingsChange({ ...settings, blogStyle: s.id })}
                      style={{
                        padding: "6px 14px", borderRadius: "999px",
                        border: settings.blogStyle === s.id ? "none" : "1px solid var(--m-border)",
                        background: settings.blogStyle === s.id ? "var(--m-pill-active-bg)" : "transparent",
                        color: settings.blogStyle === s.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                        fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >{s.label}</button>
                  ))}
                </div>
                {blogStyles.find((s) => s.id === settings.blogStyle)?.desc && (
                  <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                    {blogStyles.find((s) => s.id === settings.blogStyle).desc}
                  </p>
                )}
              </div>
              <div className="mb-2.5">
                <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                  Framework
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {blogFrameworks.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onSettingsChange({ ...settings, blogFramework: f.id })}
                      style={{
                        padding: "6px 14px", borderRadius: "999px",
                        border: settings.blogFramework === f.id ? "none" : "1px solid var(--m-border)",
                        background: settings.blogFramework === f.id ? "var(--m-pill-active-bg)" : "transparent",
                        color: settings.blogFramework === f.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                        fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >{f.label}</button>
                  ))}
                </div>
                {blogFrameworks.find((f) => f.id === settings.blogFramework)?.desc && (
                  <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                    {blogFrameworks.find((f) => f.id === settings.blogFramework).desc}
                  </p>
                )}
              </div>
              <div className="mb-2.5">
                <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                  İçerik Seviyesi
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {blogLevels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => onSettingsChange({ ...settings, blogLevel: l.id })}
                      style={{
                        padding: "6px 14px", borderRadius: "999px",
                        border: settings.blogLevel === l.id ? "none" : "1px solid var(--m-border)",
                        background: settings.blogLevel === l.id ? "var(--m-pill-active-bg)" : "transparent",
                        color: settings.blogLevel === l.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                        fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >{l.label}</button>
                  ))}
                </div>
                {blogLevels.find((l) => l.id === settings.blogLevel)?.desc && (
                  <p style={{ fontSize: "11px", color: "var(--m-text-faint)", marginTop: "4px" }}>
                    {blogLevels.find((l) => l.id === settings.blogLevel).desc}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Variant Count */}
          <div className="mb-2">
            <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
              Varyant Sayısı
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => onSettingsChange({ ...settings, variants: Math.max(1, settings.variants - 1) })}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1px solid var(--m-border)",
                  background: "transparent",
                  color: "var(--m-text-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontSize: "18px", fontWeight: "600", color: "var(--m-text)", width: "24px", textAlign: "center" }}>
                {settings.variants}
              </span>
              <button
                onClick={() => onSettingsChange({ ...settings, variants: Math.min(5, settings.variants + 1) })}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1px solid var(--m-border)",
                  background: "transparent",
                  color: "var(--m-text-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Reply-specific: Reply Mode */}
          {activeTab === "reply" && (
            <div className="mb-2 mt-2">
              <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                Reply Modu
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {replyModes.map((rm) => (
                  <button
                    key={rm.id}
                    onClick={() => onSettingsChange({ ...settings, replyMode: rm.id })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: settings.replyMode === rm.id ? "none" : "1px solid var(--m-border)",
                      background: settings.replyMode === rm.id ? "var(--m-pill-active-bg)" : "transparent",
                      color: settings.replyMode === rm.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {rm.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article-specific: Style */}
          {activeTab === "article" && (
            <div className="mb-2 mt-2">
              <label style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "4px", display: "block" }}>
                Makale Stili
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {articleStyles.map((as) => (
                  <button
                    key={as.id}
                    onClick={() => onSettingsChange({ ...settings, articleStyle: as.id })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: settings.articleStyle === as.id ? "none" : "1px solid var(--m-border)",
                      background: settings.articleStyle === as.id ? "var(--m-pill-active-bg)" : "transparent",
                      color: settings.articleStyle === as.id ? "var(--m-pill-active-text)" : "var(--m-text-soft)",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {as.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// ONBOARDING TIP (Accordion)
// ══════════════════════════════════════════

function OnboardingTip({ isLoaded }) {
  const [open, setOpen] = useState(false);
  const genCount = parseInt(localStorage.getItem("typehype-gen-count") || "0", 10);
  if (genCount >= 50) return null;

  const steps = [
    { emoji: "🔍", text: "Beğendiğin bir hesap bul (alanında ses getiren biri)" },
    { emoji: "🧬", text: "Style Lab'a ekle, Hype yazım stilini analiz etsin" },
    { emoji: "✍️", text: "O stilde, senin konularında içerik üret" },
    { emoji: "🚀", text: "Paylaş, büyü, takipçi kazan" },
    { emoji: "📊", text: "20-30 paylaşımdan sonra kendi hesabını ekle" },
    { emoji: "🎯", text: "Artık Hype SENİN stilini biliyor" },
  ];

  return (
    <div
      style={{
        maxWidth: "680px",
        width: "100%",
        marginBottom: "16px",
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: open ? "10px 10px 0 0" : "10px",
          transition: "border-radius 0.2s ease",
          background: "rgba(234, 179, 8, 0.05)",
          border: "1px solid rgba(234, 179, 8, 0.12)",
          borderBottom: open ? "none" : "1px solid rgba(234, 179, 8, 0.12)",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <Lightbulb size={14} style={{ color: "rgba(234, 179, 8, 0.5)", flexShrink: 0 }} />
        <span style={{ fontSize: "12px", color: "var(--m-text-muted)", flex: 1 }}>
          Henüz stilin yok mu? Birinin stilini çal, içerik üretmeye başla.
        </span>
        {open ? <ChevronUp size={14} style={{ color: "var(--m-text-faint)", flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: "var(--m-text-faint)", flexShrink: 0 }} />}
      </button>

      {/* Expanded Content */}
      <div
        style={{
          maxHeight: open ? "400px" : "0",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "0 0 10px 10px",
            background: "rgba(234, 179, 8, 0.03)",
            border: "1px solid rgba(234, 179, 8, 0.12)",
            borderTop: "none",
          }}
        >
          <p style={{ fontSize: "12px", color: "var(--m-text-muted)", marginBottom: "12px", lineHeight: "1.5" }}>
            Hype, beğendiğin hesapların yazım DNA'sını çözüyor. Yeni hesapta yeterli veri yok ama çözüm basit:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <span style={{ fontSize: "12px", flexShrink: 0, width: "20px" }}>{step.emoji}</span>
                <span style={{ fontSize: "12px", color: "var(--m-text-muted)" }}>{step.text}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "11px", color: "var(--m-text-faint)", fontStyle: "italic" }}>
            Kısaca: önce başkasının silahıyla savaş, sonra kendininkini yap.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// STYLE PROFILE BADGE (compact inline)
// ══════════════════════════════════════════

function StyleProfileBadge() {
  const { profiles, activeProfile, activeProfileId, setActiveProfile, refreshProfiles } = useProfile();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  if (!profiles || profiles.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          borderRadius: "999px",
          border: activeProfile ? "1px solid var(--m-purple-border)" : "1px solid var(--m-border)",
          background: activeProfile ? "var(--m-purple-soft)" : "transparent",
          color: activeProfile ? "var(--m-purple)" : "var(--m-text-muted)",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
      >
        {activeProfile?.twitter_usernames?.[0] ? (
          <img
            src={`https://unavatar.io/x/${activeProfile.twitter_usernames[0]}`}
            alt=""
            style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <Dna size={14} />
        )}
        {activeProfile ? activeProfile.name.split(" ")[0] : "Stil"}
        <ChevronDown size={12} style={{ opacity: 0.5 }} />
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "0",
            background: "var(--m-popup-bg)",
            border: "1px solid var(--m-border)",
            borderRadius: "12px",
            padding: "8px",
            minWidth: "220px",
            backdropFilter: "blur(20px)",
            zIndex: 100,
            boxShadow: "var(--m-shadow)",
          }}
        >
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => { setActiveProfile(profile.id); setShowDropdown(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: profile.id === activeProfileId ? "var(--m-purple-soft)" : "transparent",
                color: profile.id === activeProfileId ? "var(--m-purple)" : "var(--m-text-soft)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left",
              }}
            >
              {profile.twitter_usernames?.[0] ? (
                <img
                  src={`https://unavatar.io/x/${profile.twitter_usernames[0]}`}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.style.display = "none"; }}
                />
              ) : (
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--m-text)" }}>
                    {profile.name?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                </div>
              )}
              <span style={{ flex: 1 }}>{profile.name}</span>
              {profile.id === activeProfileId && <Check size={14} />}
            </button>
          ))}

          <div style={{ borderTop: "1px solid var(--m-border-light)", margin: "4px 0", paddingTop: "4px" }}>
            <button
              onClick={() => { setActiveProfile(null); setShowDropdown(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "var(--m-text-muted)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <X size={14} />
              <span>Stil kapalı</span>
            </button>
            <button
              onClick={() => { navigate("/dashboard/style-lab"); setShowDropdown(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "var(--m-purple)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <Dna size={14} />
              <span>Style Lab</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// AI ANALYSIS DIALOG (preserved from original)
// ══════════════════════════════════════════

function AIAnalysisDialog({ open, onOpenChange, profileData }) {
  const [copied, setCopied] = useState(false);
  if (!profileData) return null;
  const fp = profileData.style_fingerprint || {};
  const aiAnalysis = fp.ai_analysis || "";
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
        sections.push({
          title: part.substring(0, titleEnd).replace(/\*\*/g, "").trim(),
          content: part.substring(titleEnd + 2).replace(/^\s*:\s*/, "").trim(),
        });
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
            {[
              { val: fp.tweet_count || 0, label: "Tweet", color: "sky" },
              { val: fp.avg_length || 0, label: "Ort. Karakter", color: "pink" },
              { val: fp.avg_engagement?.likes?.toFixed(0) || 0, label: "Ort. Beğeni", color: "green" },
              { val: fp.emoji_usage?.toFixed(1) || 0, label: "Emoji/Tweet", color: "purple" },
            ].map(({ val, label, color }) => (
              <div key={label} className={`p-3 rounded-xl bg-gradient-to-br from-${color}-500/10 to-${color}-500/10 border border-${color}-500/20 text-center`}>
                <p className={`text-2xl font-bold text-${color}-400`}>{val}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          {sections.length > 0 && (
            <div className="space-y-3">
              {sections.map((section, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
                  {section.title && <h5 className="font-medium text-purple-300 mb-2">{section.title}</h5>}
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          )}
          {stylePrompt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-pink-400" /> Stil Prompt
                </h4>
                <Button variant="ghost" size="sm" onClick={handleCopyPrompt} className="h-8 text-xs">
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                {stylePrompt}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════
// TWEET PREVIEW CARD
// ══════════════════════════════════════════

function TweetPreviewCard({ tweet }) {
  if (!tweet) return null;
  const fmt = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  return (
    <div style={{
      background: "var(--m-surface)",
      border: "1px solid var(--m-border-light)",
      borderRadius: "12px",
      padding: "14px 16px",
      marginBottom: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
        {tweet.author?.avatar && (
          <img src={tweet.author.avatar.replace("_normal", "_bigger")} alt="" 
            style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--m-text)" }}>{tweet.author?.name}</span>
            <span style={{ fontSize: "12px", color: "var(--m-text-muted)" }}>@{tweet.author?.username}</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--m-text-soft)", marginTop: "4px", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
            {tweet.text}
          </p>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: "var(--m-text-faint)" }}>
            <span>💬 {fmt(tweet.metrics?.replies)}</span>
            <span>🔁 {fmt(tweet.metrics?.retweets)}</span>
            <span>❤️ {fmt(tweet.metrics?.likes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// PROMO CARDS (Manus-style bottom carousel)
// ══════════════════════════════════════════

const promoCards = [
  {
    title: "Stil Klonlama",
    desc: "Beğendiğin hesabın yazım stilini klonla ve o tarzda içerik üret.",
    type: "style",
  },
  {
    title: "Ultra Mode",
    desc: "Viral potansiyeli en yüksek içerikler için ⚡ Ultra modunu dene.",
    type: "ultra",
  },
  {
    title: "Thread Gücü",
    desc: "Tek tweet yetmiyorsa, 3-7 tweet'lik thread'ler oluştur.",
    type: "thread",
  },
];

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════

let jobIdCounter = 0;

export default function XAIModule() {
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState("tweet");
  const [activePlatform, setActivePlatform] = useState("twitter");
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetData, setTweetData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetchPhase, setFetchPhase] = useState("link"); // "link" | "prompt"
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const { activeProfileId, activeProfile } = useProfile();

  const [settings, setSettings] = useState({
    mode: "classic",
    persona: "otorite",
    tone: "natural",
    length: "punch",
    knowledge: null,
    language: "auto",
    variants: 3,
    replyMode: "support",
    articleStyle: "authority",
    // LinkedIn-specific
    linkedinPersona: "thought_leader",
    linkedinFormat: "standard",
    // Blog-specific
    blogStyle: "informative",
    blogFramework: "answer_first",
    blogLevel: "standard",
  });

  // Initialize from URL params
  useEffect(() => {
    const topic = searchParams.get("topic") || "";
    const context = searchParams.get("trend_context") || "";
    const platformParam = searchParams.get("platform");
    const styleParam = searchParams.get("style");
    if (topic) setInputValue(topic);
    if (context) setInputValue((prev) => prev ? `${prev}\n\n${context}` : context);
    if (platformParam && ["twitter","youtube","instagram","tiktok","linkedin","blog"].includes(platformParam)) {
      setActivePlatform(platformParam);
    }
    if (styleParam) {
      setSelectedStyleProfile(styleParam);
      setUseStyleProfile(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % promoCards.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch generation history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`${API}/generations/history`, { params: { limit: 20 } });
      setHistory(res.data || []);
    } catch (e) {
      // silent fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Refresh history after generation completes
  useEffect(() => {
    if (jobs.some((j) => j.status === "completed")) {
      fetchHistory();
    }
  }, [jobs, fetchHistory]);

  const handleTextareaInput = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  };

  // Fetch tweet for quote/reply
  const handleFetchTweet = async () => {
    const url = inputValue.trim();
    if (!url.match(/x\.com|twitter\.com/)) {
      toast.error("Tweet linki girin");
      return;
    }
    setFetching(true);
    try {
      const response = await api.get(`${API}/tweet/fetch`, { params: { url } });
      if (response.data.success) {
        setTweetData(response.data.tweet);
        setTweetUrl(url);
        setFetched(true);
        setFetchPhase("prompt");
        setInputValue("");
        toast.success("Tweet çekildi! Şimdi yorumunu yaz veya direkt gönder.");
      } else {
        toast.error("Tweet çekilemedi");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Tweet çekilemedi");
    } finally {
      setFetching(false);
    }
  };

  // Image handling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
      setImageUrl(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const updateJob = useCallback((jobId, updates) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j)));
  }, []);

  const dismissJob = useCallback((jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  // GENERATE
  const handleGenerate = useCallback(async () => {
    const input = inputValue.trim();
    if (!input && activeTab !== "quote" && activeTab !== "reply") {
      toast.error("Bir şeyler yaz");
      return;
    }

    // For quote/reply, need fetched tweet
    if ((activeTab === "quote" || activeTab === "reply") && !fetched && fetchPhase === "link") {
      // Try to fetch first
      if (input.match(/x\.com|twitter\.com/)) {
        await handleFetchTweet();
        return; // Input will clear, user writes direction then sends
      }
      toast.error("Önce tweet linkini yapıştır");
      return;
    }

    const jobId = `job-${++jobIdCounter}`;
    const type = activeTab === "thread" ? "tweet" : activeTab;
    const newJob = {
      id: jobId,
      type,
      status: "generating",
      startedAt: Date.now(),
      topic: input.slice(0, 60) + (input.length > 60 ? "..." : ""),
      persona: settings.persona,
      personaLabel: personas.find((p) => p.id === settings.persona)?.label,
      toneLabel: tones.find((t) => t.id === settings.tone)?.label,
      lengthLabel: (activeTab === "reply" ? replyLengths : activeTab === "article" ? articleLengths : tweetLengths)
        .find((l) => l.id === settings.length)?.label,
      knowledgeLabel: settings.knowledge ? knowledgeModes.find((k) => k.id === settings.knowledge)?.label : null,
      variantCount: settings.variants,
      variants: null,
    };

    setJobs((prev) => [newJob, ...prev]);
    setGenerating(true);

    try {
      let endpoint, body;

      if (activePlatform === "linkedin") {
        endpoint = `${API}/generate/linkedin`;
        body = {
          topic: input,
          format: settings.linkedinFormat,
          persona: settings.linkedinPersona,
          language: settings.language,
          additional_context: null,
          variants: settings.variants,
        };
      } else if (activePlatform === "blog") {
        endpoint = `${API}/generate/blog/full`;
        body = {
          topic: input,
          style: settings.blogStyle,
          framework: settings.blogFramework,
          level: settings.blogLevel,
          language: settings.language,
          additional_context: null,
        };
      } else if (activePlatform === "instagram") {
        const igEndpoints = {
          "caption": "/generate/instagram/caption",
          "reel-script": "/generate/instagram/reel-script",
          "story": "/generate/instagram/story-ideas",
        };
        endpoint = `${API}${igEndpoints[activeTab] || "/generate/instagram/caption"}`;
        body = { topic: input, language: settings.language, variants: settings.variants, persona: settings.persona, tone: settings.tone };
      } else if (activePlatform === "tiktok") {
        const tkEndpoints = {
          "hook": "/generate/tiktok/script",
          "script": "/generate/tiktok/script",
          "caption": "/generate/tiktok/caption",
        };
        endpoint = `${API}${tkEndpoints[activeTab] || "/generate/tiktok/script"}`;
        body = { topic: input, language: settings.language, variants: settings.variants, persona: settings.persona, tone: settings.tone };
      } else if (activePlatform === "youtube") {
        const ytEndpoints = {
          "video-script": "/generate/youtube/script",
          "title-desc": "/generate/youtube/title-description",
          "shorts-script": "/generate/youtube/shorts-script",
        };
        endpoint = `${API}${ytEndpoints[activeTab] || "/generate/youtube/script"}`;
        body = { topic: input, language: settings.language, variants: settings.variants, persona: settings.persona, tone: settings.tone };
      } else if (type === "tweet") {
        endpoint = `${API}/generate/tweet`;
        body = {
          topic: input,
          mode: settings.mode,
          length: activeTab === "thread" ? "thread" : settings.length,
          variants: settings.variants,
          persona: settings.persona,
          tone: settings.tone,
          knowledge: settings.knowledge,
          language: settings.language,
          additional_context: null,
          style_profile_id: activeProfileId || null,
          image_url: imageUrl || null,
          image_base64: imageBase64 || null,
        };
      } else if (type === "quote") {
        endpoint = `${API}/generate/quote`;
        body = {
          tweet_url: tweetUrl,
          tweet_content: tweetData?.text || "",
          direction: input || null,
          length: settings.length,
          variants: settings.variants,
          persona: settings.persona,
          tone: settings.tone,
          knowledge: settings.knowledge,
          language: settings.language,
          additional_context: null,
        };
      } else if (type === "reply") {
        endpoint = `${API}/generate/reply`;
        body = {
          tweet_url: tweetUrl,
          tweet_content: tweetData?.text || "",
          direction: input || null,
          length: settings.length,
          reply_mode: settings.replyMode,
          variants: settings.variants,
          persona: settings.persona,
          tone: settings.tone,
          knowledge: settings.knowledge,
          language: settings.language,
          additional_context: null,
        };
      } else if (type === "article") {
        endpoint = `${API}/generate/article`;
        body = {
          topic: input,
          title: null,
          length: settings.length,
          style: settings.articleStyle,
          language: settings.language,
          variants: 1,
          persona: "otorite",
          reference_links: [],
          additional_context: null,
        };
      }

      const response = await api.post(endpoint, body);

      if (response.data.success) {
        updateJob(jobId, {
          status: "completed",
          variants: response.data.variants,
          generationId: response.data.generation_id,
        });
        toast.success("İçerik üretildi!");
        // Increment generation counter for onboarding tip
        const gc = parseInt(localStorage.getItem("typehype-gen-count") || "0", 10);
        localStorage.setItem("typehype-gen-count", String(gc + 1));
      } else {
        updateJob(jobId, { status: "error" });
        toast.error(response.data.error || "Üretim başarısız");
      }
    } catch (error) {
      updateJob(jobId, { status: "error" });
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setGenerating(false);
    }
  }, [inputValue, activeTab, settings, fetched, fetchPhase, tweetUrl, tweetData, activeProfileId, imageUrl, imageBase64, updateJob]);

  // Placeholder based on active tab
  const basePlaceholders = PLATFORM_PLACEHOLDERS[activePlatform] || PLATFORM_PLACEHOLDERS.twitter;
  const placeholders = {
    ...basePlaceholders,
    // Override quote/reply placeholders when tweet is fetched
    ...(fetchPhase === "prompt" && {
      quote: "Bu tweet hakkında ne söylemek istersin? (boş bırakabilirsin)",
      reply: "Nasıl bir yanıt vermek istersin? (boş bırakabilirsin)",
    }),
  };

  const needsUrl = activeTab === "quote" || activeTab === "reply";
  const isUrlInput = needsUrl && inputValue.match(/x\.com|twitter\.com/);
  const settingsSummary = activePlatform === "linkedin"
    ? `${linkedinPersonas.find((p) => p.id === settings.linkedinPersona)?.label} · ${linkedinFormats.find((f) => f.id === settings.linkedinFormat)?.label} · ${settings.variants}x`
    : activePlatform === "blog"
    ? `${blogStyles.find((s) => s.id === settings.blogStyle)?.label} · ${blogFrameworks.find((f) => f.id === settings.blogFramework)?.label} · ${blogLevels.find((l) => l.id === settings.blogLevel)?.label}`
    : `${personas.find((p) => p.id === settings.persona)?.label} · ${tones.find((t) => t.id === settings.tone)?.label} · ${settings.variants}x`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--m-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "var(--m-text)",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.35s ease, color 0.35s ease, border-color 0.35s ease",
      }}
    >
      {/* Subtle background grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--m-grain)",
          pointerEvents: "none",
        }}
      />

      {/* Vertical spacer - pushes content toward center */}
      <div style={{ height: "15vh", flexShrink: 0 }} />

      {/* Style Profile Badge (top) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "var(--m-border-light)",
          borderRadius: "999px",
          padding: "6px 4px",
          marginBottom: "32px",
          border: "1px solid var(--m-border-light)",
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(-8px)",
          transition: "all 0.5s ease 0.1s",
        }}
      >
        <StyleProfileBadge />
        <span
          style={{
            width: "1px",
            height: "14px",
            background: "var(--m-border)",
          }}
        />
        <span
          style={{
            fontSize: "13px",
            color: "var(--m-text-muted)",
            padding: "4px 14px",
            letterSpacing: "0.01em",
          }}
        >
          {settingsSummary}
        </span>
      </div>
      {/* Main Heading */}
      <h1
        style={{
          fontSize: "clamp(28px, 5vw, 42px)",
          fontWeight: "400",
          fontFamily: "'Georgia', 'Times New Roman', 'Noto Serif', serif",
          textAlign: "center",
          marginBottom: "36px",
          letterSpacing: "-0.01em",
          lineHeight: "1.25",
          fontStyle: "italic",
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s ease 0.2s",
        }}
      >
        {PLATFORM_HEADINGS[activePlatform] || "Ne yazmak istersin?"}
      </h1>

      {/* Fetched Tweet Preview */}
      {fetched && tweetData && (
        <div style={{ width: "100%", maxWidth: "680px", marginBottom: "12px" }}>
          <TweetPreviewCard tweet={tweetData} />
          <button
            onClick={() => {
              setFetched(false);
              setFetchPhase("link");
              setTweetData(null);
              setTweetUrl("");
              setInputValue("");
            }}
            style={{
              marginTop: "8px",
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px solid var(--m-border)",
              background: "transparent",
              color: "var(--m-text-muted)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            ← Farklı tweet seç
          </button>
        </div>
      )}

      {/* Chat Input Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          marginBottom: "20px",
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s ease 0.3s",
        }}
      >
        {/* Ultra glow wrapper */}
        <div
          className={settings.mode === "apex" ? "ultra-glow-border" : ""}
          style={{
            borderRadius: "18px",
            position: "relative",
          }}
        >
        <div
          style={{
            background: "var(--m-input-bg)",
            border: "1px solid var(--m-input-border)",
            borderRadius: "16px",
            padding: "16px 18px 12px",
            position: "relative",
            boxShadow: "var(--m-shadow)",
            transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
          }}
        >
          {/* Image Preview */}
          {imageUrl && (
            <div style={{ marginBottom: "12px", position: "relative", display: "inline-block" }}>
              <img
                src={imageUrl}
                alt=""
                style={{ maxHeight: "80px", borderRadius: "8px" }}
              />
              <button
                onClick={() => { setImageUrl(null); setImageBase64(null); }}
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "none",
                  color: "var(--m-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaInput}
            placeholder={placeholders[activeTab]}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--m-text)",
              fontSize: "15px",
              lineHeight: "1.55",
              resize: "none",
              fontFamily: "inherit",
              padding: "0",
              marginBottom: "14px",
              caretColor: "var(--m-caret)",
            }}
          />

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Left Icons */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {/* Link (for fetch tweet) */}
              {needsUrl && (
                <button
                  onClick={handleFetchTweet}
                  disabled={fetching}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: fetched ? "1px solid var(--m-green-border)" : "1px solid var(--m-border)",
                    background: fetched ? "var(--m-green-soft)" : "transparent",
                    color: fetched ? "var(--m-green)" : "var(--m-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  title="Tweet çek"
                >
                  {fetching ? <Loader2 size={18} className="animate-spin" /> : <Link size={18} />}
                </button>
              )}

              {/* Ultra Mode Toggle */}
              <button
                onClick={() => setSettings((s) => ({ ...s, mode: s.mode === "apex" ? "classic" : "apex" }))}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: settings.mode === "apex" ? "1px solid rgba(234, 179, 8, 0.4)" : "1px solid var(--m-icon-btn-border)",
                  background: settings.mode === "apex" ? "rgba(234, 179, 8, 0.12)" : "transparent",
                  color: settings.mode === "apex" ? "#eab308" : "var(--m-icon-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: settings.mode === "apex" ? "0 0 12px rgba(234, 179, 8, 0.2)" : "none",
                }}
                title={settings.mode === "apex" ? "Ultra mod aktif" : "Ultra moda geç"}
              >
                <Zap size={18} style={{ fill: settings.mode === "apex" ? "#eab308" : "none" }} />
              </button>

              {/* Settings */}
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid var(--m-icon-btn-border)",
                  background: settingsOpen ? "var(--m-surface-hover)" : "transparent",
                  color: "var(--m-icon-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Ayarlar"
              >
                <Settings2 size={18} />
              </button>
            </div>

            {/* Right: Send Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Send Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: inputValue.trim() || fetched
                    ? "var(--m-send-bg)"
                    : "var(--m-send-bg-idle)",
                  color: inputValue.trim() || fetched
                    ? "var(--m-send-text)"
                    : "var(--m-send-text-idle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: inputValue.trim() || fetched ? "pointer" : "default",
                  transition: "all 0.25s ease",
                }}
              >
                {generating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 2L12 22M12 2L5 9M12 2L19 9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Platform Selection Bar (Manus-style "Connect your tools") */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--m-border-light)",
              paddingTop: "10px",
              marginTop: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-text-faint)" }}>
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span style={{ fontSize: "12px", color: "var(--m-text-faint)", whiteSpace: "nowrap" }}>Platformunu seç</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {[
                { id: "twitter", color: "#000", darkColor: "#fff", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { id: "youtube", color: "#FF0000", darkColor: "#FF0000", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                { id: "instagram", color: "#E4405F", darkColor: "#E4405F", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
                { id: "tiktok", color: "#010101", darkColor: "#fff", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
                { id: "linkedin", color: "#0A66C2", darkColor: "#0A66C2", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { id: "blog", color: "#6366F1", darkColor: "#818CF8", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="14" y2="16"/></svg> },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlatform(p.id);
                    setActiveTab(PLATFORM_CONTENT_TYPES[p.id][0].id);
                    setFetched(false);
                    setFetchPhase("link");
                    setTweetData(null);
                    setTweetUrl("");
                  }}
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    border: activePlatform === p.id ? "2px solid var(--m-text-muted)" : "1.5px solid var(--m-border)",
                    background: "transparent",
                    color: activePlatform === p.id ? p.color : "var(--m-text-faint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: activePlatform === p.id ? 1 : 0.45,
                    transition: "all 0.2s ease",
                    transform: activePlatform === p.id ? "scale(1.1)" : "scale(1)",
                  }}
                  title={p.id}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          </div>

        </div>
        </div>

        {/* Settings Popup - below input */}
        <SettingsPopup
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSettingsChange={setSettings}
          activeTab={activeTab}
          activePlatform={activePlatform}
        />
      </div>

      {/* Quick Action Chips (Content Type Tabs) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "center",
          maxWidth: "680px",
          marginBottom: jobs.length > 0 ? "24px" : "80px",
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s ease 0.45s",
        }}
      >
        {(PLATFORM_CONTENT_TYPES[activePlatform] || PLATFORM_CONTENT_TYPES.twitter).map((ct) => {
          const Icon = ct.icon;
          const isActive = activeTab === ct.id;
          return (
            <button
              key={ct.id}
              onClick={() => {
                setActiveTab(ct.id);
                setFetched(false);
                setFetchPhase("link");
                setTweetData(null);
                setTweetUrl("");
                if (ct.id === "thread") {
                  setSettings((s) => ({ ...s, length: "thread" }));
                } else if (ct.id === "reply") {
                  setSettings((s) => ({ ...s, length: "punch" }));
                } else {
                  setSettings((s) => ({ ...s, length: "punch" }));
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "999px",
                border: isActive
                  ? "1px solid var(--m-text-faint)"
                  : "1px solid var(--m-border)",
                background: isActive ? "var(--m-surface-hover)" : "transparent",
                color: isActive
                  ? "var(--m-text)"
                  : "var(--m-text-soft)",
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
                fontWeight: isActive ? "500" : "400",
              }}
            >
              <Icon size={16} style={{ opacity: isActive ? 0.9 : 0.65 }} />
              {ct.label}
            </button>
          );
        })}
        {/* Makale butonu kaldırıldı */}
      </div>

      {/* Generation Results */}
      {jobs.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "680px",
            marginBottom: "80px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {jobs.map((job) => (
              <GenerationCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Generation History */}
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          marginBottom: "80px",
        }}
      >
        {/* Collapsible Header */}
        <button
          onClick={() => setHistoryOpen((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "12px 0",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--m-text-soft)",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "inherit",
          }}
        >
          {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Geçmiş
          {history.length > 0 && (
            <span style={{ fontSize: "12px", color: "var(--m-text-muted)", fontWeight: "400" }}>
              ({history.length})
            </span>
          )}
        </button>

        {historyOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {historyLoading && history.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--m-text-muted)", fontSize: "13px" }}>
                Yükleniyor...
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--m-text-muted)", fontSize: "13px" }}>
                Henüz üretim geçmişi yok
              </div>
            )}
            {history.map((gen) => {
              const isExpanded = expandedHistoryId === gen.id;
              const variants = gen.variants || [];
              const createdAt = gen.created_at ? new Date(gen.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
              const preview = variants[0]?.content?.slice(0, 100) || gen.topic?.slice(0, 100) || "";

              return (
                <div
                  key={gen.id}
                  style={{
                    background: "var(--m-surface)",
                    border: "1px solid var(--m-border-light)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedHistoryId(isExpanded ? null : gen.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      color: "var(--m-text)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--m-text)" }}>
                          {gen.topic || gen.type || "İçerik"}
                        </span>
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "var(--m-border-light)",
                          color: "var(--m-text-muted)",
                        }}>
                          {variants.length} varyant
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--m-text-muted)" }}>
                        {createdAt}
                        {!isExpanded && preview && (
                          <span style={{ marginLeft: "8px", opacity: 0.7 }}>
                            — {preview}{preview.length >= 100 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={14} style={{ color: "var(--m-text-muted)", flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: "var(--m-text-muted)", flexShrink: 0 }} />}
                  </button>

                  {/* Expanded: show all variants using GenerationCard-style layout */}
                  {isExpanded && variants.length > 0 && (
                    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {variants.map((variant, idx) => (
                        <div
                          key={variant.id || idx}
                          style={{
                            border: "1px solid var(--m-border-light)",
                            borderRadius: "8px",
                            padding: "12px",
                          }}
                        >
                          <p style={{ fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: "1.55", color: "var(--m-text)", marginBottom: "10px" }}>
                            {variant.content}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--m-border-light)", paddingTop: "8px" }}>
                            <span style={{ fontSize: "11px", color: "var(--m-text-muted)" }}>
                              {variant.character_count || variant.content?.length || 0} karakter
                              {variants.length > 1 && ` · Varyant ${idx + 1}`}
                            </span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              {[
                                { icon: "📋", label: "Kopyala", action: () => { navigator.clipboard.writeText(variant.content); toast.success("Kopyalandı!"); } },
                                { icon: "♡", label: "Favori", action: () => { api.post(`${API}/favorites/toggle`, { content: variant.content, type: gen.type || "tweet", generation_id: gen.id, variant_index: idx }).then(() => toast.success("Favori güncellendi")).catch(() => toast.error("Hata")); } },
                                { icon: "📹", label: "Video Script", action: async () => {
                                  try {
                                    toast.info("Video script üretiliyor...");
                                    const res = await api.post(`${API}/repurpose/video-script`, { content: variant.content, duration: "30", platform: "reels" });
                                    if (res.data.success) {
                                      const scriptText = res.data.script.map(s => `[${s.time}] ${s.spoken_text}\n📝 ${s.text_overlay}\n🎬 ${s.visual_note}`).join("\n\n");
                                      const fullText = `🎬 Video Script (30s Reels)\n\n${scriptText}\n\n🎵 Müzik: ${res.data.music_mood}\n#️⃣ ${res.data.hashtags?.join(" ")}`;
                                      navigator.clipboard.writeText(fullText);
                                      toast.success("Video script kopyalandı!");
                                    } else { toast.error(res.data.error || "Hata"); }
                                  } catch { toast.error("Video script üretilemedi"); }
                                }},
                                { icon: "🖼️", label: "Görsel Prompt", action: async () => {
                                  try {
                                    toast.info("Görsel prompt üretiliyor...");
                                    const res = await api.post(`${API}/repurpose/image-prompt`, { content: variant.content, platform: activePlatform || "twitter" });
                                    if (res.data.success) {
                                      navigator.clipboard.writeText(JSON.stringify(res.data.prompt_json, null, 2));
                                      toast.success("Görsel prompt JSON kopyalandı!");
                                    } else { toast.error(res.data.error || "Hata"); }
                                  } catch { toast.error("Görsel prompt üretilemedi"); }
                                }},
                                { icon: "🐦", label: "Tweetle", action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(variant.content)}`, "_blank") },
                              ].map((btn) => (
                                <button
                                  key={btn.label}
                                  onClick={btn.action}
                                  title={btn.label}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--m-border-light)",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    color: "var(--m-text-soft)",
                                    transition: "all 0.15s ease",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {btn.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Queue */}
      <FloatingQueue jobs={jobs} onDismiss={dismissJob} />

      {/* Bottom Promo Card */}
      {/* Promo cards removed - saved for landing page */}
      {false && (
        <div>
          {/* placeholder */}
          <div
            style={{
              background: "var(--m-card-bg)",
              border: "1px solid var(--m-border-light)",
              borderRadius: "14px",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              maxWidth: "440px",
              width: "max-content",
              cursor: "pointer",
              boxShadow: "var(--m-shadow)",
              transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  marginBottom: "5px",
                  color: "var(--m-text)",
                }}
              >
                {promoCards[activeCard].title}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--m-text-muted)",
                  lineHeight: "1.45",
                }}
              >
                {promoCards[activeCard].desc}
              </div>
            </div>
            {/* Mini Preview */}
            <div
              style={{
                width: "90px",
                height: "64px",
                background: "rgba(0,0,0,0.4)",
                borderRadius: "8px",
                border: "1px solid var(--m-border-light)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  height: "14px",
                  background: "var(--m-surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "0 5px",
                }}
              >
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#FEBC2E" }} />
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#28C840" }} />
                <span style={{ marginLeft: "6px", width: "30px", height: "3px", background: "var(--m-border)", borderRadius: "2px" }} />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TypeHypeLogo />
              </div>
            </div>
          </div>

          {/* Carousel Dots */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {promoCards.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveCard(i)}
                style={{
                  width: i === activeCard ? "8px" : "6px",
                  height: i === activeCard ? "8px" : "6px",
                  borderRadius: "50%",
                  border: "none",
                  background: i === activeCard ? "var(--m-text-soft)" : "var(--m-border)",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::placeholder { color: var(--m-text-faint); }
        textarea:focus { outline: none !important; box-shadow: none !important; border-color: transparent !important; ring: none !important; }
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: var(--m-scrollbar); border-radius: 4px; }
        button:hover { filter: brightness(var(--m-hover-brightness)); }
        @media (max-width: 640px) {
          h1 { font-size: 26px !important; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @property --ultra-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes ultra-rotate {
          from { --ultra-angle: 0deg; }
          to { --ultra-angle: 360deg; }
        }
        .ultra-glow-border {
          position: relative;
          background: transparent;
        }
        .ultra-glow-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 18px;
          padding: 2px;
          background: conic-gradient(
            from var(--ultra-angle, 0deg),
            #a855f7,
            #3b82f6,
            #06b6d4,
            #ec4899,
            #ef4444,
            #f97316,
            #a855f7
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ultra-rotate 6s linear infinite;
          pointer-events: none;
        }
        /* glow removed - border only */
      `}</style>
    </div>
  );
}
