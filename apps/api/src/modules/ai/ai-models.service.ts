import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiModel, AiProvider } from './ai.types';

@Injectable()
export class AiModelsService {
  constructor(private readonly config: ConfigService) {}

  async list(provider: AiProvider): Promise<AiModel[]> {
    if (provider === 'ollama') return this.listOllama();
    if (provider === 'lmstudio') return this.listLmStudio();
    return this.listOpenAi();
  }

  private listOpenAi(): AiModel[] {
    return [
      { id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', provider: 'openai' },
      { id: 'gpt-4.1', name: 'gpt-4.1', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', provider: 'openai' },
    ];
  }

  private async listOllama(): Promise<AiModel[]> {
    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434';
    const res = await fetch(`${trimSlash(baseUrl)}/api/tags`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama model list failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as {
      models?: Array<{ name?: string; model?: string; size?: number }>;
    };

    return (json.models ?? []).reduce<AiModel[]>((items, model) => {
      const id = model.name ?? model.model;
      if (!id) return items;
      items.push({
        id,
        name: id,
        provider: 'ollama',
        details:
          typeof model.size === 'number'
            ? `${Math.round(model.size / 1024 / 1024)} MB`
            : undefined,
      });
      return items;
    }, []);
  }

  private async listLmStudio(): Promise<AiModel[]> {
    const baseUrl =
      this.config.get<string>('LM_STUDIO_BASE_URL') ?? 'http://localhost:1234';
    const res = await fetch(`${trimSlash(baseUrl)}/v1/models`, {
      headers: this.lmStudioHeaders(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LM Studio model list failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as {
      data?: Array<{ id?: string; owned_by?: string }>;
    };

    return (json.data ?? []).reduce<AiModel[]>((items, model) => {
      if (!model.id) return items;
      items.push({
        id: model.id,
        name: model.id,
        provider: 'lmstudio',
        details: model.owned_by,
      });
      return items;
    }, []);
  }

  private lmStudioHeaders() {
    const apiKey = this.config.get<string>('LM_STUDIO_API_KEY');
    return apiKey ? { authorization: `Bearer ${apiKey}` } : undefined;
  }
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}
