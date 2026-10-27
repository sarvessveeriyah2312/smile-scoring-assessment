"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth-provider";
import { SmileScore } from "@/components/smile-score";
import { apiFetch } from "@/lib/api";
import { isScored, smileLabel } from "@/lib/smile";
import { type Upload, formatDate, formatSize, useUploadImage } from "@/lib/uploads";
import { useBreadcrumbLabel } from "../../breadcrumbs";

export function UploadDetails({ id }: { id: number }) {
  const { user } = useAuth();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [problem, setProblem] = useState<"not-found" | "error" | null>(null);
  // Something like /upload-history/abc can't match anything, so don't bother asking.
  const validId = Number.isInteger(id) && id > 0;

  // Show the filename as the last breadcrumb once we have it.
  useBreadcrumbLabel(upload?.filename);

  const userId = user?.id;
  useEffect(() => {
    if (!userId || !validId) return;
    let cancelled = false;

    // Just the details and score. The image comes from its own path (see Preview).
    apiFetch<Upload>(`/uploads/${id}`).then(
      (res) => {
        if (cancelled) return;
        if (res.ok && res.data) setUpload(res.data);
        else setProblem(res.status === 404 ? "not-found" : "error");
      },
      () => !cancelled && setProblem("error"),
    );

    return () => {
      cancelled = true;
    };
  }, [id, userId, validId]);

  // The score is worked out in the background. Check every 1.5s, and after two
  // minutes stop and say it's taking a while rather than polling forever.
  const [slow, setSlow] = useState(false);
  const pending = upload?.smile?.status === "pending";
  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > 80) {
        clearInterval(timer);
        setSlow(true);
        return;
      }
      apiFetch<Upload>(`/uploads/${id}`).then(
        (res) => res.ok && res.data && setUpload(res.data),
        () => {},
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [pending, id]);

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
      <Preview upload={upload} />

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

        <Breakdown upload={upload} slow={slow} />

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

function Preview({ upload }: { upload: Upload }) {
  const { src, failed } = useUploadImage(upload.id, upload.content_type);

  return (
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-black/[.03] lg:w-[28rem] lg:shrink-0 dark:bg-white/[.04]">
      {src ? (
        // A blob: URL from memory, so next/image's optimiser has nothing to fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={upload.filename} className="h-full w-full object-contain" />
      ) : (
        <span className="text-sm text-zinc-500">{failed ? "Couldn't load the image" : "Loading image…"}</span>
      )}
    </div>
  );
}

// Walks through exactly how this image's number was reached, with its own values.
function Breakdown({ upload, slow }: { upload: Upload; slow: boolean }) {
  const smile = upload.smile;

  if (!smile) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This image was uploaded before smile scoring was added, so it hasn&apos;t been analysed.
      </p>
    );
  }

  if (smile.status === "pending") {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground dark:border-zinc-700" aria-hidden="true" />
        {slow
          ? "This is taking longer than usual. Refresh the page in a minute to check again."
          : "Analysing the photo with MediaPipe. The score will appear here in a moment."}
      </p>
    );
  }

  if (smile.status === "failed") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Something went wrong while analysing this image, so it doesn&apos;t have a score. Try uploading it again.
      </p>
    );
  }

  if (!isScored(smile)) {
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
