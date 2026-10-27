"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Fragment, Suspense, useContext, useEffect, useState } from "react";

type Crumb = { label: string; href?: string };

// Lets a page swap the last crumb for something it only knows after loading,
// like the filename on an upload's details page.
const LabelContext = createContext<{ label: string | null; setLabel: (label: string | null) => void }>({
  label: null,
  setLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return <LabelContext value={{ label, setLabel }}>{children}</LabelContext>;
}

/** Call from a page to name the last crumb. It's cleared again when the page goes away. */
export function useBreadcrumbLabel(label: string | null | undefined) {
  const { setLabel } = useContext(LabelContext);
  useEffect(() => {
    setLabel(label ?? null);
    return () => setLabel(null);
  }, [label, setLabel]);
}

function crumbsFor(pathname: string, label: string | null): Crumb[] {
  if (pathname === "/upload") return [{ label: "Upload" }];
  if (pathname === "/upload-history") return [{ label: "Upload History" }];
  if (pathname.startsWith("/upload-history/")) {
    return [{ label: "Upload History", href: "/upload-history" }, { label: label ?? "Upload details" }];
  }
  return [];
}

export function Breadcrumbs() {
  // Reading the URL on /upload-history/42 has to wait for the request, same as
  // the sidebar, so it sits in Suspense. Nothing shows for that split second.
  return (
    <Suspense fallback={null}>
      <CurrentBreadcrumbs />
    </Suspense>
  );
}

function CurrentBreadcrumbs() {
  const pathname = usePathname();
  const { label } = useContext(LabelContext);
  const crumbs = crumbsFor(pathname, label);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden="true" className="text-zinc-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </li>
              )}
              {/* Earlier crumbs keep their size; the current one gives way and truncates. */}
              <li className={last ? "min-w-0" : "shrink-0"}>
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="text-zinc-500 transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="block truncate font-medium" title={crumb.label}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
