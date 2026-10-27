"use client";

import Link from "next/link";
import { useRef } from "react";
import { AppNavLinks } from "./app-sidebar";

export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.06]"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* Native <dialog>: focus stays inside, Esc closes it, the page behind can't be clicked. */}
      <dialog
        ref={dialogRef}
        aria-label="Menu"
        // A click on the <dialog> itself, not its contents, landed on the dimmed backdrop.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-black/[.08] bg-background p-0 text-foreground shadow-xl transition-transform duration-200 backdrop:bg-black/40 starting:open:-translate-x-full dark:border-white/[.145]"
      >
        <div className="flex h-16 items-center justify-between border-b border-black/[.08] px-4 dark:border-white/[.145]">
          <Link href="/" onClick={close} className="text-lg font-semibold tracking-tight">
            Smile Scoring
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav aria-label="App" className="flex flex-col gap-1 p-3">
          <AppNavLinks onNavigate={close} />
        </nav>
      </dialog>
    </div>
  );
}
