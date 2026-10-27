"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { apiUpload } from "@/lib/api";

type QueuedFile = { key: string; file: File; status: "uploading" | "done" | "error"; error?: string };


const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

export function UploadPanel() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        const res = await apiUpload<{ detail?: string }>("/uploads", file);
        if (res.ok) {
          // Leave it in the list as done, so people can see it worked.
          updateQueued(key, { status: "done" });
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
              ) : item.status === "done" ? (
                <>
                  <span className="text-green-700 dark:text-green-400">Uploaded</span>
                  <Link href="/upload-history" className="text-zinc-500 underline-offset-4 hover:text-foreground hover:underline">
                    View in history
                  </Link>
                </>
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
    </div>
  );
}
