// Mirrors CaptionReranker._build_retry_prompt in webapp/backend/pipeline/llm.py -- that is the
// prompt actually sent by default (compact_prompt=True). Built here from data the store already
// has (candidates + objects + CLIPScore, all populated once steps 2A/2B/3 finish) so the preview
// shows instantly instead of waiting on a network round trip to the backend.
import type { ClipScoreOut, DetectedObjectOut } from "./types";

function formatScore(score: number): string {
  return score.toFixed(4);
}

function formatSceneSentences(scores: ClipScoreOut[], topK = 3): string {
  if (scores.length === 0) return "not provided";
  const sorted = [...scores].sort((a, b) => b.clip_score - a.clip_score);
  return sorted.slice(0, topK).map((s) => s.text).join(" | ");
}

export function buildRerankPromptPreview(scores: ClipScoreOut[], objects: DetectedObjectOut[]): string {
  const objectLabels = objects.length > 0 ? objects.map((o) => o.label).join(", ") : "none";
  const lines = [
    "Return JSON only. Do not return {}.",
    "Select the single best caption. Avoid hallucinated objects, broken <unk> text, and vague captions. " +
      "When candidates are otherwise similar, prefer the higher CLIPScore.",
    `Objects: ${objectLabels}`,
    "Human actions: not provided",
    `Scene sentences: ${formatSceneSentences(scores)}`,
    "Rank these captions from best to worst (CLIPScore is 0-1, higher is better):",
  ];
  scores.forEach((s, idx) => {
    lines.push(`${idx}: ${s.text} (CLIPScore: ${formatScore(s.clip_score)})`);
  });
  lines.push(
    "Do not explain your decision. Also add 'hallucinations' " +
      "(per-candidate words naming an object absent from Objects)."
  );
  lines.push(
    'Output: {"selected_caption":"best caption text", ' +
      '"hallucinations":[{"id":0,"words":["dog"],"note":"no dog detected"}]}'
  );
  return lines.join("\n");
}
