/**
 * PersonaFlow — React Flow canvas wrapper for Persona Lab
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { motion } from "framer-motion";
import {
  Loader2, Sparkles, RotateCcw, Plus, Minus, Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

import SourceNode from "./SourceNode";
import PersonaNode from "./PersonaNode";
import OutputNode from "./OutputNode";
import StyleTransferMode from "@/components/generation/StyleTransferMode";

// ─── Custom animated edge (dotted style) ───
function AnimatedEdge(props) {
  const { sourceX, sourceY, targetX, targetY, data } = props;
  const isAnimated = data?.animated;
  const isCompleted = data?.completed;

  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX + 100} ${sourceY}, ${targetX - 100} ${targetY}, ${targetX} ${targetY}`;

  const baseColor = isCompleted
    ? "rgba(139,92,246,0.5)"
    : isAnimated
    ? "rgba(139,92,246,0.35)"
    : "rgba(255,255,255,0.08)";

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke={baseColor}
        strokeWidth={1.5}
        strokeDasharray="4 6"
        strokeLinecap="round"
        style={{ transition: "stroke 0.4s ease" }}
      />
      {isAnimated && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(139,92,246,0.7)"
          strokeWidth={2}
          strokeDasharray="6 14"
          strokeLinecap="round"
          style={{ animation: "flowDash 1s linear infinite" }}
        />
      )}
      {isCompleted && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(139,92,246,0.6)"
          strokeWidth={2.5}
          strokeDasharray="4 6"
          strokeLinecap="round"
          style={{ filter: "blur(4px)", opacity: 0.35 }}
        />
      )}
      {isAnimated && (
        <circle r="3.5" fill="#a78bfa" opacity="0.9">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      <circle cx={sourceX} cy={sourceY} r="4" fill="#18181b" stroke={baseColor} strokeWidth="1.5" />
      <circle cx={targetX} cy={targetY} r="4" fill="#18181b" stroke={baseColor} strokeWidth="1.5" />
    </g>
  );
}

// ─── Node & Edge types (MUST be outside component) ───
const nodeTypes = {
  source: SourceNode,
  persona: PersonaNode,
  output: OutputNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

// ─── Helpers ──────────────────────────────
const isTwitterUrl = (text) => /(?:x|twitter)\.com\/.+\/status\/\d+/.test(text);
let stJobIdCounter = 0;

// ─── Toolbar ──────────────────────────────
function Toolbar() {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(85);

  useEffect(() => {
    const interval = setInterval(() => {
      try { setZoom(Math.round(getZoom() * 100)); } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [getZoom]);

  const btnStyle = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "36px", height: "36px", border: "none", background: "transparent",
    color: "#a1a1aa", cursor: "pointer", transition: "color 0.15s",
  };

  return (
    <>
      {/* Left bottom toolbar */}
      <div style={{
        position: "absolute", bottom: "24px", left: "16px", zIndex: 10,
        display: "flex", alignItems: "center", borderRadius: "12px", overflow: "hidden",
        background: "rgba(24,24,27,0.92)", border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>
        <button style={btnStyle} onClick={() => zoomIn({ duration: 200 })} title="Zoom In">
          <Plus size={15} />
        </button>
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
        <button style={btnStyle} onClick={() => zoomOut({ duration: 200 })} title="Zoom Out">
          <Minus size={15} />
        </button>
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
        <button style={btnStyle} onClick={() => fitView({ padding: 0.2, duration: 400 })} title="Fit View">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Right bottom zoom display */}
      <div style={{
        position: "absolute", bottom: "24px", right: "16px", zIndex: 10,
        padding: "6px 12px", borderRadius: "8px",
        background: "rgba(24,24,27,0.85)", border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)", fontSize: "11px", color: "#71717a", fontWeight: "500",
      }}>
        {zoom}%
      </div>
    </>
  );
}

