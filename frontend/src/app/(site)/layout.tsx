import { SiteHeader } from "../site-header";

// Public pages (home, login, register) get the full-width header on top.
// The logged-in pages in (app) lay the header out next to the sidebar instead.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
