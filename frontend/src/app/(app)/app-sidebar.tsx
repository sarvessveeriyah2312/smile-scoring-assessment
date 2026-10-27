"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { isSidebarCollapsed, restoreSidebar, setSidebarCollapsed, subscribeToSidebar } from "@/sidebar/sidebar";

const NAV_ITEMS = [{ href: "/upload", label: "Upload", icon: UploadIcon }];

export function AppSidebar() {
  const pathname = usePathname();
  // Only used for the button's label and aria state. The actual width is
  // all CSS, driven by data-sidebar on <html>.
  const collapsed = useSyncExternalStore(subscribeToSidebar, isSidebarCollapsed, () => false);

  // React's dev-mode remount wipes the attribute the inline script set, so put
  // it back. Does nothing in production.
  useLayoutEffect(restoreSidebar, []);

  return (
    // Phones get a strip across the top instead, so collapsing only applies from md up.
    // From md up it's always the full height of the screen under the 4rem header,
    // and stays put while the content next to it scrolls.
    <aside className="border-b border-black/[.08] transition-[width] duration-200 md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-44 md:shrink-0 md:self-start md:border-r md:border-b-0 sidebar-collapsed:md:w-14 dark:border-white/[.145]">
      <div className="md:flex md:h-full md:flex-col">
        <nav aria-label="App" className="flex gap-1 overflow-x-auto px-4 py-3 md:flex-1 md:flex-col md:px-3 md:py-6">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                // When the label is hidden, the tooltip is the only way to know what an icon is.
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors sidebar-collapsed:md:justify-center sidebar-collapsed:md:px-0 ${
                  active
                    ? "bg-black/[.06] text-foreground dark:bg-white/[.1]"
                    : "text-zinc-600 hover:bg-black/[.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.06]"
                }`}
              >
                <Icon />
                {/* sr-only rather than removed, so screen readers still hear "Upload". */}
                <span className="truncate sidebar-collapsed:md:sr-only">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-black/[.08] p-3 md:block dark:border-white/[.145]">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-foreground sidebar-collapsed:justify-center sidebar-collapsed:px-0 dark:hover:bg-white/[.06]"
          >
            <svg className="h-4 w-4 shrink-0 transition-transform sidebar-collapsed:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
            <span className="truncate sidebar-collapsed:sr-only">Collapse</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}
