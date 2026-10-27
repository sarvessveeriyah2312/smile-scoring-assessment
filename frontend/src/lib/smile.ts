// Mirrors SmileResponse in backend/uploads/schemas.py.
export type Smile = {
  face_found: boolean;
  smile_left: number | null;
  smile_right: number | null;
  score: number | null;
};

// Rough bands so a number like 63 means something at a glance. Adjust freely;
// the stored score itself doesn't depend on these.
export function smileLabel(score: number) {
  if (score < 20) return "No smile";
  if (score < 50) return "Slight smile";
  if (score < 80) return "Smiling";
  return "Big smile";
}
