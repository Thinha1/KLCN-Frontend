import type {
  CaptionStepResponse,
  ClipScoreStepResponse,
  DetectStepResponse,
  FinalStepResponse,
  RerankPromptPreview,
  RerankStepResponse,
  UploadResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const API_HEADERS = {
  "ngrok-skip-browser-warning": "true",
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function absoluteImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) return imageUrl;
  return `${API_BASE}${imageUrl}`;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/api/jobs`, { method: "POST", headers: API_HEADERS, body: form });
  return handle<UploadResponse>(res);
}

// The reasoning/rerank step calls a real LLM endpoint that can take well over a minute to
// respond, so this deliberately has no client-side timeout -- only the AbortSignal callers
// choose to pass (e.g. on unmount) can cut it short.
async function post<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body !== undefined ? { ...API_HEADERS, "Content-Type": "application/json" } : API_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  return handle<T>(res);
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: API_HEADERS, signal });
  return handle<T>(res);
}

export const runCaptionStep = (jobId: string, signal?: AbortSignal) =>
  post<CaptionStepResponse>(`/api/jobs/${jobId}/steps/caption`, signal);

export const runDetectStep = (jobId: string, signal?: AbortSignal) =>
  post<DetectStepResponse>(`/api/jobs/${jobId}/steps/detect`, signal);

export const runClipScoreStep = (jobId: string, signal?: AbortSignal) =>
  post<ClipScoreStepResponse>(`/api/jobs/${jobId}/steps/clipscore`, signal);

export const runRerankStep = (jobId: string, prompt?: string, signal?: AbortSignal) =>
  post<RerankStepResponse>(`/api/jobs/${jobId}/steps/rerank`, signal, { prompt: prompt || null });

export const getRerankPromptPreview = (jobId: string, signal?: AbortSignal) =>
  get<RerankPromptPreview>(`/api/jobs/${jobId}/steps/rerank/prompt`, signal);

export const getFinalStep = (jobId: string, signal?: AbortSignal) =>
  get<FinalStepResponse>(`/api/jobs/${jobId}/steps/final`, signal);
