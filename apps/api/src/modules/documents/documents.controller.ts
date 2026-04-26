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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgGuard } from '../../common/guards/org.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @UseGuards(OrgGuard)
  list(@CurrentUser() user: any) {
    return this.documents.list(user.orgId);
  }

  @Post('upload')
  @UseGuards(OrgGuard)
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

