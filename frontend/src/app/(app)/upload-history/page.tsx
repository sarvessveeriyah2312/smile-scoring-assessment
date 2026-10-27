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
      <HistoryList />
    </>
  );
}
