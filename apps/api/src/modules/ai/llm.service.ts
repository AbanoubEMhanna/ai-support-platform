import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './ai.types';

@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  async chat(params: {
    system: string;
    user: string;
    provider?: AiProvider;
    model?: string;
  }) {
    const provider = params.provider ?? 'openai';
    if (provider === 'ollama') return this.chatOllama(params);
    if (provider === 'lmstudio') return this.chatLmStudio(params);
    return this.chatOpenAi(params);
  }

  private async chatOpenAi(params: {
    system: string;
    user: string;
    model?: string;
  }) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return {
        content:
          'AI is running in fallback mode (no OPENAI_API_KEY). I can retrieve sources, but cannot generate an LLM response.',
      };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model ?? 'gpt-4.1-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI chat failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    return { content: String(content ?? '') };
  }

  private async chatOllama(params: {
    system: string;
    user: string;
    model?: string;
  }) {
    const model = params.model;
    if (!model) throw new Error('Ollama model is required');

    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434';
    const res = await fetch(`${trimSlash(baseUrl)}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama chat failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as any;
    return { content: String(json?.message?.content ?? '') };
  }

  private async chatLmStudio(params: {
    system: string;
    user: string;
    model?: string;
  }) {
    const model = params.model;
    if (!model) throw new Error('LM Studio model is required');

    const baseUrl =
      this.config.get<string>('LM_STUDIO_BASE_URL') ?? 'http://localhost:1234';
    const apiKey = this.config.get<string>('LM_STUDIO_API_KEY');
    const res = await fetch(`${trimSlash(baseUrl)}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LM Studio chat failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    return { content: String(content ?? '') };
  }
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}
