import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingClient } from '@ai-support-platform/shared';

@Injectable()
export class EmbeddingService {
  private readonly client: EmbeddingClient;

  constructor(config: ConfigService) {
    this.client = new EmbeddingClient({
      apiKey: config.get<string>('OPENAI_API_KEY'),
    });
  }

  embed(text: string): Promise<number[]> {
    return this.client.embed(text);
  }

  embedMany(texts: string[]): Promise<number[][]> {
    return this.client.embedMany(texts);
  }
}
