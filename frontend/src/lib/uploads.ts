"use client";

import { useEffect, useState } from "react";
import { decryptBytes } from "./payload-crypto";
import type { Smile } from "./smile";

// Mirrors UploadResponse in backend/uploads/schemas.py.
export type Upload = { id: number; filename: string; content_type: string; size: number; created_at: string; smile: Smile | null };

// Fetches an image from its own path, still encrypted, decrypts it here, and
// only then turns it into a local URL the <img> tag can use. The browser keeps
// the encrypted copy and checks back with the server each time, so repeat
// views are a quick "not modified" rather than the whole file again.
export function useUploadImage(id: number, contentType: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetch(`/api/uploads/${id}/image`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Image request failed: ${res.status}`);
        const image = await decryptBytes(await res.arrayBuffer());
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([image], { type: contentType }));
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
