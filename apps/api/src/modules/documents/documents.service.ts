import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upload(params: {
    organizationId: string;
    userId: string;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
  }) {
    const { organizationId, userId, file } = params;

    if (!['text/plain', 'application/pdf'].includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const document = await this.prisma.document.create({
      data: {
        organizationId,
        uploadedByUserId: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: '',
        status: DocumentStatus.UPLOADED,
      },
      select: { id: true },
    });

    const storageDir = join(process.cwd(), 'storage', 'documents', organizationId);
    await mkdir(storageDir, { recursive: true });
    const storagePath = join(storageDir, `${document.id}`);

    await writeFile(storagePath, file.buffer);

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: { storagePath },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.queue.enqueueProcessDocument(document.id);

    return updated;
  }
}
