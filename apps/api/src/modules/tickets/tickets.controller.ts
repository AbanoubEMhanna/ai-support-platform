import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgGuard } from '../../common/guards/org.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'), OrgGuard, RolesGuard)
@ApiTags('Tickets')
@ApiCookieAuth('access_token')
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets for the active organization' })
  @ApiOkResponse({ description: 'Returns org-scoped tickets.' })
  @ApiUnauthorizedResponse({
    description: 'Missing token or active org context.',
  })
  list(@CurrentUser() user: AuthUser) {
    return this.tickets.list(user.orgId!);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a manual support ticket from a conversation',
  })
  @ApiCreatedResponse({
    description: 'Creates a ticket scoped to the active organization.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.tickets.create({
      organizationId: user.orgId!,
      createdByUserId: user.sub,
      conversationId: dto.conversationId,
      priority: dto.priority,
      note: dto.note,
    });
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update ticket status (OWNER or ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Ticket id.' })
  @ApiOkResponse({ description: 'Updates and returns the ticket.' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus({
      organizationId: user.orgId!,
      ticketId,
      status: dto.status,
    });
  }
}
