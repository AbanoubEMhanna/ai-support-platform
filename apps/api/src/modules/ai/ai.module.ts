import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiModelsService } from './ai-models.service';
import { EmbeddingService } from './embedding.service';
import { LlmService } from './llm.service';

@Module({
  controllers: [AiController],
  providers: [AiModelsService, EmbeddingService, LlmService],
  exports: [AiModelsService, EmbeddingService, LlmService],
})
export class AiModule {}
