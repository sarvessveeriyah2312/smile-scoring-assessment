import type { Metadata } from "next";
import { HistoryList } from "./history-list";

export const metadata: Metadata = {
  title: "Upload History",
};

export default function UploadHistoryPage() {
  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
        <button
          type="button"
          popoverTarget="smile-score-help"
          aria-label="How is the smile score worked out?"
          title="How is the smile score worked out?"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-black/[.15] text-sm font-bold text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:border-white/[.2] dark:text-zinc-400 dark:hover:bg-white/[.08]"
        >
          !
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Everything you&apos;ve uploaded, newest first.</p>

      {/* Native popover: closes on Esc or a click outside, no JavaScript needed. */}
      <div
        id="smile-score-help"
        popover="auto"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-black/[.08] bg-background p-6 text-sm text-foreground shadow-xl backdrop:bg-black/30 dark:border-white/[.145]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">How is the smile score worked out?</h2>
          <button
            type="button"
            popoverTarget="smile-score-help"
            popoverTargetAction="hide"
            aria-label="Close"
            className="-mt-1 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
          <p>
            Each photo is run through Google&apos;s MediaPipe Face Landmarker, which reads the face and rates dozens of
            expressions from 0 to 1. Two of those are <code>mouthSmileLeft</code> and <code>mouthSmileRight</code>: how
            far each corner of the mouth is pulled up into a smile.
          </p>
          <p>
            The score is the average of the two, scaled to 100: <code>(left + right) / 2 × 100</code>. So left 0.70 and
            right 0.80 gives 75. Both raw numbers are shown under every score and saved with it.
          </p>
          <p>
            If there&apos;s more than one face, only the first one MediaPipe finds is scored. If it can&apos;t find a face at
            all, the photo shows &ldquo;No face found&rdquo;. Photos uploaded before scoring was added show &ldquo;Not
            scored&rdquo;.
          </p>
        </div>
      </div>

      <HistoryList />
    </>
  );
}
