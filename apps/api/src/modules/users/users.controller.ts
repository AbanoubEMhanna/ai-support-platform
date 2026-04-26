import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: any) {
    return user;
  }
}

