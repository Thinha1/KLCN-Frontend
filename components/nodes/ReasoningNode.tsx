"use client";

import type { ReactNode } from "react";

import NodeShell from "../NodeShell";
import { useTypewriter } from "@/hooks/useTypewriter";
import { usePipelineStore } from "@/lib/store";
import type { HallucinationOut } from "@/lib/types";
import { useShallow } from "zustand/react/shallow";

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
  const { rerank, steps, isReady, runStep } = usePipelineStore(
    useShallow((s) => ({
      rerank: s.rerank,
      steps: s.steps,
      isReady: s.isReady,
      runStep: s.runStep,
    }))
  );
  const typedReasoning = useTypewriter(rerank?.reasoning ?? "");

  return (
    <NodeShell
      title="4. Lập luận và kiểm tra ảo giác"
      status={steps.rerank.status}
      onRun={() => runStep("rerank").catch(() => {})}
      runDisabled={!isReady("rerank")}
      runLabel="Chạy (có thể mất 1-2 phút)"
      width={420}
      selected={selected}
    >
      {!rerank ? (
        <p className="text-gray-400">
          Chưa chạy. Bước này gọi LLM để chọn chú thích tốt nhất và kiểm tra ảo giác, có thể
          mất vài phút.
        </p>
      ) : (
        <div className="space-y-3">
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
                </div>
              );
            })}
          </div>

          <div className="rounded-md bg-gray-50 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Lập luận
            </div>
            <p className="whitespace-pre-wrap text-gray-700">
              {typedReasoning}
              {typedReasoning.length < rerank.reasoning.length && (
                <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-gray-400 align-middle">
                  &nbsp;
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      {steps.rerank.status === "failed" && (
        <p className="mt-2 text-[11px] text-red-600">{steps.rerank.error}</p>
      )}
    </NodeShell>
  );
}
