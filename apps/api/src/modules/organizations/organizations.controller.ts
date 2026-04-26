import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from './organizations.service';

class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
export class OrganizationsController {
  constructor(
    private readonly orgs: OrganizationsService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.orgs.listForUser(user.sub);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const org = await this.orgs.createForUser(user.sub, dto.name);
    const tokens = await this.auth.issueTokensForOrg(user.sub, org.id);
    this.setAuthCookies(res, tokens);
    return org;
  }

  @Post(':id/switch')
  async switchOrg(
    @CurrentUser() user: any,
    @Param('id') organizationId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.issueTokensForOrg(user.sub, organizationId);
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  private setAuthCookies(res: Response, tokens: any) {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  }
}
