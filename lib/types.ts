// Mirrors webapp/backend/models.py (the API's pydantic response shapes).

export type StepKey = "upload" | "caption" | "detect" | "clipscore" | "rerank" | "final";
export type StepStatus = "idle" | "running" | "completed" | "failed";

export interface UploadResponse {
  job_id: string;
  image_url: string;
  image_data_url?: string;
  width: number;
  height: number;
  format: string;
  size_bytes: number;
  filename: string;
  status: "completed";
}

export interface CandidateOut {
  id: number;
  text: string;
  source: string;
  generation_score: number | null;
  clip_score: number | null;
}

export interface CaptionStepResponse {
  candidates: CandidateOut[];
  latency_ms: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectedObjectOut {
  label: string;
  confidence: number;
  box: BoundingBox | null;
}

export interface DetectStepResponse {
  objects: DetectedObjectOut[];
  latency_ms: number;
}

export interface ClipScoreOut {
  candidate_id: number;
  text: string;
  clip_score: number;
  percent: number;
}

export interface ClipScoreStepResponse {
  scores: ClipScoreOut[];
  latency_ms: number;
}

export interface FormulaBreakdownOut {
  s_base: number;
  s_align: number;
  s_belief: number;
}

export interface RankingOut {
  candidate_id: number;
  rank: number;
  score: number;
  text: string;
  formula_breakdown: FormulaBreakdownOut | null;
}

export interface HallucinationOut {
  candidate_id: number;
  word: string;
  note: string;
  source: "llm" | "heuristic_guess";
}

export type RerankMode = "llm" | "formula";

export interface RerankStepResponse {
  ranking: RankingOut[];
  selected_caption: string | null;
  hallucinations: HallucinationOut[];
  model_name: string;
  // Which method actually produced this result -- may differ from what was requested if "llm"
  // was picked but the LLM wasn't configured/failed and it fell back to "formula".
  mode: RerankMode;
  latency_ms: number;
}

export interface RerankPromptPreview {
  prompt: string;
}

export interface FinalStepResponse {
  final_caption: string;
  final_clip_score: number | null;
  hallucination_violations: number;
  hallucination_status: string;
  total_latency_ms: number;
}

export interface ApiErrorBody {
  detail: string;
}
