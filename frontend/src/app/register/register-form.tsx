"use client";

import { useActionState } from "react";

type FieldErrors = { email?: string; password?: string };

type State =
  | { status: "idle" }
  | { status: "error"; message?: string; fields?: FieldErrors; email: string }
  | { status: "success"; email: string };

const FRIENDLY_MESSAGES: Record<keyof FieldErrors, string> = {
  email: "That doesn't look like a valid email address.",
  password: "Your password needs to be between 8 and 128 characters.",
};

async function register(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  let res: Response;
  try {
    res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { status: "error", email, message: "We couldn't reach the server. Check your connection and try again." };
  }

  if (res.ok) return { status: "success", email };

  const body = await res.json().catch(() => null);

  if (res.status === 409) {
    return { status: "error", email, fields: { email: body?.detail ?? "That email is already registered." } };
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
  const [state, formAction, pending] = useActionState(register, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
        You&apos;re all set! We&apos;ve created an account for <strong>{state.email}</strong>.
      </div>
    );
  }

  const fields = state.status === "error" ? state.fields : undefined;

  return (
    <form action={formAction} noValidate className="mt-6 flex flex-col gap-4">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        // Keep what they typed if the form comes back with an error.
        defaultValue={state.status === "error" ? state.email : ""}
        error={fields?.email}
      />
      <Field
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
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  ...input
}: { label: string; name: string; error?: string; hint?: string } & React.ComponentProps<"input">) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="h-11 rounded-lg border border-black/[.12] bg-transparent px-3 outline-none focus:border-foreground aria-[invalid=true]:border-red-500 dark:border-white/[.18]"
        {...input}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="text-sm text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
