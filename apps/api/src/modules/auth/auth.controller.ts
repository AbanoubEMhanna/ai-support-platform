import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../../common/http/cookies';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Register a user and create the first organization',
  })
  @ApiCreatedResponse({
    description: 'Returns the registered user and sets auth cookies.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(dto);
    setAuthCookies(res, tokens);
    return user;
  }

  @Post('login')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in using email and password' })
  @ApiOkResponse({ description: 'Returns the user and sets auth cookies.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto);
    setAuthCookies(res, tokens);
    return user;
  }

  @Post('refresh')
  @Throttle({ auth: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate refresh token from the refresh_token cookie',
  })
  @ApiOkResponse({
    description: 'Returns ok=true and sets a fresh token pair.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return { ok: false };

    const tokens = await this.auth.refreshFromJwt(refreshToken);
    setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth('access_token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out and revoke refresh tokens' })
  @ApiOkResponse({ description: 'Clears auth cookies and returns ok=true.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sub);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth('access_token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user context' })
  @ApiOkResponse({
    description:
      'Returns JWT user context including active orgId when available.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  me(@CurrentUser() user: AuthUser) {
    return {
      sub: user.sub,
      email: user.email,
      orgId: user.orgId ?? null,
      role: user.role ?? null,
    };
  }
}
