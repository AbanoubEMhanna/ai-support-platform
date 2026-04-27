import { fetchWithRetry } from '../http/retry';
import type { AiProvider } from './types';

export type LlmChatRequest = {
  system: string;
  user: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  provider?: AiProvider;
  model?: string;
};

export type LlmChatResponse = {
  content: string;
  fallback?: boolean;
};

export type LlmClientOptions = {
  openaiApiKey?: string;
  ollamaBaseUrl?: string;
  lmStudioBaseUrl?: string;
  lmStudioApiKey?: string;
  timeoutMs?: number;
};

export class LlmClient {
  private readonly opts: Required<
    Pick<LlmClientOptions, 'timeoutMs'>
  > &
    LlmClientOptions;

  constructor(opts: LlmClientOptions = {}) {
    this.opts = {
      timeoutMs: 60_000,
      ...opts,
    };
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    const provider = req.provider ?? 'openai';
    if (provider === 'ollama') return this.chatOllama(req);
    if (provider === 'lmstudio') return this.chatLmStudio(req);
    return this.chatOpenAi(req);
  }

  private buildMessages(req: LlmChatRequest) {
    const out: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: req.system },
    ];
    for (const turn of req.history ?? []) out.push(turn);
    out.push({ role: 'user', content: req.user });
    return out;
  }

  private async chatOpenAi(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!this.opts.openaiApiKey) {
      return {
        content:
          'AI is running in fallback mode (no OPENAI_API_KEY). I can retrieve sources, but cannot generate an LLM response.',
        fallback: true,
      };
    }
    const res = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.opts.openaiApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: req.model ?? 'gpt-4.1-mini',
          temperature: 0.2,
          messages: this.buildMessages(req),
        }),
      },
      { timeoutMs: this.opts.timeoutMs, retries: 1 },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI chat failed: ${res.status} ${body}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { content: String(json?.choices?.[0]?.message?.content ?? '') };
  }

  private async chatOllama(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!req.model) throw new Error('Ollama model is required');
    const baseUrl = this.opts.ollamaBaseUrl ?? 'http://localhost:11434';
    const res = await fetchWithRetry(
      `${trimSlash(baseUrl)}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: req.model,
          stream: false,
          options: { temperature: 0.2 },
          messages: this.buildMessages(req),
        }),
      },
      { timeoutMs: this.opts.timeoutMs, retries: 1 },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama chat failed: ${res.status} ${body}`);
    }
    const json = (await res.json()) as { message?: { content?: string } };
    return { content: String(json?.message?.content ?? '') };
  }

  private async chatLmStudio(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!req.model) throw new Error('LM Studio model is required');
    const baseUrl = this.opts.lmStudioBaseUrl ?? 'http://localhost:1234';
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.opts.lmStudioApiKey) {
      headers.authorization = `Bearer ${this.opts.lmStudioApiKey}`;
    }
    const res = await fetchWithRetry(
      `${trimSlash(baseUrl)}/v1/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: req.model,
          temperature: 0.2,
          messages: this.buildMessages(req),
        }),
      },
      { timeoutMs: this.opts.timeoutMs, retries: 1 },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LM Studio chat failed: ${res.status} ${body}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { content: String(json?.choices?.[0]?.message?.content ?? '') };
  }
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}
