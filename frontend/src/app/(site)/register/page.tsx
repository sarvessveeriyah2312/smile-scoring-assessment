import type { Metadata } from "next";
import { GoogleButton } from "@/components/google-button";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans sm:px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sign up with Google, or with just an email and password.
        </p>
        <GoogleButton label="Sign up with Google" />
        <RegisterForm />
      </div>
    </main>
  );
}
