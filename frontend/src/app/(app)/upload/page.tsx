import type { Metadata } from "next";
import { UploadPanel } from "./upload-panel";

export const metadata: Metadata = {
  title: "Upload",
};

export default function UploadPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Add your images here. JPG, PNG, WEBP or GIF, up to 10 MB each.</p>
      <UploadPanel />
    </>
  );
}
