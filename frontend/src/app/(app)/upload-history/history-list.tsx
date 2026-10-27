"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { SmileScore } from "@/components/smile-score";
import { apiFetch } from "@/lib/api";
import { type Upload, formatDate, formatSize, useUploadImage } from "@/lib/uploads";

export function HistoryList() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Upload[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    // Nobody logged in yet (or we're still checking), so there's nothing to load.
    if (!userId) return;
    // Lists come back wrapped as { data: [...] } so the encryption has a key to work with.
    apiFetch<{ data: Upload[] }>("/uploads").then(
      (res) => (res.ok && res.data ? setUploads(res.data.data) : setLoadError(true)),
      () => setLoadError(true),
    );
  }, [userId]);

  if (loadError) {
    return <p className="mt-6 text-sm text-red-600 dark:text-red-400">We couldn&apos;t load your uploads. Try refreshing the page.</p>;
  }

  if (uploads === null) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  if (uploads.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        Nothing here yet.{" "}
        <Link href="/upload" className="font-medium text-foreground underline-offset-4 hover:underline">
          Upload your first image
        </Link>
        .
      </p>
    );
  }

  return (
    // Columns follow the space actually available, so the grid reflows when the
    // sidebar opens or closes, not just when the window is resized.
    <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
      {uploads.map((upload) => (
        <HistoryCard
          key={upload.id}
          upload={upload}
          onDeleted={() => setUploads((current) => current?.filter((u) => u.id !== upload.id) ?? null)}
        />
      ))}
    </ul>
  );
}

function HistoryCard({ upload, onDeleted }: { upload: Upload; onDeleted: () => void }) {
  // "idle" → "confirming" → "deleting". Asking first means one stray click
  // can't throw an image away.
  const [step, setStep] = useState<"idle" | "confirming" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setStep("deleting");
    setError(null);
    try {
      const res = await apiFetch(`/uploads/${upload.id}`, { method: "DELETE" });
      // A 404 means it's already gone (maybe deleted in another tab), which is
      // what they wanted anyway.
      if (res.ok || res.status === 404) return onDeleted();
      setError(res.status === 401 ? "Your session has ended. Please log in again." : "That didn't delete. Please try again.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setStep("idle");
  }

  return (
    <li className={`overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145] ${step === "deleting" ? "opacity-50" : ""}`}>
      <Link href={`/upload-history/${upload.id}`} aria-label={`View details for ${upload.filename}`}>
        <Thumbnail upload={upload} />
      </Link>
      <div className="flex flex-col gap-2 px-3 py-2">
        <div>
          <Link href={`/upload-history/${upload.id}`} className="block truncate text-sm font-medium underline-offset-4 hover:underline" title={upload.filename}>
            {upload.filename}
          </Link>
          <p className="text-xs text-zinc-500">
            {formatSize(upload.size)} · {formatDate(upload.created_at)}
          </p>
        </div>

        <SmileScore smile={upload.smile} />

        {step === "confirming" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Delete this image? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setStep("idle")}
                className="flex-1 rounded-md border border-black/[.08] px-2 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStep("confirming")}
            disabled={step === "deleting"}
            aria-label={`Delete ${upload.filename}`}
            className="self-start text-xs font-medium text-red-600 underline-offset-4 hover:underline disabled:no-underline dark:text-red-400"
          >
            {step === "deleting" ? "Deleting…" : "Delete"}
          </button>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function Thumbnail({ upload }: { upload: Upload }) {
  const { src, failed } = useUploadImage(upload.id, upload.content_type);

  return (
    <div className="flex aspect-square items-center justify-center bg-black/[.03] dark:bg-white/[.04]">
      {src ? (
        // A blob: URL from memory, so next/image's optimiser has nothing to fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={upload.filename} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs text-zinc-500">{failed ? "Couldn't load" : "Loading…"}</span>
      )}
    </div>
  );
}
