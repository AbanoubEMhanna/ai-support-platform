import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AiModelsService } from './ai-models.service';
import type { AiProvider } from './ai.types';

const AI_PROVIDERS = ['openai', 'ollama', 'lmstudio'] as const;

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
@ApiTags('AI')
@ApiCookieAuth('access_token')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly models: AiModelsService) {}

  @Get('models')
  @ApiOperation({ summary: 'List chat models for a provider' })
  @ApiQuery({
    name: 'provider',
    enum: AI_PROVIDERS,
    required: false,
    description: 'Model provider to inspect. Defaults to openai.',
  })
  @ApiOkResponse({
    description:
      'Returns normalized model ids for OpenAI, Ollama, or LM Studio.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listModels(@Query('provider') provider?: string) {
    return this.models.list(parseProvider(provider));
  }
}

function parseProvider(value?: string): AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
    ? (value as AiProvider)
    : 'openai';
}
