"use client";

import { useMemo, useState, type ReactNode } from "react";

import NodeShell from "../NodeShell";
import { buildRerankPromptPreview } from "@/lib/prompt";
import { usePipelineStore } from "@/lib/store";
import type { FormulaBreakdownOut, HallucinationOut } from "@/lib/types";
import { useShallow } from "zustand/react/shallow";

const BREAKDOWN_TERMS: { key: keyof FormulaBreakdownOut; label: string }[] = [
  { key: "s_base", label: "Base" },
  { key: "s_align", label: "Align" },
  { key: "s_belief", label: "Belief" },
];

// Breakdown values are already min-max normalized to [0, 1] across the candidate set (see
// FormulaReranker._normalize in the backend) -- a plain low/mid/high traffic-light scale, not
// the raw-CLIPScore-calibrated thresholds in lib/colors.ts.
function breakdownColor(value: number): string {
  if (value >= 0.66) return "#16a34a";
  if (value >= 0.33) return "#ca8a04";
  return "#dc2626";
}

function FormulaBreakdownBars({ breakdown }: { breakdown: FormulaBreakdownOut }) {
  return (
    <div className="mt-1 grid grid-cols-3 gap-1.5">
      {BREAKDOWN_TERMS.map(({ key, label }) => {
        const value = breakdown[key];
        return (
          <div key={key} title={`S_${key.slice(2)} = ${value.toFixed(3)} (đã chuẩn hoá 0-1)`}>
            <div className="flex items-center justify-between text-[9px] text-gray-400">
              <span>{label}</span>
              <span className="font-mono">{value.toFixed(2)}</span>
            </div>
            <div className="h-1 w-full rounded-full bg-gray-100">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${value * 100}%`, backgroundColor: breakdownColor(value) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderHighlighted(text: string, flags: HallucinationOut[]): ReactNode[] {
  if (flags.length === 0) return [text];
  const flagByWord = new Map<string, HallucinationOut>();
  flags.forEach((f) => flagByWord.set(f.word.toLowerCase(), f));

  return text.split(/(\s+)/).map((part, idx) => {
    const clean = part.toLowerCase().replace(/[.,!?;:]/g, "");
    const flag = flagByWord.get(clean);
    if (!flag) return <span key={idx}>{part}</span>;
    const color = flag.source === "llm" ? "#dc2626" : "#ca8a04";
    return (
      <mark
        key={idx}
        title={`${flag.note} (${flag.source === "llm" ? "LLM xác nhận" : "heuristic - chưa chắc chắn"})`}
        style={{ backgroundColor: "transparent", color, textDecoration: `underline wavy ${color}`, fontWeight: 600 }}
      >
        {part}
        <span aria-hidden> ⚠️</span>
      </mark>
    );
  });
}

export default function ReasoningNode({ selected }: { selected?: boolean }) {
  const { rerank, steps, isReady, runStep, objects, scores, rerankMode, setRerankMode } = usePipelineStore(
    useShallow((s) => ({
      rerank: s.rerank,
      steps: s.steps,
      isReady: s.isReady,
      runStep: s.runStep,
      objects: s.objects,
      scores: s.scores,
      rerankMode: s.rerankMode,
      setRerankMode: s.setRerankMode,
    }))
  );

  const [showPrompt, setShowPrompt] = useState(false);
  const ready = isReady("rerank");
  const running = steps.rerank.status === "running";

  // Built straight from data already in the store (candidates + objects + CLIPScore) --
  // shows instantly, no extra API round trip needed just to preview the prompt.
  const rerankPrompt = useMemo(
    () => (ready && scores ? buildRerankPromptPreview(scores, objects ?? []) : ""),
    [ready, scores, objects]
  );

  const modeMismatch = rerank && rerank.mode !== rerankMode;

  return (
    <NodeShell
      title="4. Suy luận và kiểm tra ảo giác"
      status={steps.rerank.status}
      onRun={() => runStep("rerank").catch(() => {})}
      runDisabled={!ready}
      runLabel="Chạy (có thể mất 1-2 phút)"
      width={460}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Chế độ rerank
            </span>
            <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setRerankMode("llm")}
                disabled={running}
                className={`rounded px-2 py-0.5 ${rerankMode === "llm" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}
              >
                LLM
              </button>
              <button
                type="button"
                onClick={() => setRerankMode("formula")}
                disabled={running}
                className={`rounded px-2 py-0.5 ${rerankMode === "formula" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}
              >
                Formula
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            {rerankMode === "llm"
              ? "Gọi LLM để chọn chú thích tốt nhất (tự rơi về Formula nếu LLM lỗi/chưa cấu hình)."
              : "Công thức toán học (độ tin cậy caption + CLIPScore + object belief), không gọi mạng."}
          </p>
        </div>

        {rerankMode === "llm" && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Prompt gửi cho LLM
              </span>
              <button
                type="button"
                onClick={() => setShowPrompt((v) => !v)}
                className="text-[10px] font-medium text-indigo-600 hover:underline"
              >
                {showPrompt ? "Ẩn prompt" : "Hiện prompt"}
              </button>
            </div>
            {showPrompt && (
              <textarea
                readOnly
                value={ready ? rerankPrompt || "(trống)" : "Hoàn tất sinh chú thích, phát hiện vật thể và CLIPScore trước."}
                className="h-32 w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-[11px] text-slate-600"
              />
            )}
          </div>
        )}

        {rerank && (
          <p className="text-[10px] text-gray-400">
            Đã chạy bằng:{" "}
            <span className="font-medium text-slate-600">{rerank.mode === "llm" ? "LLM" : "Formula"}</span>
            {modeMismatch && (
              <span className="ml-1 text-amber-600">
                (đã yêu cầu {rerankMode === "llm" ? "LLM" : "Formula"} nhưng tự rơi về {rerank.mode === "llm" ? "LLM" : "Formula"})
              </span>
            )}
            {" · "}
            {rerank.model_name}
          </p>
        )}

        {!rerank ? (
          <p className="text-gray-400">
            Chưa chạy. Bước này gọi LLM để chọn chú thích tốt nhất và kiểm tra ảo giác, có thể
            mất vài phút.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rerank.ranking.map((item) => {
              const flags = rerank.hallucinations.filter((h) => h.candidate_id === item.candidate_id);
              return (
                <div
                  key={item.candidate_id}
                  className={`rounded-md border px-2 py-1 ${item.rank === 1 ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-white"}`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>#{item.candidate_id} - rank {item.rank}</span>
                    <span className="font-mono">{item.score.toFixed(3)}</span>
                  </div>
                  <div className="font-medium text-slate-800">{renderHighlighted(item.text, flags)}</div>
                  {item.formula_breakdown && <FormulaBreakdownBars breakdown={item.formula_breakdown} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {steps.rerank.status === "failed" && (
        <p className="mt-2 text-[11px] text-red-600">{steps.rerank.error}</p>
      )}
    </NodeShell>
  );
}
