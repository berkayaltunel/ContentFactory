/**
 * StyleTransferMode — "Tarzını Kopyala" modu
 * XAIModule içinde activePlatform === "style-transfer" olduğunda render edilir.
 * Self-contained: kendi state'i, kendi API call'ları, kendi UI.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  ChevronDown,
  Search,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
  Type,
  User,
  ExternalLink,
  Plus,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";
import GenerationCard from "@/components/generation/GenerationCard";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fmt = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const isTwitterUrl = (text) => /(?:x|twitter)\.com\/.+\/status\/\d+/.test(text);

// ─────────────────────────────────────────────
// PROFILE SELECTOR
// ─────────────────────────────────────────────

function ProfileSelector({ profiles, selected, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedProfile = profiles.find((p) => p.id === selected);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          background: open ? "rgba(139, 92, 246, 0.08)" : "var(--m-surface)",
          border: open
            ? "1.5px solid rgba(139, 92, 246, 0.4)"
            : "1.5px solid var(--m-border-light)",
          borderRadius: "14px",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          fontFamily: "inherit",
        }}
      >
        {selectedProfile ? (
          <>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selectedProfile.avatar_url ? (
                <img
                  src={selectedProfile.avatar_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = `<span style="color:white;font-size:16px;font-weight:600">${(selectedProfile.display_name || selectedProfile.name || "?")[0]}</span>`;
                  }}
                />
              ) : (
                <span style={{ color: "white", fontSize: "16px", fontWeight: "600" }}>
                  {(selectedProfile.display_name || selectedProfile.name || "?")[0]}
                </span>
              )}
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--m-text)",
                  lineHeight: "1.3",
                }}
              >
                {selectedProfile.display_name || selectedProfile.name}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--m-text-muted)",
                  marginTop: "1px",
                }}
              >
                @{selectedProfile.username} · {selectedProfile.tweet_count} tweet analiz edildi
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--m-border-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <User size={18} style={{ color: "var(--m-text-faint)" }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--m-text-muted)",
                }}
              >
                Kimin tarzında yazılsın?
              </div>
            </div>
          </>
        )}
        <ChevronDown
          size={18}
          style={{
            color: "var(--m-text-muted)",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--m-surface)",
            border: "1.5px solid var(--m-border-light)",
            borderRadius: "14px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            zIndex: 50,
            overflow: "hidden",
            animation: "slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Search */}
          {profiles.length > 3 && (
            <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid var(--m-border-light)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "var(--m-input-bg)",
                  borderRadius: "10px",
                  border: "1px solid var(--m-border-light)",
                }}
              >
                <Search size={14} style={{ color: "var(--m-text-faint)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Profil ara..."
                  autoFocus
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--m-text)",
                    fontSize: "13px",
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          )}

          {/* Profile List */}
          <div
            style={{
              maxHeight: "260px",
              overflowY: "auto",
              padding: "6px",
            }}
          >
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--m-text-muted)", fontSize: "13px" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite", marginBottom: "6px" }} />
                <div>Profiller yükleniyor...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--m-text-muted)", fontSize: "13px" }}>
                {profiles.length === 0 ? "Henüz stil profili yok" : "Sonuç bulunamadı"}
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    background: selected === p.id ? "rgba(139, 92, 246, 0.1)" : "transparent",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (selected !== p.id) e.currentTarget.style.background = "var(--m-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = selected === p.id ? "rgba(139, 92, 246, 0.1)" : "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ color: "white", fontSize: "14px", fontWeight: "600" }}>
                        {(p.display_name || p.name || "?")[0]}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--m-text)" }}>
                      {p.display_name || p.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--m-text-muted)" }}>
                      @{p.username} · {p.tweet_count} tweet
                    </div>
                  </div>
                  {selected === p.id && (
                    <Check size={16} style={{ color: "#8b5cf6", flexShrink: 0 }} />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add New */}
          <div style={{ borderTop: "1px solid var(--m-border-light)", padding: "6px" }}>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/style-lab");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "#8b5cf6",
                fontSize: "13px",
                fontWeight: "500",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139, 92, 246, 0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Plus size={16} />
              <span>Yeni Profil Oluştur</span>
              <ExternalLink size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SOURCE TWEET PREVIEW
// ─────────────────────────────────────────────

function SourceTweetPreview({ tweet, onClear }) {
  return (
    <div
      style={{
        background: "rgba(139, 92, 246, 0.04)",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        borderRadius: "12px",
        padding: "14px 16px",
        position: "relative",
        animation: "fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Clear button */}
      <button
        onClick={onClear}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "var(--m-border-light)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--m-text-muted)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#ef4444";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--m-border-light)";
          e.currentTarget.style.color = "var(--m-text-muted)";
        }}
      >
        <X size={12} />
      </button>

      <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
        {/* Author avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--m-border-light)",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={`https://unavatar.io/x/${tweet.author_username}`}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.innerHTML = `<span style="color:var(--m-text-muted);font-size:14px;font-weight:600">${(tweet.author_name || "?")[0]}</span>`;
            }}
          />
        </div>

        <div style={{ flex: 1, paddingRight: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--m-text)" }}>
              {tweet.author_name}
            </span>
            <span style={{ fontSize: "12px", color: "var(--m-text-muted)" }}>
              @{tweet.author_username}
            </span>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--m-text-soft)",
              lineHeight: "1.55",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {tweet.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INPUT MODE INDICATOR
// ─────────────────────────────────────────────

function InputModeChip({ isUrl, isFetching }) {
  if (isFetching) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "20px",
          background: "rgba(139, 92, 246, 0.1)",
          fontSize: "11px",
          color: "#8b5cf6",
          fontWeight: "500",
        }}
      >
        <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
        Tweet yükleniyor...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "20px",
        background: isUrl ? "rgba(59, 130, 246, 0.08)" : "rgba(139, 92, 246, 0.06)",
        fontSize: "11px",
        color: isUrl ? "#3b82f6" : "var(--m-text-muted)",
        fontWeight: "500",
        transition: "all 0.2s ease",
      }}
    >
      {isUrl ? (
        <>
          <LinkIcon size={11} />
          Tweet URL algılandı
        </>
      ) : (
        <>
          <Type size={11} />
          Serbest metin
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: StyleTransferMode
// ─────────────────────────────────────────────

let stJobIdCounter = 0;

export default function StyleTransferMode({ onBack, onEvolve }) {
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [fetchedTweet, setFetchedTweet] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef(null);

  // Load profiles
  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await api.get(`${API}/style-transfer/profiles`);
        const p = res.data.profiles || [];
        setProfiles(p);
        if (p.length === 1) setSelectedProfileId(p[0].id);
      } catch (e) {
        toast.error("Profiller yüklenemedi");
      } finally {
        setProfilesLoading(false);
      }
    })();
  }, []);

  // Auto-detect URL & fetch
  const prevInput = useRef("");
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || fetching || fetchedTweet) return;

    // Only auto-fetch if URL was just pasted (not typed char by char)
    if (isTwitterUrl(trimmed) && trimmed.length - prevInput.current.length > 10) {
      handleFetchTweet(trimmed);
    }
    prevInput.current = trimmed;
  }, [inputValue]);

  // Fetch tweet from URL
  const handleFetchTweet = async (url) => {
    if (!url) url = inputValue.trim();
    if (!isTwitterUrl(url)) return;

    setFetching(true);
    try {
      const res = await api.get(`${API}/tweet/fetch`, { params: { url } });
      if (res.data.success) {
        const t = res.data.tweet;
        setFetchedTweet({
          text: t.text,
          author_name: t.author?.name || "",
          author_username: t.author?.username || "",
          url: url,
        });
        setInputValue("");
        toast.success("Tweet yüklendi");
      }
    } catch (e) {
      toast.error("Tweet yüklenemedi");
    } finally {
      setFetching(false);
    }
  };

  // Generate
  const handleGenerate = useCallback(async () => {
    const text = inputValue.trim();
    const sourceText = fetchedTweet?.text || text;

    if (!sourceText) {
      toast.error("Kaynak metin veya tweet URL'si gerekli");
      return;
    }
    if (!selectedProfileId) {
      toast.error("Bir stil profili seç");
      return;
    }

    // If user typed a URL but didn't fetch yet
    if (isTwitterUrl(text) && !fetchedTweet) {
      await handleFetchTweet(text);
      return;
    }

    const jobId = `st-${++stJobIdCounter}`;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    const targetName = profile?.display_name || profile?.name || "";

    const newJob = {
      id: jobId,
      type: "style-transfer",
      status: "generating",
      startedAt: Date.now(),
      topic: fetchedTweet
        ? `@${fetchedTweet.author_username} → ${targetName}`
        : `"${text.slice(0, 40)}${text.length > 40 ? "..." : ""}" → ${targetName}`,
      persona: "ghost",
      personaLabel: targetName,
      toneLabel: "Style Transfer",
      lengthLabel: "",
      variantCount: 3,
      variants: null,
    };

    setJobs((prev) => [newJob, ...prev]);
    setGenerating(true);

    try {
      const body = {
        target_profile_id: selectedProfileId,
        variant_count: 3,
      };
      if (fetchedTweet) {
        body.source_url = fetchedTweet.url;
        body.source_text = fetchedTweet.text;
      } else {
        body.source_text = text;
      }

      const res = await api.post(`${API}/style-transfer`, body);

      if (res.data.success) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "completed",
                  variants: res.data.variants,
                  generationId: res.data.generation_id,
                }
              : j
          )
        );
        toast.success("İçerik oluşturuldu ✨");
      } else {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error" } : j)));
        toast.error("Bir hata oluştu");
      }
    } catch (e) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error" } : j)));
      toast.error(e.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setGenerating(false);
    }
  }, [inputValue, fetchedTweet, selectedProfileId, profiles]);

  // Clear all
  const handleReset = () => {
    setInputValue("");
    setFetchedTweet(null);
    setJobs([]);
  };

  const profile = profiles.find((p) => p.id === selectedProfileId);
  const hasInput = !!(inputValue.trim() || fetchedTweet);
  const canGenerate = hasInput && selectedProfileId && !generating;
  const showUrlHint = isTwitterUrl(inputValue.trim()) && !fetchedTweet;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "680px",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 20px",
            borderRadius: "100px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(168,85,247,0.08))",
            border: "1px solid rgba(139,92,246,0.2)",
            marginBottom: "14px",
          }}
        >
          <Sparkles size={16} style={{ color: "#a78bfa" }} />
          <span
            style={{
              fontSize: "13px",
              fontWeight: "600",
              background: "linear-gradient(135deg, #a78bfa, #c084fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.3px",
            }}
          >
            Tarzını Kopyala
          </span>
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "var(--m-text-muted)",
            maxWidth: "400px",
            margin: "0 auto",
            lineHeight: "1.5",
          }}
        >
          Bir tweet veya metin yapıştır, hedef kişinin tarzıyla yeniden yazsın.
        </p>
      </div>

      {/* ═══ FORM ═══ */}
      <div
        style={{
          background: "var(--m-input-bg)",
          border: "1px solid var(--m-input-border)",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "var(--m-shadow)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          transition: "all 0.3s ease",
        }}
      >
        {/* 1. Profile Selector */}
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--m-text-muted)",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <User size={12} />
            Hedef Stil
          </div>
          <ProfileSelector
            profiles={profiles}
            selected={selectedProfileId}
            onSelect={setSelectedProfileId}
            loading={profilesLoading}
          />
        </div>

        {/* Divider with arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 4px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--m-border-light)" }} />
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: selectedProfileId ? "rgba(139, 92, 246, 0.1)" : "var(--m-border-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
          >
            <ArrowRight
              size={14}
              style={{
                color: selectedProfileId ? "#8b5cf6" : "var(--m-text-faint)",
                transform: "rotate(90deg)",
              }}
            />
          </div>
          <div style={{ flex: 1, height: "1px", background: "var(--m-border-light)" }} />
        </div>

        {/* 2. Source Input */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--m-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <Type size={12} />
              Kaynak
            </div>
            {(inputValue.trim() || fetchedTweet) && (
              <InputModeChip isUrl={showUrlHint} isFetching={fetching} />
            )}
          </div>

          {/* Fetched Tweet Preview */}
          {fetchedTweet && (
            <div style={{ marginBottom: "12px" }}>
              <SourceTweetPreview
                tweet={fetchedTweet}
                onClear={() => setFetchedTweet(null)}
              />
            </div>
          )}

          {/* Textarea */}
          {!fetchedTweet && (
            <div
              style={{
                position: "relative",
              }}
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Tweet URL'si yapıştır veya dönüştürmek istediğin metni yaz..."
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (showUrlHint) handleFetchTweet();
                    else handleGenerate();
                  }
                }}
                disabled={fetching}
                style={{
                  width: "100%",
                  background: "var(--m-surface)",
                  border: "1.5px solid var(--m-border-light)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  color: "var(--m-text)",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  resize: "none",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(139, 92, 246, 0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--m-border-light)")}
              />

              {/* Fetch URL button (if URL detected) */}
              {showUrlHint && !fetching && (
                <button
                  onClick={() => handleFetchTweet()}
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    border: "none",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <LinkIcon size={12} />
                  Tweet Yükle
                </button>
              )}
            </div>
          )}

          {/* After fetched: optional direction */}
          {fetchedTweet && (
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Yönlendirme ekle (opsiyonel): örn. 'daha kısa', 'farklı açıdan'..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              style={{
                width: "100%",
                background: "var(--m-surface)",
                border: "1.5px solid var(--m-border-light)",
                borderRadius: "12px",
                padding: "12px 14px",
                color: "var(--m-text)",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "none",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139, 92, 246, 0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--m-border-light)")}
            />
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            background: canGenerate
              ? "linear-gradient(135deg, #7c3aed, #a855f7)"
              : "var(--m-border-light)",
            color: canGenerate ? "white" : "var(--m-text-faint)",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "inherit",
            cursor: canGenerate ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: canGenerate ? "0 4px 16px rgba(139, 92, 246, 0.3)" : "none",
            transform: "translateY(0)",
          }}
          onMouseEnter={(e) => {
            if (canGenerate) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(139, 92, 246, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = canGenerate ? "0 4px 16px rgba(139, 92, 246, 0.3)" : "none";
          }}
        >
          {generating ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Tarz kopyalanıyor...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Tarzını Kopyala
            </>
          )}
        </button>

        {/* Keyboard shortcut hint */}
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "var(--m-text-faint)",
          }}
        >
          ⌘+Enter ile gönder
        </div>
      </div>

      {/* ═══ RESULTS ═══ */}
      {jobs.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Reset button */}
          {jobs.some((j) => j.status === "completed") && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  background: "var(--m-surface)",
                  border: "1px solid var(--m-border-light)",
                  color: "var(--m-text-muted)",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
                  e.currentTarget.style.color = "#8b5cf6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--m-border-light)";
                  e.currentTarget.style.color = "var(--m-text-muted)";
                }}
              >
                <RotateCcw size={12} />
                Yeni Dönüşüm
              </button>
            </div>
          )}

          {/* Job cards */}
          {jobs.map((job) => (
            <GenerationCard
              key={job.id}
              job={job}
              onEvolve={onEvolve}
            />
          ))}
        </div>
      )}

      {/* ═══ ANIMATION KEYFRAMES ═══ */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
