const NONCE_SIZE = 12;

let keyPromise: Promise<CryptoKey> | undefined;

function getKey() {
  // Import the key once and reuse it
  keyPromise ??= (() => {
    const raw = process.env.NEXT_PUBLIC_PAYLOAD_KEY;
    if (!raw) throw new Error("NEXT_PUBLIC_PAYLOAD_KEY is missing. Add it to .env.local.");
    return crypto.subtle.importKey("raw", fromBase64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
  })();
  return keyPromise;
}

export async function encryptValue(value: unknown): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await getKey(), plaintext);

  const out = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  out.set(nonce);
  out.set(new Uint8Array(ciphertext), NONCE_SIZE);
  return toBase64(out);
}

// For file uploads: the raw bytes, encrypted, with no base64 or JSON around them.
export async function encryptBytes(bytes: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await getKey(), bytes);

  const out = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  out.set(nonce);
  out.set(new Uint8Array(ciphertext), NONCE_SIZE);
  return out;
}

export async function decryptValue<T = unknown>(token: string): Promise<T> {
  const raw = fromBase64(token);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: raw.subarray(0, NONCE_SIZE) },
    await getKey(),
    raw.subarray(NONCE_SIZE),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function encryptPayload(payload: Record<string, unknown>): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Object.entries(payload).map(async ([key, value]) => [key, await encryptValue(value)] as const),
  );
  return Object.fromEntries(entries);
}

export async function decryptPayload<T = Record<string, unknown>>(payload: Record<string, string>): Promise<T> {
  const entries = await Promise.all(
    Object.entries(payload).map(async ([key, value]) => [key, await decryptValue(value)] as const),
  );
  return Object.fromEntries(entries) as T;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
