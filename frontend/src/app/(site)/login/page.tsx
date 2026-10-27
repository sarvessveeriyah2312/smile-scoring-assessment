import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleButton } from "@/components/google-button";
import { LoginForm, LoginNotice } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans sm:px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Good to see you. Choose how you&apos;d like to sign in.</p>
        <LoginForm
          notice={
            // Reads the URL, so it fills in after the rest of the page is shown.
            <Suspense fallback={null}>
              <LoginNotice />
            </Suspense>
          }
          google={<GoogleButton />}
        />
      </div>
    </main>
  );
}
