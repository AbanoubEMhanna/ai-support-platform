import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    example: 'IN_PROGRESS',
  })
  @IsString()
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}