// ─── Inner Flow ───────────────────────────
function PersonaFlowInner({ preSelectedProfileId, onEvolve }) {
  const { fitView } = useReactFlow();

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(preSelectedProfileId || null);
  const [inputValue, setInputValue] = useState("");
  const [fetchedTweet, setFetchedTweet] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);

  const initialNodes = [
    { id: "source", type: "source", position: { x: 0, y: 0 }, deletable: false, data: { value: "", onChange: () => {}, fetchedTweet: null, onClearTweet: () => {}, onFetchTweet: () => {}, fetching: false } },
    { id: "persona", type: "persona", position: { x: 480, y: 20 }, deletable: false, data: { profiles: [], selected: null, onSelect: () => {}, loading: true, generating: false } },
    { id: "output", type: "output", position: { x: 880, y: -20 }, deletable: false, data: { jobs: [], onEvolve: () => {}, generating: false } },
  ];

  const initialEdges = [
    { id: "e1", source: "source", target: "persona", type: "animated", data: { animated: false, completed: false } },
    { id: "e2", source: "persona", target: "output", type: "animated", data: { animated: false, completed: false } },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const prevInput = useRef("");

  // Load profiles
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`${API}/style-transfer/profiles`);
        const p = res.data.profiles || [];
        setProfiles(p);
        if (p.length === 1 && !preSelectedProfileId) setSelectedProfileId(p[0].id);
      } catch (e) {
        toast.error("Profiller yüklenemedi");
      } finally {
        setProfilesLoading(false);
      }
    })();
  }, []);

  // Fit view on mount
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 300);
    return () => clearTimeout(t);
  }, [fitView]);

  // Auto-detect URL
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || fetching || fetchedTweet) return;
    if (isTwitterUrl(trimmed) && trimmed.length - prevInput.current.length > 10) {
      handleFetchTweet(trimmed);
    }
    prevInput.current = trimmed;
  }, [inputValue]);

  const handleFetchTweet = async (url) => {
    if (!url) url = inputValue.trim();
    if (!isTwitterUrl(url)) return;
    setFetching(true);
    try {
      const res = await api.get(`${API}/tweet/fetch`, { params: { url } });
      if (res.data.success) {
        const t = res.data.tweet;
        setFetchedTweet({ text: t.text, author_name: t.author?.name || "", author_username: t.author?.username || "", url });
        setInputValue("");
        toast.success("Tweet yüklendi");
      }
    } catch (e) { toast.error("Tweet yüklenemedi"); }
    finally { setFetching(false); }
  };

  const handleGenerate = useCallback(async () => {
    const text = inputValue.trim();
    const sourceText = fetchedTweet?.text || text;
    if (!sourceText) { toast.error("Kaynak metin veya tweet URL'si gerekli"); return; }
    if (!selectedProfileId) { toast.error("Bir stil profili seç"); return; }
    if (isTwitterUrl(text) && !fetchedTweet) { await handleFetchTweet(text); return; }

    const jobId = `st-${++stJobIdCounter}`;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    const targetName = profile?.display_name || profile?.name || "";

    const newJob = {
      id: jobId, type: "style-transfer", status: "generating", startedAt: Date.now(),
      topic: fetchedTweet ? `@${fetchedTweet.author_username} → ${targetName}` : `"${text.slice(0, 40)}..." → ${targetName}`,
      persona: "ghost", personaLabel: targetName, toneLabel: "Style Transfer",
      lengthLabel: "", variantCount: 3, variants: null,
    };

    setJobs((prev) => [newJob, ...prev]);
    setGenerating(true);

    try {
      const body = { target_profile_id: selectedProfileId, variant_count: 3 };
      if (fetchedTweet) { body.source_url = fetchedTweet.url; body.source_text = fetchedTweet.text; }
      else { body.source_text = text; }

      const res = await api.post(`${API}/style-transfer`, body);
      if (res.data.success) {
        setJobs((prev) => prev.map((j) =>
          j.id === jobId ? { ...j, status: "completed", variants: res.data.variants, generationId: res.data.generation_id } : j
        ));
        toast.success("Tarz kopyalandı ✨");
        setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 200);
      } else {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error" } : j)));
        toast.error("Bir hata oluştu");
      }
    } catch (e) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error" } : j)));
      toast.error(e.response?.data?.detail || "Bir hata oluştu");
    } finally { setGenerating(false); }
  }, [inputValue, fetchedTweet, selectedProfileId, profiles, fitView]);

  const handleReset = () => { setInputValue(""); setFetchedTweet(null); setJobs([]); };

  const hasSource = !!(inputValue.trim() || fetchedTweet);
  const hasPersona = !!selectedProfileId;
  const hasOutput = jobs.some((j) => j.status === "completed");
  const canGenerate = hasSource && hasPersona && !generating;

  // Sync node data
  useEffect(() => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === "source") {
        return { ...node, data: { value: inputValue, onChange: setInputValue, fetchedTweet, onClearTweet: () => setFetchedTweet(null), onFetchTweet: () => handleFetchTweet(), fetching } };
      }
      if (node.id === "persona") {
        return { ...node, data: { profiles, selected: selectedProfileId, onSelect: setSelectedProfileId, loading: profilesLoading, generating } };
      }
      if (node.id === "output") {
        return { ...node, data: { jobs, onEvolve, generating } };
      }
      return node;
    }));
  }, [inputValue, fetchedTweet, fetching, profiles, selectedProfileId, profilesLoading, generating, jobs]);

  // Sync edge animation
  useEffect(() => {
    setEdges((eds) => eds.map((edge) => {
      if (edge.id === "e1") return { ...edge, data: { animated: generating, completed: hasSource && hasPersona } };
      if (edge.id === "e2") return { ...edge, data: { animated: generating, completed: hasOutput } };
      return edge;
    }));
  }, [generating, hasSource, hasPersona, hasOutput]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={useCallback(() => {}, [])}
        onEdgesDelete={useCallback(() => {}, [])}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDeletable={false}
        edgesDeletable={false}
        connectOnDrop={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#0A0A0A" }}
      >
        <Background variant="dots" gap={20} size={1} color="rgba(255,255,255,0.04)" />
      </ReactFlow>

      <Toolbar />

      {/* Generate / Reset button */}
      <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
        {hasOutput ? (
          <button
            onClick={handleReset}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "12px",
              background: "rgba(24,24,27,0.9)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#a1a1aa", fontSize: "13px", fontWeight: "500",
              cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(12px)",
            }}
          >
            <RotateCcw size={14} />
            Yeni Dönüşüm
          </button>
        ) : (
          <motion.button
            whileHover={canGenerate ? { scale: 1.02, y: -1 } : {}}
            whileTap={canGenerate ? { scale: 0.98 } : {}}
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "12px 32px", borderRadius: "12px", border: "none",
              background: canGenerate ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(24,24,27,0.9)",
              color: canGenerate ? "white" : "#555",
              fontSize: "14px", fontWeight: "600", fontFamily: "inherit",
              cursor: canGenerate ? "pointer" : "not-allowed",
              boxShadow: canGenerate ? "0 4px 24px rgba(139,92,246,0.3)" : "none",
              backdropFilter: "blur(12px)", minWidth: "200px",
            }}
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Kopyalanıyor...</>
            ) : (
              <><Sparkles size={16} /> Tarzını Kopyala</>
            )}
          </motion.button>
        )}
      </div>

      <style>{`
        @keyframes flowDash { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

// ─── Export ───────────────────────────────
export default function PersonaFlow({ preSelectedProfileId, onEvolve }) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (isMobile) {
    return <StyleTransferMode preSelectedProfileId={preSelectedProfileId} onEvolve={onEvolve} />;
  }

  return (
    <ReactFlowProvider>
      <PersonaFlowInner preSelectedProfileId={preSelectedProfileId} onEvolve={onEvolve} />
    </ReactFlowProvider>
  );
}
