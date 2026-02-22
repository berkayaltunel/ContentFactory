/**
 * PersonaFlow — React Flow canvas wrapper for Persona Lab
 * 
 * 3 undeletable nodes: Source → Persona → Output
 * Bezier edges with animated particles during generation
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Loader2, Sparkles, RotateCcw, Plus, Minus, Maximize2, Map,
} from "lucide-react";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

import SourceNode from "./SourceNode";
import PersonaNode from "./PersonaNode";
import OutputNode from "./OutputNode";

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
    <>
      {/* Dotted base path */}
      <path
        d={edgePath}
        fill="none"
        stroke={baseColor}
        strokeWidth={1.5}
        strokeDasharray="4 6"
        strokeLinecap="round"
        style={{ transition: "stroke 0.4s ease" }}
      />
      {/* Animated flowing dash overlay */}
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
      {/* Completed glow */}
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
      {/* Flowing dot particle */}
      {isAnimated && (
        <circle r="3.5" fill="#a78bfa" opacity="0.9">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {/* Handle endpoint circles */}
      <circle cx={sourceX} cy={sourceY} r="4" fill="#18181b" stroke={baseColor} strokeWidth="1.5" />
      <circle cx={targetX} cy={targetY} r="4" fill="#18181b" stroke={baseColor} strokeWidth="1.5" />
    </>
  );
}

// ─── Node types ────────────────────────────
const nodeTypes = {
  source: SourceNode,
  persona: PersonaNode,
  output: OutputNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

// ─── Initial positions ────────────────────
const INITIAL_NODES = [
  {
    id: "source",
    type: "source",
    position: { x: 0, y: 0 },
    deletable: false,
    data: {},
  },
  {
    id: "persona",
    type: "persona",
    position: { x: 480, y: 20 },
    deletable: false,
    data: {},
  },
  {
    id: "output",
    type: "output",
    position: { x: 880, y: -20 },
    deletable: false,
    data: {},
  },
];

const INITIAL_EDGES = [
  {
    id: "e-source-persona",
    source: "source",
    target: "persona",
    type: "animated",
    data: { animated: false, completed: false },
  },
  {
    id: "e-persona-output",
    source: "persona",
    target: "output",
    type: "animated",
    data: { animated: false, completed: false },
  },
];

// ─── Helpers ──────────────────────────────
const isTwitterUrl = (text) => /(?:x|twitter)\.com\/.+\/status\/\d+/.test(text);
let stJobIdCounter = 0;

// ─── Toolbar button ────────────────────────
function ToolbarButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-9 h-9 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
      style={{ border: "none", background: "transparent", fontFamily: "inherit" }}
    >
      {children}
    </button>
  );
}

