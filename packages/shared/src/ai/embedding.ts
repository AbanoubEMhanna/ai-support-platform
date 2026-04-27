import { createHash } from 'node:crypto';
import { fetchWithRetry } from '../http/retry';

export const EMBEDDING_DIM = 1536;
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export type EmbeddingClientOptions = {
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  batchSize?: number;
};

export class EmbeddingClient {
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly batchSize: number;

  constructor(opts: EmbeddingClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.retries = opts.retries ?? 3;
    this.batchSize = opts.batchSize ?? 64;
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedMany([text]);
    return vec;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) return texts.map(fakeEmbedding);

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const res = await fetchWithRetry(
        'https://api.openai.com/v1/embeddings',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
        },
        { retries: this.retries, timeoutMs: this.timeoutMs },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenAI embeddings failed: ${res.status} ${body}`);
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>;
      };
      const data = (json?.data ?? [])
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      for (const row of data) {
        const e = row.embedding;
        if (!Array.isArray(e) || e.length !== EMBEDDING_DIM) {
          throw new Error('Invalid embedding response');
        }
        out.push(e.map((n) => Number(n)));
      }
    }
    return out;
  }
}

export function fakeEmbedding(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const out = new Array<number>(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const b = hash[i % hash.length];
    out[i] = (b / 255) * 2 - 1;
  }
  return out;
}
