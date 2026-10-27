"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[.06] text-sm font-medium uppercase text-foreground dark:bg-white/[.1]"
        >
          {user.email[0]}
        </span>
        <span className="hidden max-w-48 truncate sm:inline">{user.email}</span>
      </span>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push("/");
        }}
        className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
      >
        Log out
      </button>
    </div>
  );
}