// ─── Zoom display ─────────────────────────
function ZoomDisplay() {
  const { getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(85);

  useEffect(() => {
    const interval = setInterval(() => {
      try { setZoom(Math.round(getZoom() * 100)); } catch {}
    }, 300);
    return () => clearInterval(interval);
  }, [getZoom]);

  return <span>{zoom}%</span>;
}

// ─── Inner Flow (needs ReactFlowProvider) ──
function PersonaFlowInner({ preSelectedProfileId, onEvolve }) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // State
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(preSelectedProfileId || null);
  const [inputValue, setInputValue] = useState("");
  const [fetchedTweet, setFetchedTweet] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

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

  // Fetch tweet
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
          url,
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
        // Pan to output node
        setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 200);
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
  }, [inputValue, fetchedTweet, selectedProfileId, profiles, fitView]);

  // Reset
  const handleReset = () => {
    setInputValue(""); setFetchedTweet(null); setJobs([]);
  };

  // Derived state
  const hasSource = !!(inputValue.trim() || fetchedTweet);
  const hasPersona = !!selectedProfileId;
  const hasOutput = jobs.some((j) => j.status === "completed");
  const canGenerate = hasSource && hasPersona && !generating;

  // Update node data when state changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === "source") {
          return {
            ...node,
            data: {
              value: inputValue,
              onChange: setInputValue,
              fetchedTweet,
              onClearTweet: () => setFetchedTweet(null),
              onFetchTweet: () => handleFetchTweet(),
              fetching,
            },
          };
        }
        if (node.id === "persona") {
          return {
            ...node,
            data: {
              profiles,
              selected: selectedProfileId,
              onSelect: setSelectedProfileId,
              loading: profilesLoading,
              generating,
            },
          };
        }
        if (node.id === "output") {
          return {
            ...node,
            data: { jobs, onEvolve, generating },
          };
        }
        return node;
      })
    );
  }, [inputValue, fetchedTweet, fetching, profiles, selectedProfileId, profilesLoading, generating, jobs]);

  // Update edge animation
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === "e-source-persona") {
          return { ...edge, data: { animated: generating, completed: hasSource && hasPersona } };
        }
        if (edge.id === "e-persona-output") {
          return { ...edge, data: { animated: generating, completed: hasOutput } };
        }
        return edge;
      })
    );
  }, [generating, hasSource, hasPersona, hasOutput]);

  // Prevent node deletion and edge creation
  const handleNodesDelete = useCallback(() => {}, []);
  const handleEdgesDelete = useCallback(() => {}, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
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
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#0A0A0A" }}
      >
        <Background variant="dots" gap={20} size={1} color="rgba(255,255,255,0.04)" />
      </ReactFlow>

      {/* Custom toolbar — left bottom (referans görseldeki gibi) */}
      <div
        className="absolute bottom-6 left-4 z-10 flex items-center gap-0 rounded-xl overflow-hidden"
        style={{
          background: "rgba(24,24,27,0.92)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <ToolbarButton onClick={() => zoomIn({ duration: 200 })} title="Zoom In">
          <Plus size={15} />
        </ToolbarButton>
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
        <ToolbarButton onClick={() => zoomOut({ duration: 200 })} title="Zoom Out">
          <Minus size={15} />
        </ToolbarButton>
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
        <ToolbarButton onClick={() => fitView({ padding: 0.2, duration: 400 })} title="Fit View">
          <Maximize2 size={14} />
        </ToolbarButton>
      </div>

      {/* Zoom percentage — right bottom */}
      <div
        className="absolute bottom-6 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-zinc-500 font-medium"
        style={{
          background: "rgba(24,24,27,0.85)",
          border: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Map size={11} className="opacity-50" />
        <ZoomDisplay />
      </div>

      {/* Generate / Reset button overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        {hasOutput ? (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-zinc-400 text-[13px] font-medium cursor-pointer font-[inherit] transition-all duration-200 hover:text-violet-400 hover:border-violet-500/30"
            style={{
              background: "rgba(24,24,27,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
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
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl border-none text-[14px] font-semibold font-[inherit] min-w-[200px] transition-all duration-300"
            style={{
              background: canGenerate
                ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                : "rgba(24,24,27,0.9)",
              color: canGenerate ? "white" : "#555",
              cursor: canGenerate ? "pointer" : "not-allowed",
              boxShadow: canGenerate ? "0 4px 24px rgba(139,92,246,0.3)" : "none",
              backdropFilter: "blur(12px)",
            }}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Kopyalanıyor...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Tarzını Kopyala
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes flowDash {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Mobile fallback ──────────────────────
function MobileFallback({ preSelectedProfileId, onEvolve }) {
  // Import existing StyleTransferMode for mobile
  const StyleTransferMode = require("@/components/generation/StyleTransferMode").default;
  return <StyleTransferMode preSelectedProfileId={preSelectedProfileId} onEvolve={onEvolve} />;
}

// ─── Export ───────────────────────────────
export default function PersonaFlow({ preSelectedProfileId, onEvolve }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (isMobile) {
    return <MobileFallback preSelectedProfileId={preSelectedProfileId} onEvolve={onEvolve} />;
  }

  return (
    <ReactFlowProvider>
      <PersonaFlowInner preSelectedProfileId={preSelectedProfileId} onEvolve={onEvolve} />
    </ReactFlowProvider>
  );
}
