import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { EmbeddingService } from '../embeddings/embedding.service';
import { PrismaService } from '../prisma/prisma.service';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

@Injectable()
export class DocumentProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async process(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) return;

    await this.prisma.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.PROCESSING, errorMessage: null },
    });

    try {
      const text = await this.extractText(document.storagePath, document.mimeType);

      await this.prisma.documentChunk.deleteMany({
        where: { documentId: document.id },
      });

      const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.embeddings.embed(chunk);

        const created = await this.prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: i,
            content: chunk,
            embedding,
          },
          select: { id: true },
        });

        const vectorStr = toVectorString(embedding);
        await this.prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET "embedding_vector" = ${vectorStr}::vector
          WHERE "id" = ${created.id}::uuid
        `;
      }

      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.READY },
      });
    } catch (err) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: (err as any)?.message ?? String(err),
        },
      });
      throw err;
    }
  }

  private async extractText(storagePath: string, mimeType: string) {
    const data = await readFile(storagePath);
    if (mimeType === 'text/plain') {
      return data.toString('utf8');
    }
    if (mimeType === 'application/pdf') {
      // Lazy import to reduce startup time
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default ?? (pdfParseModule as any);
      const result = await pdfParse(data);
      return String(result.text ?? '');
    }
    throw new Error('Unsupported mime type');
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
