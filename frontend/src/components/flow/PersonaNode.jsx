/**
 * PersonaNode — React Flow custom node for persona selection
 */
import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, ChevronDown, Search, Loader2, Check, Plus, ExternalLink,
} from "lucide-react";

function PersonaNode({ data }) {
  const {
    profiles, selected, onSelect, loading, generating,
  } = data;

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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg w-[300px] overflow-visible" ref={ref}>
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
        <div className="w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center">
          <User size={11} className="text-violet-400" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Persona
        </span>
        {selected && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Generating state */}
        {generating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-5">
            {selectedProfile?.avatar_url && (
              <div className="w-12 h-12 rounded-full overflow-hidden relative">
                <img
                  src={selectedProfile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute -inset-1 rounded-full border-2 border-violet-500/50"
                  style={{ animation: "pulseRing 1.5s ease-out infinite" }}
                />
              </div>
            )}
            <div className="text-center">
              <div className="text-[12px] font-semibold text-violet-400 mb-1">
                Tarz analiz ediliyor...
              </div>
              <div className="text-[11px] text-zinc-600">
                {selectedProfile?.display_name || selectedProfile?.name}
              </div>
            </div>
            <Loader2 size={18} className="text-violet-600 animate-spin" />
          </div>
        ) : (
          <div className="relative">
            {/* Selector button */}
            <button
              onClick={() => setOpen(!open)}
              className="nodrag w-full flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer font-[inherit] transition-all duration-200"
              style={{
                background: open ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.02)",
                border: open ? "1.5px solid rgba(139,92,246,0.3)" : "1.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {selectedProfile ? (
                <>
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                    {selectedProfile.avatar_url ? (
                      <img src={selectedProfile.avatar_url} alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {(selectedProfile.display_name || selectedProfile.name || "?")[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-semibold text-white leading-tight">
                      {selectedProfile.display_name || selectedProfile.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      @{selectedProfile.username} · {selectedProfile.tweet_count} tweet
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-zinc-600" />
                  </div>
                  <div className="text-[13px] text-zinc-500 text-left">
                    Hedef kişiyi seç
                  </div>
                </>
              )}
              <ChevronDown
                size={16}
                className="text-zinc-500 flex-shrink-0 transition-transform duration-200"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="nodrag nowheel absolute top-[calc(100%+6px)] left-0 right-0 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  {profiles.length > 3 && (
                    <div className="p-2 pb-1 border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                        <Search size={12} className="text-zinc-600 flex-shrink-0" />
                        <input
                          type="text" value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Ara..." autoFocus
                          className="bg-transparent border-none outline-none text-white text-[12px] w-full font-[inherit]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="max-h-[220px] overflow-y-auto p-1">
                    {loading ? (
                      <div className="p-4 text-center text-zinc-500 text-[12px]">
                        <Loader2 size={16} className="animate-spin mx-auto" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500 text-[12px]">
                        {profiles.length === 0 ? "Henüz profil yok" : "Sonuç yok"}
                      </div>
                    ) : (
                      filtered.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { onSelect(p.id); setOpen(false); setSearch(""); }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg cursor-pointer font-[inherit] transition-colors duration-150 border-none"
                          style={{
                            background: selected === p.id ? "rgba(139,92,246,0.1)" : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (selected !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = selected === p.id ? "rgba(139,92,246,0.1)" : "transparent";
                          }}
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <span className="text-white text-[12px] font-semibold">
                                {(p.display_name || p.name || "?")[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[12px] font-semibold text-white">
                              {p.display_name || p.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              @{p.username} · {p.tweet_count} tweet
                            </div>
                          </div>
                          {selected === p.id && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-white/[0.06] p-1">
                    <button
                      onClick={() => { setOpen(false); navigate("/dashboard/persona-lab"); }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg cursor-pointer font-[inherit] text-violet-500 text-[12px] font-medium border-none bg-transparent hover:bg-violet-500/[0.06] transition-colors"
                    >
                      <Plus size={14} />
                      Yeni Profil Oluştur
                      <ExternalLink size={10} className="ml-auto opacity-50" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-zinc-900"
      />

      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default memo(PersonaNode);
