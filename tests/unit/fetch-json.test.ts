/**
 * Round87-D5 — src/lib/fetch-json.ts unit coverage (was 0% lcov).
 * global fetch is stubbed; covers the hardened contract: res.ok gate,
 * content-type gate, AbortController timeout, linear-backoff retries.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson } from '@/lib/fetch-json';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, contentType = 'application/json', status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': contentType },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchMock.mockReset();
});

describe('fetchJson — success paths', () => {
  it('returns parsed JSON for a 200 application/json response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ plans: [1, 2, 3] }));

    const data = await fetchJson<{ plans: number[] }>('https://example.com/api/plans');

    expect(data).toEqual({ plans: [1, 2, 3] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // the request always carries an AbortController signal (timeout wiring)
    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('accepts application/json with charset parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }, 'application/json; charset=utf-8'));

    await expect(fetchJson('https://example.com/x')).resolves.toEqual({ ok: true });
  });
});

describe('fetchJson — hard failures (retries: 0 → first error surfaces)', () => {
  it('non-2xx status throws HTTP <status>', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, 'application/json', 500));

    await expect(fetchJson('https://example.com/x', { retries: 0 })).rejects.toThrow('HTTP 500');
  });

  it('non-JSON content-type throws Unexpected content-type (the cold-start HTML case)', async () => {
    fetchMock.mockResolvedValue(jsonResponse('<html>hi</html>', 'text/html'));

    await expect(fetchJson('https://example.com/x', { retries: 0 })).rejects.toThrow(
      'Unexpected content-type: text/html'
    );
  });

  it('missing content-type header is reported as "(none)"', async () => {
    // a real Response auto-sets text/plain for string bodies — duck-type
    // the response instead to force a genuinely absent content-type
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: async () => ({}),
    });

    await expect(fetchJson('https://example.com/x', { retries: 0 })).rejects.toThrow(
      'Unexpected content-type: (none)'
    );
  });

  it('network rejection propagates the original error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchJson('https://example.com/x', { retries: 0 })).rejects.toThrow('fetch failed');
  });
});

describe('fetchJson — retry behavior (linear backoff)', () => {
  it('retries after a network failure and succeeds on attempt 2', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const data = await fetchJson('https://example.com/x', { retries: 1 });

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries non-JSON bodies too (content-type gate is retryable), then gives up', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse('<html>502 page</html>', 'text/html'))
      .mockResolvedValueOnce(jsonResponse('<html>502 page</html>', 'text/html'));

    await expect(fetchJson('https://example.com/x', { retries: 1 })).rejects.toThrow(
      'Unexpected content-type: text/html'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries exhausted: the LAST error is the one thrown', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'));

    await expect(fetchJson('https://example.com/x', { retries: 1 })).rejects.toThrow('boom-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchJson — AbortController timeout', () => {
  it('a hung fetch is aborted by the timeout and the abort error surfaces', async () => {
    vi.useFakeTimers();
    // never resolves on its own — only the abort signal can end it
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    const pending = fetchJson('https://example.com/x', { retries: 0, timeoutMs: 8000 });
    // attach the rejection handler BEFORE firing the timer, otherwise the
    // rejection is briefly unhandled and vitest flags it as a suite error
    const assertion = expect(pending).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
