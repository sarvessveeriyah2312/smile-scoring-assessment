"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { Smile } from "./smile";

// Mirrors UploadResponse in backend/uploads/schemas.py.
export type Upload = { id: number; filename: string; content_type: string; size: number; created_at: string; smile: Smile | null };

// Images come back encrypted like everything else, so this fetches one,
// decrypts it, and turns it into a local URL an <img> tag can use.
export function useUploadImage(id: number, contentType: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    apiFetch<{ data: string }>(`/uploads/${id}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok || !res.data) return setFailed(true);
        const bytes = Uint8Array.from(atob(res.data.data), (c) => c.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));

    // Free the memory once the image is gone.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, contentType]);

  return { src, failed };
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
