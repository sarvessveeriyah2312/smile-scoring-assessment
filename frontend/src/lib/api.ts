import { decryptPayload, encryptPayload } from "./payload-crypto";

export type ApiResponse<T> = { ok: boolean; status: number; data: T | null };

// Talks to the FastAPI backend through the /api proxy. Bodies are encrypted on
// the way out and responses decrypted on the way back, so callers only ever
// deal with plain objects.
export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<ApiResponse<T>> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(await encryptPayload(options.body)) : undefined,
  });

  // Some responses (like a 204) have no body at all, and if the server is down
  // the proxy may hand back an HTML error page. Either way there's nothing to decrypt.
  let data: T | null = null;
  if (res.headers.get("content-type")?.includes("application/json")) {
    data = await decryptPayload<T>(await res.json()).catch(() => null);
  }

  return { ok: res.ok, status: res.status, data };
}
