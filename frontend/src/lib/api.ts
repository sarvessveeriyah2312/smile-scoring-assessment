import { decryptPayload, encryptBytes, encryptPayload, encryptValue } from "./payload-crypto";

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

  return readResponse<T>(res);
}

// Sends a file as multipart/form-data. The file's bytes and its name are both
// encrypted first, and the part itself is just called "upload.bin" so the real
// name doesn't slip out in the multipart headers.
export async function apiUpload<T = Record<string, unknown>>(path: string, file: File): Promise<ApiResponse<T>> {
  const form = new FormData();
  form.append("filename", await encryptValue(file.name));
  form.append("file", new Blob([await encryptBytes(await file.arrayBuffer())], { type: "application/octet-stream" }), "upload.bin");

  // No Content-Type header here: the browser sets it, boundary and all.
  return readResponse<T>(await fetch(`/api${path}`, { method: "POST", body: form }));
}

async function readResponse<T>(res: Response): Promise<ApiResponse<T>> {
  // Some responses (like a 204) have no body at all, and if the server is down
  // the proxy may hand back an HTML error page. Either way there's nothing to decrypt.
  let data: T | null = null;
  if (res.headers.get("content-type")?.includes("application/json")) {
    try {
      const text = await res.text();
      if (text) data = await decryptPayload<T>(JSON.parse(text));
    } catch {
      // Unreadable or undecryptable: leave data as null and let the status code speak.
    }
  }

  return { ok: res.ok, status: res.status, data };
}
