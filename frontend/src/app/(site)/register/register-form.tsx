"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { apiFetch } from "@/lib/api";

type FieldErrors = { email?: string; password?: string };

type State =
  | { status: "idle" }
  | { status: "error"; message?: string; fields?: FieldErrors; email: string }
  | { status: "success" };

const FRIENDLY_MESSAGES: Record<keyof FieldErrors, string> = {
  email: "That doesn't look like a valid email address.",
  password: "Use 8–128 characters with at least one letter, one number and one symbol.",
};

// Same rules as RegisterRequest in backend/users/schemas.py.
function passwordRules(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 && password.length <= 128 },
    { label: "A letter", met: /\p{L}/u.test(password) },
    { label: "A number", met: /\p{N}/u.test(password) },
    { label: "A symbol, like ! @ # or ?", met: /[^\p{L}\p{N}\s]/u.test(password) },
  ];
}

async function register(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (passwordRules(password).some((rule) => !rule.met)) {
    return { status: "error", email, fields: { password: FRIENDLY_MESSAGES.password } };
  }

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
  const [password, setPassword] = useState("");

  const [state, formAction, pending] = useActionState(async (prev: State, formData: FormData) => {
    const next = await register(prev, formData);
    // React clears the form after submitting, so clear the checklist with it.
    setPassword("");
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
        onChange={(e) => setPassword(e.target.value)}
        aria-describedby={fields?.password ? "password-error password-rules" : "password-rules"}
        error={fields?.password}
      />
      <ul id="password-rules" className="-mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {passwordRules(password).map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1.5 ${rule.met ? "text-green-700 dark:text-green-400" : "text-zinc-500"}`}>
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {rule.met ? <path d="m5 12 5 5 9-10" /> : <circle cx="12" cy="12" r="3" />}
            </svg>
            {rule.label}
            <span className="sr-only">{rule.met ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>

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
