"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Do the work here. Return an error message to keep the dialog open and show it, or nothing when it worked. */
  onConfirm: () => Promise<string | void>;
  onClose: () => void;
};

// Built on the browser's own <dialog>, which already traps focus, closes on Esc,
// blocks the page behind it and tells screen readers it's a modal.
export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", cancelLabel = "Cancel", onConfirm, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (busy) return;
    setError(null);
    onClose();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const problem = await onConfirm().catch(() => "Something went wrong. Please try again.");
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      // Esc fires "cancel". Route it through close() so it's ignored mid-delete.
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // A click that lands on the <dialog> itself (not its contents) was on the dimmed backdrop.
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-black/[.08] bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:border-white/[.145]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <div id="confirm-dialog-message" className="mt-1 text-sm break-words text-zinc-600 dark:text-zinc-400">
              {message}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* autoFocus on the safe choice, so a reflexive Enter doesn't delete anything. */}
          <button
            type="button"
            autoFocus
            onClick={close}
            disabled={busy}
            className="h-10 rounded-lg border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-70"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
