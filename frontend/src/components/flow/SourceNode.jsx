/**
 * SourceNode — React Flow custom node for source text/tweet input
 */
import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, LinkIcon, Type, Loader2, X,
} from "lucide-react";

const isTwitterUrl = (text) => /(?:x|twitter)\.com\/.+\/status\/\d+/.test(text);

function SourceNode({ data }) {
  const {
    value, onChange, fetchedTweet, onClearTweet, onFetchTweet, fetching,
  } = data;

  const showUrlHint = isTwitterUrl((value || "").trim()) && !fetchedTweet;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg w-[340px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
        <div className="w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center">
          <FileText size={11} className="text-violet-400" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Kaynak
        </span>
        {(fetchedTweet || (value && value.trim())) && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2.5">
        {/* Fetched tweet preview */}
        <AnimatePresence>
          {fetchedTweet && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-violet-500/5 border border-violet-500/15 rounded-lg p-3 relative"
            >
              <button
                onClick={onClearTweet}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ border: "none", cursor: "pointer", color: "#888" }}
              >
                <X size={10} />
              </button>
              <div className="flex gap-2.5 items-start">
                <img
                  src={`https://unavatar.io/x/${fetchedTweet.author_username}`}
                  alt=""
                  className="w-7 h-7 rounded-full flex-shrink-0 bg-white/5"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div className="flex-1 pr-4">
                  <div className="text-[11px] font-semibold text-white mb-0.5">
                    {fetchedTweet.author_name}
                    <span className="font-normal text-zinc-500 ml-1.5">
                      @{fetchedTweet.author_username}
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-relaxed m-0 line-clamp-4 whitespace-pre-wrap">
                    {fetchedTweet.text}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        {!fetchedTweet && (
          <div className="relative">
            <textarea
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Tweet URL veya serbest metin yapıştır..."
              rows={4}
              disabled={fetching}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && showUrlHint) {
                  e.preventDefault();
                  onFetchTweet();
                }
              }}
              className="nodrag nowheel nopan w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-white text-[13px] leading-relaxed resize-none outline-none focus:border-violet-500/30 transition-colors font-[inherit]"
            />
            {fetching && (
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-[11px] text-violet-400">
                <Loader2 size={11} className="animate-spin" />
                Yükleniyor
              </div>
            )}
            {showUrlHint && !fetching && (
              <button
                onClick={onFetchTweet}
                className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white cursor-pointer font-[inherit] border-none"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                <LinkIcon size={10} />
                Yükle
              </button>
            )}
          </div>
        )}

        {/* Mode indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          {fetchedTweet ? (
            <><LinkIcon size={9} /> Tweet yüklendi</>
          ) : (value || "").trim() ? (
            isTwitterUrl((value || "").trim())
              ? <><LinkIcon size={9} /> URL algılandı</>
              : <><Type size={9} /> Serbest metin</>
          ) : (
            <><FileText size={9} /> URL veya metin gir</>
          )}
        </div>
      </div>

      {/* Source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-zinc-900"
      />
    </div>
  );
}

export default memo(SourceNode);
