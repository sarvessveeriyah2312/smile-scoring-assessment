"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { apiFetch } from "@/lib/api";

type Upload = { id: number; filename: string; content_type: string; size: number; created_at: string };

type QueuedFile = { key: string; file: File; status: "uploading" | "error"; error?: string };


const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

export function UploadPanel() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Upload[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const updateQueued = (key: string, changes: Partial<QueuedFile> | null) =>
    setQueue((items) =>
      changes === null ? items.filter((item) => item.key !== key) : items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const incoming = Array.from(files).map((file) => ({ key: crypto.randomUUID(), file }));

    // Catch the obvious problems here so people aren't left waiting on an
    // upload that was never going to work. The backend checks again anyway.
    setQueue((items) => [
      ...items,
      ...incoming.map(({ key, file }): QueuedFile => {
        if (!ACCEPTED_TYPES.includes(file.type)) return { key, file, status: "error", error: "Only JPG, PNG, WEBP or GIF images, please." };
        if (file.size > MAX_BYTES) return { key, file, status: "error", error: "This one's over 10 MB." };
        return { key, file, status: "uploading" };
      }),
    ]);

    // One at a time. Big images are held in memory while they're encrypted,
    // so doing them all at once could get heavy.
    for (const { key, file } of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) continue;

      try {
        const res = await apiFetch<Upload & { detail?: string }>("/uploads", {
          body: { filename: file.name, data: await toBase64(file) },
        });
        if (res.ok && res.data) {
          setUploads((current) => [res.data as Upload, ...(current ?? [])]);
          updateQueued(key, null);
        } else if (res.status === 401) {
          updateQueued(key, { status: "error", error: "Your session has ended. Please log in again." });
        } else {
          updateQueued(key, { status: "error", error: res.data?.detail ?? "That didn't upload. Please try again." });
        }
      } catch {
        updateQueued(key, { status: "error", error: "We couldn't reach the server. Check your connection and try again." });
      }
    }
  }, []);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-foreground bg-black/[.03] dark:bg-white/[.04]" : "border-black/[.12] dark:border-white/[.18]"
        }`}
      >
        <svg className="h-8 w-8 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-4.5-4.5L7 20" />
        </svg>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag images here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Choose images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          aria-label="Choose images to upload"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            // Clear it so picking the same file again still counts as a change.
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {queue.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]">
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              {item.status === "uploading" ? (
                <span className="text-zinc-500">Uploading…</span>
              ) : (
                <>
                  <span className="text-red-600 dark:text-red-400">{item.error}</span>
                  <button type="button" onClick={() => updateQueued(item.key, null)} className="text-zinc-500 hover:text-foreground" aria-label={`Dismiss ${item.file.name}`}>
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Your uploads</h2>
        {loadError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">We couldn&apos;t load your uploads. Try refreshing the page.</p>
        ) : uploads === null ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : uploads.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing here yet. Your images will show up here once they&apos;re uploaded.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
            {uploads.map((upload) => (
              <li key={upload.id} className="overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145]">
                <Thumbnail upload={upload} />
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium" title={upload.filename}>
                    {upload.filename}
                  </p>
                  <p className="text-xs text-zinc-500">{formatSize(upload.size)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // A data URL looks like "data:image/png;base64,AAAA…". We only want the part after the comma.
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
