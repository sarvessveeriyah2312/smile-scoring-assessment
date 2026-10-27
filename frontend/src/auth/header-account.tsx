"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-provider";

const pillButton =
  "rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]";

export function HeaderAccount() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (user === undefined) {
    return <div aria-hidden="true" className="h-9 w-28 animate-pulse rounded-full bg-black/[.06] dark:bg-white/[.1]" />;
  }

  if (!user) {
    return (
      <Link href="/register" className={pillButton}>
        Get started
      </Link>
    );
  }

  return <AccountMenu email={user.email} onLogout={logout} afterLogout={() => router.push("/")} />;
}

function AccountMenu({ email, onLogout, afterLogout }: { email: string; onLogout: () => Promise<void>; afterLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logOut() {
    setLoggingOut(true);
    await onLogout();
    setOpen(false);
    afterLogout();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.06]"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[.06] text-sm font-medium uppercase text-foreground dark:bg-white/[.1]"
        >
          {email[0]}
        </span>
        <span className="hidden max-w-48 truncate sm:inline">{email}</span>
        <span className="sr-only sm:hidden">Account menu for {email}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id="account-menu"
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-black/[.08] bg-background py-1 shadow-lg dark:border-white/[.145]"
        >
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="mt-0.5 text-sm font-medium break-all">{email}</p>
          </div>
          <div className="my-1 border-t border-black/[.08] dark:border-white/[.145]" />
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={logOut}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-black/[.04] focus:bg-black/[.04] focus:outline-none disabled:opacity-60 dark:text-red-400 dark:hover:bg-white/[.06] dark:focus:bg-white/[.06]"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
              <path d="M10 17l-5-5 5-5" />
              <path d="M5 12h11" />
            </svg>
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
