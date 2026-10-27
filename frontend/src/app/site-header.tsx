import Link from "next/link";
import { HeaderAccount } from "@/auth/header-account";
import { ThemeToggle } from "@/theme/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/[.08] bg-background/80 backdrop-blur dark:border-white/[.145]">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Smile Scoring
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
