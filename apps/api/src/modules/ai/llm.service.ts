import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmClient,
  type LlmChatRequest,
  type LlmChatResponse,
} from '@ai-support-platform/shared';

@Injectable()
export class LlmService {
  private readonly client: LlmClient;

  constructor(config: ConfigService) {
    this.client = new LlmClient({
      openaiApiKey: config.get<string>('OPENAI_API_KEY'),
      ollamaBaseUrl: config.get<string>('OLLAMA_BASE_URL'),
      lmStudioBaseUrl: config.get<string>('LM_STUDIO_BASE_URL'),
      lmStudioApiKey: config.get<string>('LM_STUDIO_API_KEY'),
    });
  }

  chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    return this.client.chat(req);
  }
}
