import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgGuard } from '../../common/guards/org.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
@ApiTags('Documents')
@ApiCookieAuth('access_token')
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @UseGuards(OrgGuard)
  @ApiOperation({ summary: 'List documents for the active organization' })
  @ApiOkResponse({
    description: 'Returns org-scoped documents and processing statuses.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing token or active org context.',
  })
  list(@CurrentUser() user: any) {
    return this.documents.list(user.orgId);
  }

  @Post('upload')
  @UseGuards(OrgGuard)
  @ApiOperation({
    summary: 'Upload a TXT or PDF document for async processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'TXT or PDF document up to 10MB.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Creates a document with UPLOADED status and enqueues processing.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.documents.upload({
      organizationId: user.orgId,
      userId: user.sub,
      file,
    });
  }
}
