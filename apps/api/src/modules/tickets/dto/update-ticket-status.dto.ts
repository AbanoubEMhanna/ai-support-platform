import { IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsString()
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

