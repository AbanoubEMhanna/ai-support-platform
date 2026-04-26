import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

const EMBEDDING_DIM = 1536;

@Injectable()
export class EmbeddingService {
  constructor(private readonly config: ConfigService) {}

  async embed(text: string): Promise<number[]> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) return fakeEmbedding(text);

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI embeddings failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as any;
    const embedding = json?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
      throw new Error('Invalid embedding response');
    }
    return embedding.map((n: any) => Number(n));
  }
}

function fakeEmbedding(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const out = new Array<number>(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const b = hash[i % hash.length];
    out[i] = (b / 255) * 2 - 1;
  }
  return out;
}

