import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgGuard } from '../../common/guards/org.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'), OrgGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.tickets.list(user.orgId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.tickets.create({
      organizationId: user.orgId,
      createdByUserId: user.sub,
      conversationId: dto.conversationId,
      priority: dto.priority,
      note: dto.note,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus({
      organizationId: user.orgId,
      ticketId,
      status: dto.status,
    });
  }
}

