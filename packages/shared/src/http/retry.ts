export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

export type RetryOptions = {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryOn?: (status: number) => boolean;
};

const DEFAULT_RETRY_ON = (status: number) =>
  status === 429 || (status >= 500 && status <= 599);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
  opts: RetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const minDelay = opts.minDelayMs ?? 250;
  const maxDelay = opts.maxDelayMs ?? 4_000;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retryOn = opts.retryOn ?? DEFAULT_RETRY_ON;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || !retryOn(res.status) || attempt === retries) {
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt === retries) break;
    }
    const jitter = Math.random() * minDelay;
    const delay = Math.min(minDelay * Math.pow(2, attempt) + jitter, maxDelay);
    await sleep(delay);
  }
  throw lastErr ?? new Error('fetchWithRetry exhausted');
}
