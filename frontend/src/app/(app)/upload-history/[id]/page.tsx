import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UploadDetails } from "./upload-details";

export const metadata: Metadata = {
  title: "Upload details",
};

export default function UploadDetailsPage({ params }: PageProps<"/upload-history/[id]">) {
  return (
    <>
      <Link href="/upload-history" className="text-sm text-zinc-500 underline-offset-4 hover:text-foreground hover:underline">
        ← Upload History
      </Link>
      {/* The id only exists at request time, so it's read inside Suspense. */}
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading…</p>}>
        {params.then(({ id }) => (
          <UploadDetails id={Number(id)} />
        ))}
      </Suspense>
    </>
  );
}
