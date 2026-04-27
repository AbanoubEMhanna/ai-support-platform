import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
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
import { OrgGuard } from '../../common/guards/org.guard';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'), OrgGuard)
@ApiTags('Chat')
@ApiCookieAuth('access_token')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @Throttle({ chat: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a RAG chat message' })
  @ApiCreatedResponse({
    description:
      'Saves user/assistant messages and returns answer with sources.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing token or active org context.',
  })
  chatMessage(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.chat.chat({
      organizationId: user.orgId!,
      userId: user.sub,
      message: dto.message,
      conversationId: dto.conversationId,
      provider: dto.provider,
      model: dto.model,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations for the active organization' })
  @ApiOkResponse({
    description: 'Returns conversations visible to the current user.',
  })
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.orgId!, user.sub);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List messages for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation id.' })
  @ApiOkResponse({ description: 'Returns org-scoped conversation messages.' })
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ) {
    return this.chat.listMessages({
      organizationId: user.orgId!,
      userId: user.sub,
      conversationId,
    });
  }
}
