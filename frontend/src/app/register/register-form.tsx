"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { apiFetch } from "@/lib/api";

type FieldErrors = { email?: string; password?: string };

type State =
  | { status: "idle" }
  | { status: "error"; message?: string; fields?: FieldErrors; email: string }
  | { status: "success" };

const FRIENDLY_MESSAGES: Record<keyof FieldErrors, string> = {
  email: "That doesn't look like a valid email address.",
  password: "Your password needs to be between 8 and 128 characters.",
};

async function register(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  type RegisterResponse = {
    email?: string;
    detail?: string | { loc?: string[] }[];
  };

  let res;
  try {
    res = await apiFetch<RegisterResponse>("/auth/register", { body: { email, password } });
  } catch {
    return { status: "error", email, message: "We couldn't reach the server. Check your connection and try again." };
  }

  const body = res.data;

  if (res.ok) return { status: "success" };

  if (res.status === 409) {
    const message = typeof body?.detail === "string" ? body.detail : "That email is already registered.";
    return { status: "error", email, fields: { email: message } };
  }

  if (res.status === 422 && Array.isArray(body?.detail)) {
    const fields: FieldErrors = {};
    for (const err of body.detail) {
      const field = err.loc?.at(-1) as keyof FieldErrors;
      if (field in FRIENDLY_MESSAGES) fields[field] = FRIENDLY_MESSAGES[field];
    }
    return { status: "error", email, fields };
  }

  return { status: "error", email, message: "Something went wrong on our side. Please try again in a moment." };
}

export function RegisterForm() {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(async (prev: State, formData: FormData) => {
    const next = await register(prev, formData);
    // Account's ready, so send them straight to log in with it. The flag just
    // tells the login page to say "your account is ready".
    if (next.status === "success") router.push("/login?registered=1");
    return next;
  }, { status: "idle" });

  const fields = state.status === "error" ? state.fields : undefined;

  return (
    <form action={formAction} noValidate className="mt-6 flex flex-col gap-4">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        // Keep what they typed if the form comes back with an error.
        defaultValue={state.status === "error" ? state.email : ""}
        error={fields?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={fields?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-lg bg-foreground font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending || state.status === "success" ? "Creating your account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
