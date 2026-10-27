import Link from "next/link";
import { HeaderAccount } from "@/auth/header-account";
import { ThemeToggle } from "@/theme/theme-toggle";

// `leading` replaces the name on the left. The app passes its breadcrumbs here,
// since the sidebar already shows the name.
export function SiteHeader({ leading, className = "" }: { leading?: React.ReactNode; className?: string }) {
  return (
    <header className={`sticky top-0 z-10 border-b border-black/[.08] bg-background/80 backdrop-blur dark:border-white/[.145] ${className}`}>
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6">
        {leading ?? (
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Smile Scoring
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
