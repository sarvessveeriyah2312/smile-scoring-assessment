"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { SmileScore } from "@/components/smile-score";
import { apiFetch } from "@/lib/api";
import { smileLabel } from "@/lib/smile";
import { type Upload, formatDate, formatSize } from "@/lib/uploads";

export function UploadDetails({ id }: { id: number }) {
  const { user } = useAuth();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [problem, setProblem] = useState<"not-found" | "error" | null>(null);
  // Something like /upload-history/abc can't match anything, so don't bother asking.
  const validId = Number.isInteger(id) && id > 0;

  const userId = user?.id;
  useEffect(() => {
    if (!userId || !validId) return;
    let url: string | null = null;
    let cancelled = false;

    // One request gets both the details and the (encrypted) image itself.
    apiFetch<Upload & { data?: string }>(`/uploads/${id}`).then(
      (res) => {
        if (cancelled) return;
        if (!res.ok || !res.data) return setProblem(res.status === 404 ? "not-found" : "error");
        const { data, ...details } = res.data;
        setUpload(details);
        if (data) {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          url = URL.createObjectURL(new Blob([bytes], { type: details.content_type }));
          setImageSrc(url);
        }
      },
      () => !cancelled && setProblem("error"),
    );

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, userId, validId]);

  if (!validId || problem === "not-found") {
    return (
      <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <p>We couldn&apos;t find that image. It may have been deleted.</p>
        <Link href="/upload-history" className="mt-2 inline-block font-medium text-foreground underline-offset-4 hover:underline">
          Back to Upload History
        </Link>
      </div>
    );
  }
  if (problem === "error") {
    return <p className="mt-6 text-sm text-red-600 dark:text-red-400">We couldn&apos;t load this image. Try refreshing the page.</p>;
  }
  if (!upload) return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start">
      <Preview src={imageSrc} alt={upload.filename} />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div>
          <h1 className="truncate text-2xl font-semibold tracking-tight" title={upload.filename}>
            {upload.filename}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatSize(upload.size)} · {upload.content_type.replace("image/", "").toUpperCase()} · Uploaded {formatDate(upload.created_at, true)}
          </p>
        </div>

        <section className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Smile score</h2>
          <div className="mt-3">
            <SmileScore smile={upload.smile} />
          </div>
        </section>

        <Breakdown upload={upload} />

        <div className="flex gap-3">
          <Link
            href="/upload"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Upload another
          </Link>
          <Link
            href="/upload-history"
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            See all uploads
          </Link>
        </div>
      </div>
    </div>
  );
}

function Preview({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-black/[.03] lg:w-[28rem] lg:shrink-0 dark:bg-white/[.04]">
      {src ? (
        // A blob: URL from memory, so next/image's optimiser has nothing to fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <span className="text-sm text-zinc-500">Couldn&apos;t load the image</span>
      )}
    </div>
  );
}

// Walks through exactly how this image's number was reached, with its own values.
function Breakdown({ upload }: { upload: Upload }) {
  const smile = upload.smile;

  if (!smile) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This image was uploaded before smile scoring was added, so it hasn&apos;t been analysed.
      </p>
    );
  }

  if (!smile.face_found || smile.score === null || smile.smile_left === null || smile.smile_right === null) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        MediaPipe Face Landmarker couldn&apos;t find a face in this image, so there&apos;s nothing to score. Clear, front-on photos
        with the whole face in view work best.
      </p>
    );
  }

  const rows = [
    { name: "mouthSmileLeft", value: smile.smile_left, hint: "How far the left corner of the mouth is pulled up" },
    { name: "mouthSmileRight", value: smile.smile_right, hint: "How far the right corner of the mouth is pulled up" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">How this score was worked out</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        MediaPipe Face Landmarker found a face and rated each side of the smile from 0 (not at all) to 1 (fully).
      </p>

      <div className="overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-left text-xs text-zinc-500 dark:bg-white/[.04]">
            <tr>
              <th className="px-4 py-2 font-medium">Blendshape</th>
              <th className="px-4 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-black/[.06] dark:border-white/[.1]">
                <td className="px-4 py-3">
                  <code className="text-[13px]">{row.name}</code>
                  <p className="text-xs text-zinc-500">{row.hint}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.value.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-lg bg-black/[.03] px-4 py-3 font-mono text-[13px] tabular-nums dark:bg-white/[.04]">
        ({smile.smile_left.toFixed(4)} + {smile.smile_right.toFixed(4)}) / 2 × 100 = {smile.score.toFixed(1)}
      </p>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        That puts it in the <strong className="text-foreground">{smileLabel(smile.score)}</strong> band. If the two sides
        are far apart, the smile is lopsided; the score still takes the average of both.
      </p>
    </section>
  );
}
