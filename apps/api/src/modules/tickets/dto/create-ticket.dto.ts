import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: '3b8f2c9e-8c87-44e9-baba-9d7f61ddc06d' })
  @IsString()
  conversationId!: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'MEDIUM' })
  @IsString()
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ example: 'Customer needs a human follow-up.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;
}
