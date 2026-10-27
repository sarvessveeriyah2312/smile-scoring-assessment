// Mirrors SmileResponse in backend/uploads/schemas.py.
export type Smile = {
  status: "pending" | "done" | "failed";
  face_found: boolean | null;
  smile_left: number | null;
  smile_right: number | null;
  score: number | null;
};

export type ScoredSmile = Smile & { status: "done"; face_found: true; score: number; smile_left: number; smile_right: number };

export function isScored(smile: Smile | null | undefined): smile is ScoredSmile {
  return smile?.status === "done" && smile.face_found === true && smile.score !== null;
}

// Rough bands so a number like 63 means something at a glance. The stored score doesn't depend on these.
export function smileLabel(score: number) {
  if (score < 20) return "No smile";
  if (score < 50) return "Slight smile";
  if (score < 80) return "Smiling";
  return "Big smile";
}

export function smileSummary(smile: Smile | null | undefined) {
  if (!smile) return "Not scored";
  if (smile.status === "pending") return "Analysing…";
  if (smile.status === "failed") return "Analysis failed";
  if (!isScored(smile)) return "No face found";
  return `${Math.round(smile.score)} · ${smileLabel(smile.score)}`;
}
