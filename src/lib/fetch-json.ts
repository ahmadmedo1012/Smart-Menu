// Hardened JSON fetch: AbortController timeout + res.ok + content-type check,
// retries with linear backoff. Fixes cold-start /api/plans returning non-JSON 200.
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson<T>(
  url: string,
  opts?: { retries?: number; timeoutMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? DEFAULT_RETRIES;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Unexpected content-type: ${contentType || "(none)"}`);
        }
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      if (attempt >= retries) throw err;
      attempt += 1;
      await sleep(500 * attempt);
    }
  }
}