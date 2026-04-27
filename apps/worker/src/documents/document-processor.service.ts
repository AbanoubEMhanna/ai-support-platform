import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, Prisma } from '@prisma/client';
import { readFile, stat } from 'node:fs/promises';
import { EmbeddingService } from '../embeddings/embedding.service';
import { PrismaService } from '../prisma/prisma.service';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const PROCESSING_LOCK_MS = 60_000;
const DEFAULT_PDF_MAX_TEXT_BYTES = 5_000_000;
const DEFAULT_PDF_MAX_PAGES = 200;

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    private readonly config: ConfigService,
  ) {}

  async process(documentId: string, correlationId?: string) {
    const log = (msg: string) =>
      this.logger.log(
        `[doc=${documentId}${correlationId ? ` cid=${correlationId}` : ''}] ${msg}`,
      );

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      log('document not found, skipping');
      return;
    }

    if (
      document.status === DocumentStatus.PROCESSING &&
      Date.now() - document.updatedAt.getTime() < PROCESSING_LOCK_MS
    ) {
      log('another worker is processing recently, skipping');
      return;
    }

    if (document.status === DocumentStatus.READY) {
      log('document already READY, reprocessing');
    }

    await this.prisma.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.PROCESSING, errorMessage: null },
    });

    try {
      const text = await this.extractText(
        document.storagePath,
        document.mimeType,
      );

      const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
      log(`extracted text chunks=${chunks.length}`);

      if (chunks.length === 0) {
        await this.prisma.$transaction(async (tx) => {
          await tx.documentChunk.deleteMany({
            where: { documentId: document.id },
          });
          await tx.document.update({
            where: { id: document.id },
            data: { status: DocumentStatus.READY },
          });
        });
        return;
      }

      const embeddings = await this.embeddings.embedMany(chunks);
      if (embeddings.length !== chunks.length) {
        throw new Error('embedding count mismatch');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.documentChunk.deleteMany({
          where: { documentId: document.id },
        });

        for (let i = 0; i < chunks.length; i++) {
          const created = await tx.documentChunk.create({
            data: {
              documentId: document.id,
              chunkIndex: i,
              content: chunks[i],
              embedding: embeddings[i],
            },
            select: { id: true },
          });

          const vectorStr = toVectorString(embeddings[i]);
          await tx.$executeRaw`
            UPDATE "DocumentChunk"
            SET "embedding_vector" = ${vectorStr}::vector
            WHERE "id" = ${created.id}::uuid
          `;
        }

        await tx.document.update({
          where: { id: document.id },
          data: { status: DocumentStatus.READY },
        });
      }, { timeout: 60_000, maxWait: 5_000 });

      log('processed READY');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? 'unknown error');
      this.logger.error(
        `[doc=${documentId}] processing failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      await this.prisma.document
        .update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.FAILED,
            errorMessage: message.slice(0, 1000),
          },
        })
        .catch(() => undefined);
      throw err;
    }
  }

  private async extractText(storagePath: string, mimeType: string) {
    const stats = await stat(storagePath).catch(() => null);
    if (!stats) throw new Error(`storage file missing: ${storagePath}`);

    const data = await readFile(storagePath);

    if (mimeType === 'text/plain') {
      const maxBytes = this.maxTextBytes();
      if (data.byteLength > maxBytes) {
        throw new Error(
          `text file exceeds max size ${maxBytes} bytes (got ${data.byteLength})`,
        );
      }
      return data.toString('utf8');
    }

    if (mimeType === 'application/pdf') {
      const pdfParseModule = (await import('pdf-parse')) as unknown as {
        default?: (
          buffer: Buffer,
          options?: { max?: number },
        ) => Promise<{ text: string; numpages?: number }>;
      };
      const pdfParse =
        pdfParseModule.default ??
        (pdfParseModule as unknown as (
          buffer: Buffer,
          options?: { max?: number },
        ) => Promise<{ text: string; numpages?: number }>);

      const maxPages = this.maxPdfPages();
      const result = await pdfParse(data, { max: maxPages });

      const text = String(result.text ?? '');
      const maxTextBytes = this.maxTextBytes();
      if (Buffer.byteLength(text, 'utf8') > maxTextBytes) {
        throw new Error(
          `extracted PDF text exceeds max size ${maxTextBytes} bytes`,
        );
      }
      return text;
    }

    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  private maxTextBytes() {
    const v = this.config.get<string>('PDF_MAX_TEXT_BYTES');
    const n = v ? Number(v) : DEFAULT_PDF_MAX_TEXT_BYTES;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_PDF_MAX_TEXT_BYTES;
  }

  private maxPdfPages() {
    const v = this.config.get<string>('PDF_MAX_PAGES');
    const n = v ? Number(v) : DEFAULT_PDF_MAX_PAGES;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_PDF_MAX_PAGES;
  }
}

function chunkText(text: string, size: number, overlap: number) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function toVectorString(values: number[]) {
  return `[${values.map((v) => Number(v).toFixed(6)).join(',')}]`;
}

// Suppresses unused import warnings in transitive type compilation.
void Prisma;
