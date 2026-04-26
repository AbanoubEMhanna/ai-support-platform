import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class ChatDto {
  @ApiProperty({
    example: 'How do I reset my password?',
    description: 'User question to answer from indexed documents.',
  })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiPropertyOptional({
    example: '3b8f2c9e-8c87-44e9-baba-9d7f61ddc06d',
    description: 'Existing conversation id. Omit to create a new conversation.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    enum: ['openai', 'ollama', 'lmstudio'],
    example: 'ollama',
    description: 'Chat completion provider. Defaults to openai.',
  })
  @IsOptional()
  @IsIn(['openai', 'ollama', 'lmstudio'])
  provider?: 'openai' | 'ollama' | 'lmstudio';

  @ApiPropertyOptional({
    example: 'llama3.2:latest',
    description:
      'Provider-specific model id selected from GET /ai/models. Required for Ollama/LM Studio.',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
