"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { type User, useAuth } from "@/auth/auth-provider";
import { FormField } from "@/components/form-field";
import { apiFetch } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "error"; message: string; email: string }
  | { status: "success"; user: User };

async function login(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      status: "error",
      email,
      message: "Please enter both your email and your password.",
    };
  }

  let res;
  try {
    res = await apiFetch<User>("/auth/login", {
      body: { email, password },
    });
  } catch {
    return {
      status: "error",
      email,
      message:
        "We couldn't reach the server. Check your connection and try again.",
    };
  }

  if (res.ok && res.data) return { status: "success", user: res.data };

  if (res.status === 401 || res.status === 422) {
    return {
      status: "error",
      email,
      message: "That email and password don't match our records.",
    };
  }

  return {
    status: "error",
    email,
    message: "Something went wrong on our side. Please try again in a moment.",
  };
}

export function JustRegisteredNotice() {
  const justRegistered = useSearchParams().get("registered") === "1";
  if (!justRegistered) return null;

  return (
    <p
      role="status"
      className="mt-6 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200"
    >
      Your account is ready. Log in to get going.
    </p>
  );
}

export function LoginForm({ notice }: { notice?: React.ReactNode }) {
  const { setUser } = useAuth();

  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      const next = await login(prev, formData);
      if (next.status === "success") setUser(next.user);
      return next;
    },
    { status: "idle" },
  );
  
  if (state.status === "success") {
    return (
      <div
        role="status"
        className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200"
      >
        Welcome back, <strong>{state.user.email}</strong>. You&apos;re logged in.
      </div>
    );
  }

  return (
    <>
      {notice}
      <form action={formAction} noValidate className="mt-6 flex flex-col gap-4">
        {state.status === "error" && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {state.message}
          </p>
        )}

        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.status === "error" ? state.email : ""}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-lg bg-foreground font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {pending ? "Logging you in…" : "Log in"}
        </button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}
