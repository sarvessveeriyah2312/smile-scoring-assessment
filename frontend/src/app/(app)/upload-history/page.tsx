import type { Metadata } from "next";
import { HistoryList } from "./history-list";

export const metadata: Metadata = {
  title: "Upload History",
};

export default function UploadHistoryPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Everything you&apos;ve uploaded, newest first.</p>
      <details className="mt-4 max-w-2xl rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]">
        <summary className="cursor-pointer font-medium">How is the smile score worked out?</summary>
        <div className="mt-2 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
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
      </details>
      <HistoryList />
    </>
  );
}
