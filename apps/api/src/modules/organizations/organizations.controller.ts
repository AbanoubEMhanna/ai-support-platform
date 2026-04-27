import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
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
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { setAuthCookies } from '../../common/http/cookies';
import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from './organizations.service';

class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Support', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;
}

@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
@ApiTags('Organizations')
@ApiCookieAuth('access_token')
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly orgs: OrganizationsService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organizations for the current user' })
  @ApiOkResponse({
    description: 'Returns memberships and organizations available to the user.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  list(@CurrentUser() user: AuthUser) {
    return this.orgs.listForUser(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organization and switch active org' })
  @ApiCreatedResponse({
    description:
      'Creates an organization, owner membership, and sets new auth cookies.',
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const org = await this.orgs.createForUser(user.sub, dto.name);
    const tokens = await this.auth.issueTokensForOrg(user.sub, org.id);
    setAuthCookies(res, tokens);
    return org;
  }

  @Post(':id/switch')
  @ApiOperation({ summary: 'Switch active organization' })
  @ApiParam({
    name: 'id',
    description: 'Organization id where the user has membership.',
  })
  @ApiOkResponse({
    description: 'Sets a new token pair scoped to the selected organization.',
  })
  async switchOrg(
    @CurrentUser() user: AuthUser,
    @Param('id') organizationId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.issueTokensForOrg(user.sub, organizationId);
    setAuthCookies(res, tokens);
    return { ok: true };
  }
}
