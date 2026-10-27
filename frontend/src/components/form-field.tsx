"use client";

import { useState } from "react";

// A labelled input with room underneath for a hint or an error. Shared by the
// register and login forms so they look and behave the same.
export function FormField({
  label,
  name,
  error,
  hint,
  labelAside,
  type,
  ...input
}: { label: string; name: string; error?: string; hint?: string; labelAside?: React.ReactNode } & React.ComponentProps<"input">) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-lg border border-black/[.12] bg-transparent px-3 outline-none focus:border-foreground aria-[invalid=true]:border-red-500 dark:border-white/[.18] ${isPassword ? "pr-11" : ""}`}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            aria-controls={name}
            title={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-zinc-500 transition-colors hover:text-foreground"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {revealed ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.9 10.1 2 12c1 2.5 5 7 10 7a10 10 0 0 0 5.4-1.6" />
                </>
              ) : (
                <>
                  <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="text-sm text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
