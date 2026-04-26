import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

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
}
