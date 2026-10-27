"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
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

const WEAK_PATTERNS = /password|qwerty|letmein|welcome|admin|abc123|111111|123456|(.)\1{3,}|0123|1234|2345|3456|4567|5678|6789/i;

const STRENGTH = [
  { label: "Weak", bar: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-700 dark:text-lime-400" },
  { label: "Strong", bar: "bg-green-600", text: "text-green-700 dark:text-green-400" },
];

// A rough estimate: length and variety push it up, obvious patterns pull it down.
// Anything that misses the required rules stays Weak.
function passwordStrength(password: string) {
  if (!password) return null;
  if (passwordRules(password).some((rule) => !rule.met)) return STRENGTH[0];

  let points = 0;
  if (password.length >= 12) points++;
  if (password.length >= 16) points++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) points++;
  if ((password.match(/[^\p{L}\p{N}\s]/gu) ?? []).length >= 2) points++;
  if (WEAK_PATTERNS.test(password)) points -= 2;

  return STRENGTH[Math.max(0, Math.min(3, points))];
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
        labelAside={<PasswordRulesInfo password={password} />}
      />
      <StrengthMeter password={password} />

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

function StrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const level = strength ? STRENGTH.indexOf(strength) : -1;

  return (
    <div className="-mt-2 flex items-center gap-3">
      <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
        {STRENGTH.map((step, i) => (
          <span
            key={step.label}
            className={`h-1.5 rounded-full transition-colors ${strength && i <= level ? strength.bar : "bg-black/[.08] dark:bg-white/[.12]"}`}
          />
        ))}
      </div>
      <p aria-live="polite" className={`w-14 text-right text-xs font-medium ${strength ? strength.text : "text-zinc-400"}`}>
        <span className="sr-only">Password strength: </span>
        {strength?.label ?? ""}
      </p>
    </div>
  );
}

function PasswordRulesInfo({ password }: { password: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Password requirements"
        aria-expanded={open}
        aria-controls="password-rules"
        title="Password requirements"
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-black/[.2] text-[11px] font-bold text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:border-white/[.25] dark:text-zinc-400 dark:hover:bg-white/[.08]"
      >
        !
      </button>
      {/* Hidden rather than removed when closed, so the field can still point screen readers at it. */}
      <ul
        id="password-rules"
        hidden={!open}
        className="absolute top-full left-0 z-20 mt-2 w-60 rounded-xl border border-black/[.08] bg-background p-3 text-xs shadow-lg dark:border-white/[.145]"
      >
        <li className="mb-2 text-sm font-medium text-foreground">Your password needs</li>
        {passwordRules(password).map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1.5 py-0.5 ${rule.met ? "text-green-700 dark:text-green-400" : "text-zinc-500"}`}>
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {rule.met ? <path d="m5 12 5 5 9-10" /> : <circle cx="12" cy="12" r="3" />}
            </svg>
            {rule.label}
            <span className="sr-only">{rule.met ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
    </span>
  );
}
