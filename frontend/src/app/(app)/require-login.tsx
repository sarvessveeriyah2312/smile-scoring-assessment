"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/auth/auth-provider";

export function RequireLogin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  return (
    <>
      {!user && (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          {user === undefined ? "Loading…" : "Taking you to log in…"}
        </div>
      )}
      <div className={user ? "contents" : "hidden"}>{children}</div>
    </>
  );
}
