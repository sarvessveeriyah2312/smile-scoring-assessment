import { AppSidebar } from "./app-sidebar";
import { RequireLogin } from "./require-login";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireLogin>
      <div className="flex w-full flex-1 flex-col md:flex-row">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 py-8 font-sans sm:px-6 md:py-10">{children}</main>
      </div>
    </RequireLogin>
  );
}
