import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

const ALLOWED_MIMES = new Set(['text/plain', 'application/pdf']);
const DEFAULT_QUOTA_BYTES = 500 * 1024 * 1024;
const MAX_FILENAME_LEN = 200;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
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
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    };
  }) {
    const { organizationId, userId, file } = params;

    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('Empty file');
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    await this.verifyMime(file.buffer, file.mimetype);
    await this.enforceQuota(organizationId, file.size);

    const safeName = sanitizeFilename(file.originalname);

    const document = await this.prisma.document.create({
      data: {
        organizationId,
        uploadedByUserId: userId,
        originalName: safeName,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: '',
        status: DocumentStatus.UPLOADED,
      },
      select: { id: true },
    });

    const storageDir = join(
      process.cwd(),
      'storage',
      'documents',
      organizationId,
    );
    await mkdir(storageDir, { recursive: true });
    const storagePath = join(storageDir, document.id);

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

    try {
      await this.queue.enqueueProcessDocument(document.id);
    } catch (err) {
      this.logger.error(
        `enqueue failed for doc=${document.id}: ${(err as Error)?.message ?? err}`,
      );
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: 'queue unavailable',
        },
      });
      throw new BadRequestException(
        'Could not enqueue document for processing. Please retry.',
      );
    }

    return updated;
  }

  private async verifyMime(buffer: Buffer, declared: string) {
    if (declared === 'text/plain') {
      // Heuristic: text/plain rarely has a magic number. Reject if the buffer
      // sniffs as a known binary type (e.g. PDF declared as txt).
      const sniffed = await fileTypeFromBuffer(buffer).catch(() => undefined);
      if (sniffed) {
        throw new BadRequestException(
          `Declared text/plain but file looks like ${sniffed.mime}`,
        );
      }
      return;
    }

    const sniffed = await fileTypeFromBuffer(buffer).catch(() => undefined);
    if (!sniffed || sniffed.mime !== declared) {
      throw new BadRequestException(
        `Declared ${declared} but file content is ${sniffed?.mime ?? 'unknown'}`,
      );
    }
  }

  private async enforceQuota(organizationId: string, incomingSize: number) {
    const quota = this.quotaBytes();
    const agg = await this.prisma.document.aggregate({
      where: { organizationId },
      _sum: { size: true },
    });
    const used = agg._sum.size ?? 0;
    if (used + incomingSize > quota) {
      throw new ForbiddenException(
        `Organization storage quota exceeded (${used + incomingSize} > ${quota} bytes)`,
      );
    }
  }

  private quotaBytes() {
    const v = this.config.get<string>('ORG_STORAGE_QUOTA_BYTES');
    const n = v ? Number(v) : DEFAULT_QUOTA_BYTES;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_QUOTA_BYTES;
  }
}

function sanitizeFilename(name: string) {
  const stripped = basename((name ?? '').replace(/\\/g, '/').trim());
  const cleaned = stripped.replace(/[^A-Za-z0-9._-]+/g, '_');
  const safe = cleaned.length > 0 ? cleaned : 'upload';
  return safe.length > MAX_FILENAME_LEN
    ? safe.slice(0, MAX_FILENAME_LEN)
    : safe;
}
