import { SiteHeader } from "../site-header";
import { AppSidebar } from "./app-sidebar";
import { BreadcrumbProvider, Breadcrumbs } from "./breadcrumbs";
import { RequireLogin } from "./require-login";

// On a phone everything stacks: header, then the nav strip, then the page.
// From md up the sidebar takes the whole left side, top to bottom, and the
// header and page sit in the column next to it.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbProvider>
      <div className="grid flex-1 grid-cols-1 grid-rows-[auto_auto_1fr] md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[auto_1fr]">
        <SiteHeader leading={<Breadcrumbs />} className="md:col-start-2 md:row-start-1" />
        <AppSidebar />
        <div className="flex min-w-0 flex-col md:col-start-2 md:row-start-2">
          <RequireLogin>
            <main className="min-w-0 flex-1 px-4 py-8 font-sans sm:px-6 md:py-10">{children}</main>
          </RequireLogin>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
