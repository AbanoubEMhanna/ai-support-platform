import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgGuard } from '../../common/guards/org.guard';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'), OrgGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  chatMessage(@CurrentUser() user: any, @Body() dto: ChatDto) {
    return this.chat.chat({
      organizationId: user.orgId,
      userId: user.sub,
      message: dto.message,
      conversationId: dto.conversationId,
    });
  }

  @Get('conversations')
  list(@CurrentUser() user: any) {
    return this.chat.listConversations(user.orgId, user.sub);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: any, @Param('id') conversationId: string) {
    return this.chat.listMessages({
      organizationId: user.orgId,
      userId: user.sub,
      conversationId,
    });
  }
}
