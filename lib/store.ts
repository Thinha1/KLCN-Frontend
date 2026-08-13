import { create } from "zustand";

import {
  absoluteImageUrl,
  getFinalStep,
  runCaptionStep,
  runClipScoreStep,
  runDetectStep,
  runRerankStep,
  uploadImage,
} from "./api";
import type {
  CandidateOut,
  ClipScoreOut,
  DetectedObjectOut,
  FinalStepResponse,
  RerankStepResponse,
  StepKey,
  StepStatus,
  UploadResponse,
} from "./types";

// Mirrors webapp/backend/jobs.py::STEP_DEPENDENCIES -- kept in sync by hand since the frontend
// needs it to disable "Run" buttons before ever calling the API.
export const STEP_DEPENDENCIES: Record<StepKey, StepKey[]> = {
  upload: [],
  caption: ["upload"],
  detect: ["upload"],
  clipscore: ["caption"],
  rerank: ["caption", "detect", "clipscore"],
  final: ["rerank"],
};

interface StepState {
  status: StepStatus;
  latencyMs?: number;
  error?: string;
}

const idleSteps = (): Record<StepKey, StepState> => ({
  upload: { status: "idle" },
  caption: { status: "idle" },
  detect: { status: "idle" },
  clipscore: { status: "idle" },
  rerank: { status: "idle" },
  final: { status: "idle" },
});

interface PipelineState {
  jobId: string | null;
  imageUrl: string | null;
  imageMeta: UploadResponse | null;
  steps: Record<StepKey, StepState>;

  candidates: CandidateOut[] | null;
  objects: DetectedObjectOut[] | null;
  scores: ClipScoreOut[] | null;
  rerank: RerankStepResponse | null;
  final: FinalStepResponse | null;

  reset: () => void;
  upload: (file: File) => Promise<void>;
  runStep: (step: Exclude<StepKey, "upload">) => Promise<void>;
  runAll: () => Promise<void>;
  isReady: (step: StepKey) => boolean;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  jobId: null,
  imageUrl: null,
  imageMeta: null,
  steps: idleSteps(),
  candidates: null,
  objects: null,
  scores: null,
  rerank: null,
  final: null,

  reset: () =>
    set({
      jobId: null,
      imageUrl: null,
      imageMeta: null,
      steps: idleSteps(),
      candidates: null,
      objects: null,
      scores: null,
      rerank: null,
      final: null,
    }),

  isReady: (step) => {
    const { steps } = get();
    return STEP_DEPENDENCIES[step].every((dep) => steps[dep].status === "completed");
  },

  upload: async (file) => {
    set({
      jobId: null,
      imageUrl: null,
      imageMeta: null,
      steps: idleSteps(),
      candidates: null,
      objects: null,
      scores: null,
      rerank: null,
      final: null,
    });
    try {
      const res = await uploadImage(file);
      set((state) => ({
        jobId: res.job_id,
        imageUrl: absoluteImageUrl(res.image_url),
        imageMeta: res,
        steps: { ...state.steps, upload: { status: "completed" } },
      }));
    } catch (err) {
      set((state) => ({
        steps: { ...state.steps, upload: { status: "failed", error: (err as Error).message } },
      }));
      throw err;
    }
  },

  runStep: async (step) => {
    const { jobId } = get();
    if (!jobId) throw new Error("Chưa có job nào. Hãy upload ảnh trước.");
    if (!get().isReady(step)) throw new Error(`Bước '${step}' chưa đủ điều kiện để chạy.`);

    set((state) => ({ steps: { ...state.steps, [step]: { status: "running" } } }));
    try {
      switch (step) {
        case "caption": {
          const res = await runCaptionStep(jobId);
          set((state) => ({
            candidates: res.candidates,
            steps: { ...state.steps, caption: { status: "completed", latencyMs: res.latency_ms } },
          }));
          break;
        }
        case "detect": {
          const res = await runDetectStep(jobId);
          set((state) => ({
            objects: res.objects,
            steps: { ...state.steps, detect: { status: "completed", latencyMs: res.latency_ms } },
          }));
          break;
        }
        case "clipscore": {
          const res = await runClipScoreStep(jobId);
          set((state) => ({
            scores: res.scores,
            steps: { ...state.steps, clipscore: { status: "completed", latencyMs: res.latency_ms } },
          }));
          break;
        }
        case "rerank": {
          const res = await runRerankStep(jobId);
          set((state) => ({
            rerank: res,
            steps: { ...state.steps, rerank: { status: "completed", latencyMs: res.latency_ms } },
          }));
          break;
        }
        case "final": {
          const res = await getFinalStep(jobId);
          set((state) => ({
            final: res,
            steps: { ...state.steps, final: { status: "completed", latencyMs: res.total_latency_ms } },
          }));
          break;
        }
      }
    } catch (err) {
      set((state) => ({
        steps: { ...state.steps, [step]: { status: "failed", error: (err as Error).message } },
      }));
      throw err;
    }
  },

  runAll: async () => {
    await Promise.all([get().runStep("caption"), get().runStep("detect")]);
    await get().runStep("clipscore");
    await get().runStep("rerank");
    await get().runStep("final");
  },
}));
