"use client";

import NodeShell from "../NodeShell";
import { usePipelineStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

export default function CaptionNode() {
  const { candidates, steps, isReady, runStep } = usePipelineStore(
    useShallow((s) => ({
      candidates: s.candidates,
      steps: s.steps,
      isReady: s.isReady,
      runStep: s.runStep,
    }))
  );

  return (
    <NodeShell
      title="2A. Sinh chú thích"
      subtitle="CLIP-ViT + Transformer Decoder"
      status={steps.caption.status}
      onRun={() => runStep("caption").catch(() => {})}
      runDisabled={!isReady("caption")}
      width={340}
    >
      {!candidates ? (
        <p className="text-gray-400">Chưa chạy. Bấm Chạy để sinh các chú thích ứng viên.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-1 pr-1">#</th>
              <th className="pb-1">Chú thích</th>
              <th className="pb-1 pl-1 text-right">Log Prob</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 align-top">
                <td className="py-1 pr-1 text-gray-400">{c.id}</td>
                <td className="py-1 pr-1 font-medium text-slate-800">{c.text}</td>
                <td className="py-1 pl-1 text-right font-mono text-gray-500">
                  {c.generation_score !== null ? c.generation_score.toFixed(2) : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {steps.caption.status === "failed" && (
        <p className="mt-2 text-[11px] text-red-600">{steps.caption.error}</p>
      )}
    </NodeShell>
  );
}
