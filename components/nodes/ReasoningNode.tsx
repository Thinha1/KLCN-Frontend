"use client";

import { useEffect, type ReactNode } from "react";

import NodeShell from "../NodeShell";
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
  const {
    rerank,
    steps,
    isReady,
    runStep,
    rerankPrompt,
    rerankPromptLoading,
    setRerankPrompt,
    loadDefaultRerankPrompt,
  } = usePipelineStore(
    useShallow((s) => ({
      rerank: s.rerank,
      steps: s.steps,
      isReady: s.isReady,
      runStep: s.runStep,
      rerankPrompt: s.rerankPrompt,
      rerankPromptLoading: s.rerankPromptLoading,
      setRerankPrompt: s.setRerankPrompt,
      loadDefaultRerankPrompt: s.loadDefaultRerankPrompt,
    }))
  );

  // Seed the textarea with the backend's default prompt as soon as its inputs (candidates +
  // objects + CLIPScore) are ready, so the user edits a real prompt instead of a blank box.
  useEffect(() => {
    if (isReady("rerank")) loadDefaultRerankPrompt();
  }, [isReady, loadDefaultRerankPrompt]);

  const ready = isReady("rerank");

  return (
    <NodeShell
      title="4. Lập luận và kiểm tra ảo giác"
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
              Prompt gửi cho LLM
            </span>
            <button
              type="button"
              onClick={() => loadDefaultRerankPrompt(true)}
              disabled={!ready || rerankPromptLoading}
              className="text-[10px] font-medium text-indigo-600 hover:underline disabled:text-gray-300"
            >
              Nạp prompt mặc định
            </button>
          </div>
          <textarea
            value={rerankPrompt}
            onChange={(e) => setRerankPrompt(e.target.value)}
            disabled={!ready || steps.rerank.status === "running"}
            placeholder={
              ready
                ? rerankPromptLoading
                  ? "Đang nạp prompt mặc định…"
                  : "Prompt mặc định sẽ tự nạp khi bước 2A/2B/3 hoàn tất."
                : "Hoàn tất sinh chú thích, phát hiện vật thể và CLIPScore trước."
            }
            className="h-32 w-full resize-y rounded-md border border-gray-200 bg-white p-2 font-mono text-[11px] text-slate-700 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Có thể chỉnh sửa tự do trước khi chạy; prompt đã bao gồm CLIPScore của từng ứng viên.
          </p>
        </div>

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
