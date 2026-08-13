"use client";

import { Background, Controls, ReactFlow, type Edge, type Node, useEdgesState, useNodesState } from "@xyflow/react";
import { useState } from "react";

import ClipScoreNode from "@/components/nodes/ClipScoreNode";
import DetectionNode from "@/components/nodes/DetectionNode";
import CaptionNode from "@/components/nodes/CaptionNode";
import FinalNode from "@/components/nodes/FinalNode";
import ReasoningNode from "@/components/nodes/ReasoningNode";
import UploadNode from "@/components/nodes/UploadNode";
import { usePipelineStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

const nodeTypes = {
  upload: UploadNode,
  caption2a: CaptionNode,
  detect2b: DetectionNode,
  clipscore3: ClipScoreNode,
  reasoning4: ReasoningNode,
  final5: FinalNode,
};

const initialNodes: Node[] = [
  { id: "upload", type: "upload", position: { x: 0, y: 170 }, data: {}, style: { width: 300 } },
  { id: "caption2a", type: "caption2a", position: { x: 340, y: 0 }, data: {}, style: { width: 380 } },
  { id: "detect2b", type: "detect2b", position: { x: 340, y: 380 }, data: {}, style: { width: 360 } },
  { id: "clipscore3", type: "clipscore3", position: { x: 760, y: 0 }, data: {}, style: { width: 360 } },
  { id: "reasoning4", type: "reasoning4", position: { x: 1160, y: 130 }, data: {}, style: { width: 460 } },
  { id: "final5", type: "final5", position: { x: 1660, y: 170 }, data: {}, style: { width: 360 } },
];

const initialEdges: Edge[] = [
  { id: "e-upload-caption", source: "upload", target: "caption2a" },
  { id: "e-upload-detect", source: "upload", target: "detect2b" },
  { id: "e-caption-clipscore", source: "caption2a", target: "clipscore3" },
  { id: "e-clipscore-reasoning", source: "clipscore3", target: "reasoning4" },
  { id: "e-detect-reasoning", source: "detect2b", target: "reasoning4" },
  { id: "e-reasoning-final", source: "reasoning4", target: "final5" },
];

export default function PipelinePage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { jobId, reset, runAll } = usePipelineStore(
    useShallow((s) => ({
      jobId: s.jobId,
      reset: s.reset,
      runAll: s.runAll,
    }))
  );
  const [runningAll, setRunningAll] = useState(false);
  const [runAllError, setRunAllError] = useState<string | null>(null);

  const handleRunAll = async () => {
    setRunningAll(true);
    setRunAllError(null);
    try {
      await runAll();
    } catch (err) {
      setRunAllError((err as Error).message);
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">
            Pipeline sinh chú thích ảnh - CLIP-ViT + YOLO + LLM
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {runAllError && <span className="text-[11px] text-red-600">{runAllError}</span>}
          <button
            onClick={handleRunAll}
            disabled={!jobId || runningAll}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-black"
          >
            {runningAll ? "Đang chạy toàn bộ..." : "Chạy tất cả"}
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
