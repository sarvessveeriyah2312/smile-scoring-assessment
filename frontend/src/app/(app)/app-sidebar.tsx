"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useLayoutEffect, useSyncExternalStore } from "react";
import { isSidebarCollapsed, restoreSidebar, setSidebarCollapsed, subscribeToSidebar } from "@/sidebar/sidebar";

const NAV_ITEMS = [
  { href: "/upload", label: "Upload", icon: UploadIcon },
  { href: "/upload-history", label: "Upload History", icon: HistoryIcon },
];

export function AppSidebar() {
  // Only used for the button's label and aria state. The actual width is
  // all CSS, driven by data-sidebar on <html>.
  const collapsed = useSyncExternalStore(subscribeToSidebar, isSidebarCollapsed, () => false);

  // React's dev-mode remount wipes the attribute the inline script set, so put
  // it back. Does nothing in production.
  useLayoutEffect(restoreSidebar, []);

  return (
    // Phones get a strip under the header instead, so collapsing only applies from md up.
    // From md up it runs the full height of the window, beside the header,
    // and stays put while the page next to it scrolls.
    <aside className="hidden border-r border-black/[.08] transition-[width] duration-200 md:sticky md:top-0 md:col-start-1 md:row-span-2 md:row-start-1 md:block md:h-dvh md:w-44 md:self-start [[data-sidebar=collapsed]_&]:md:w-14 dark:border-white/[.145]">
      <div className="md:flex md:h-full md:flex-col">
        {/* Same height as the header with the same bottom border, so the two read as one bar.
            The name hides when folded and the button moves to the middle. */}
        <div className="hidden h-16 shrink-0 items-center justify-between border-b border-black/[.08] px-3 md:flex [[data-sidebar=collapsed]_&]:justify-center dark:border-white/[.145]">
          <Link href="/" className="truncate pl-3 font-semibold tracking-tight [[data-sidebar=collapsed]_&]:hidden">
            Smile Scoring
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
          >
            <svg
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
        </div>

        <nav aria-label="App" className="flex flex-1 flex-col gap-1 px-3 py-6">
          <AppNavLinks collapsed={collapsed} />
        </nav>
      </div>
    </aside>
  );
}

type NavLinksProps = { collapsed?: boolean; onNavigate?: () => void };

// Shared by the sidebar and the mobile menu.
export function AppNavLinks(props: NavLinksProps) {
  // On pages like /upload-history/42 the URL isn't known until the request comes in,
  // so reading it waits inside Suspense. Meanwhile the links show without the highlight.
  return (
    <Suspense fallback={<NavLinks pathname={null} {...props} />}>
      <CurrentNavLinks {...props} />
    </Suspense>
  );
}

function CurrentNavLinks(props: NavLinksProps) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

function NavLinks({ pathname, collapsed = false, onNavigate }: NavLinksProps & { pathname: string | null }) {
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            // When the label is hidden, the tooltip is the only way to know what an icon is.
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [[data-sidebar=collapsed]_&]:md:justify-center [[data-sidebar=collapsed]_&]:md:px-0 ${
              active
                ? "bg-black/[.06] text-foreground dark:bg-white/[.1]"
                : "text-zinc-600 hover:bg-black/[.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.06]"
            }`}
          >
            <Icon />
            {/* sr-only rather than removed, so screen readers still hear "Upload". */}
            <span className="truncate [[data-sidebar=collapsed]_&]:md:sr-only">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

function UploadIcon() {
  return (
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
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function HistoryIcon() {
  return (
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
