import { type Smile, smileLabel } from "@/lib/smile";

// The score plus the two numbers it came from, so it's never a mystery figure.
export function SmileScore({ smile }: { smile: Smile | null }) {
  if (!smile) return <p className="text-xs text-zinc-500">Not scored</p>;
  if (!smile.face_found || smile.score === null) return <p className="text-xs text-zinc-500">No face found</p>;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{Math.round(smile.score)}</span>
        <span className="text-xs text-zinc-500">/ 100</span>
        <span className="ml-auto text-xs font-medium text-zinc-600 dark:text-zinc-400">{smileLabel(smile.score)}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.1]"
        role="meter"
        aria-label="Smile score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(smile.score)}
      >
        <div className="h-full rounded-full bg-foreground" style={{ width: `${smile.score}%` }} />
      </div>
      <p className="text-[11px] tabular-nums text-zinc-500" title="mouthSmileLeft and mouthSmileRight from MediaPipe, 0 to 1">
        Left {smile.smile_left?.toFixed(2)} · Right {smile.smile_right?.toFixed(2)}
      </p>
    </div>
  );
}
