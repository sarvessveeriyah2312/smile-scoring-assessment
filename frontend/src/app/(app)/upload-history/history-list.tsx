"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { apiFetch } from "@/lib/api";

type Upload = { id: number; filename: string; content_type: string; size: number; created_at: string };

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
        <li key={upload.id} className="overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145]">
          <Thumbnail upload={upload} />
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium" title={upload.filename}>
              {upload.filename}
            </p>
            <p className="text-xs text-zinc-500">
              {formatSize(upload.size)} · {formatDate(upload.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Images come back encrypted like everything else, so we fetch each one,
// decrypt it, and turn it into a local URL the <img> tag can use.
function Thumbnail({ upload }: { upload: Upload }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    apiFetch<{ data: string }>(`/uploads/${upload.id}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok || !res.data) return setFailed(true);
        const bytes = Uint8Array.from(atob(res.data.data), (c) => c.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: upload.content_type }));
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));

    // Free the memory once the thumbnail is gone.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [upload.id, upload.content_type]);

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
