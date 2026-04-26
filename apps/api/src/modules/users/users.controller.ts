import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@ApiTags('Users')
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth('access_token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user context' })
  @ApiOkResponse({ description: 'Alias of GET /auth/me.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  me(@CurrentUser() user: any) {
    return user;
  }
}
