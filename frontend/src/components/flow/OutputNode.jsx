/**
 * OutputNode — React Flow custom node for generation results
 */
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import GenerationCard from "@/components/generation/GenerationCard";

function OutputNode({ data }) {
  const { jobs, onEvolve, generating } = data;

  const completedJobs = (jobs || []).filter((j) => j.status === "completed");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg w-[400px] overflow-hidden">
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
        <div className="w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center">
          <Sparkles size={11} className="text-violet-400" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Çıktı
        </span>
        {completedJobs.length > 0 && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
        )}
      </div>

      {/* Body */}
      <div className="p-3 nowheel" style={{ maxHeight: "500px", overflowY: "auto" }}>
        {generating ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-6 min-h-[120px]">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-violet-400"
                />
              ))}
            </div>
            <span className="text-[12px] text-zinc-500">
              İçerik üretiliyor...
            </span>
          </div>
        ) : completedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 min-h-[120px]">
            <Sparkles size={20} className="text-white/10" />
            <span className="text-[12px] text-zinc-600">
              Sonuçlar burada görünecek
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 nodrag">
            {jobs.map((job) => (
              <GenerationCard key={job.id} job={job} onEvolve={onEvolve} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(OutputNode);
