"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SmileScore } from "@/components/smile-score";
import { apiFetch } from "@/lib/api";
import { type Smile, smileLabel } from "@/lib/smile";
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
    <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-5">
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
  const [confirming, setConfirming] = useState(false);

  async function deleteUpload() {
    try {
      const res = await apiFetch(`/uploads/${upload.id}`, { method: "DELETE" });
      // A 404 means it's already gone (maybe deleted in another tab), which is
      // what they wanted anyway.
      if (res.ok || res.status === 404) return onDeleted();
      return res.status === 401 ? "Your session has ended. Please log in again." : "That didn't delete. Please try again.";
    } catch {
      return "We couldn't reach the server. Please try again.";
    }
  }

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-black/[.08] bg-background shadow-sm transition-shadow hover:shadow-md dark:border-white/[.145]">
      <div className="relative">
        <Link href={`/upload-history/${upload.id}`} aria-label={`View details for ${upload.filename}`} className="block">
          <Thumbnail upload={upload} />
        </Link>

        <ScoreBadge smile={upload.smile} />

        {/* Tucked away until you hover on a mouse; always there on touch screens,
            where there's no hover to reveal it. */}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${upload.filename}`}
          title="Delete"
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-all hover:bg-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link
            href={`/upload-history/${upload.id}`}
            className="block truncate text-sm font-medium underline-offset-4 hover:underline"
            title={upload.filename}
          >
            {upload.filename}
          </Link>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatDate(upload.created_at)} · {formatSize(upload.size)}
          </p>
        </div>

        <div className="mt-auto">
          <SmileScore smile={upload.smile} />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this image?"
        message={
          <>
            <strong className="font-medium text-foreground">{upload.filename}</strong> and its smile score will be gone for good.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={deleteUpload}
        onClose={() => setConfirming(false)}
      />
    </li>
  );
}

// The headline number, pinned to the photo so it's the first thing you see.
function ScoreBadge({ smile }: { smile: Smile | null }) {
  const scored = smile?.face_found && smile.score !== null;
  const text = !smile ? "Not scored" : scored ? `${Math.round(smile.score!)} · ${smileLabel(smile.score!)}` : "No face";

  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur">
      {text}
    </span>
  );
}

function Thumbnail({ upload }: { upload: Upload }) {
  const { src, failed } = useUploadImage(upload.id, upload.content_type);

  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/[.03] dark:bg-white/[.04]">
      {src ? (
        // A blob: URL from memory, so next/image's optimiser has nothing to fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={upload.filename} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <span className="text-xs text-zinc-500">{failed ? "Couldn't load" : "Loading…"}</span>
      )}
    </div>
  );
}
