import { Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../ai/embedding.service';
import { LlmService } from '../ai/llm.service';

type Source = {
  chunkId: string;
  documentId: string;
  documentName: string;
  excerpt: string;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    private readonly llm: LlmService,
  ) {}

  async listConversations(organizationId: string, userId: string) {
    return this.prisma.conversation.findMany({
      where: { organizationId, userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async listMessages(params: {
    organizationId: string;
    userId: string;
    conversationId: string;
  }) {
    const convo = await this.prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        organizationId: params.organizationId,
        userId: params.userId,
      },
      select: { id: true },
    });
    if (!convo) return [];

    return this.prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, sources: true, createdAt: true },
    });
  }

  async chat(params: {
    organizationId: string;
    userId: string;
    message: string;
    conversationId?: string;
  }) {
    const conversation = params.conversationId
      ? await this.prisma.conversation.findFirst({
          where: {
            id: params.conversationId,
            organizationId: params.organizationId,
            userId: params.userId,
          },
        })
      : null;

    const convo =
      conversation ??
      (await this.prisma.conversation.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          title: null,
        },
      }));

    await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        role: MessageRole.USER,
        content: params.message,
      },
    });

    const queryEmbedding = await this.embeddings.embed(params.message);
    const queryVector = toVectorString(queryEmbedding);

    const rows = await this.prisma.$queryRaw<
      Array<{ chunkId: string; content: string; documentId: string; originalName: string }>
    >`
      SELECT
        dc."id"::text as "chunkId",
        dc."content" as "content",
        d."id"::text as "documentId",
        d."originalName" as "originalName"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      WHERE d."organizationId" = ${params.organizationId}::uuid
        AND d."status" = 'READY'
        AND dc."embedding_vector" IS NOT NULL
      ORDER BY dc."embedding_vector" <=> ${queryVector}::vector
      LIMIT 5
    `;

    const sources: Source[] = rows.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentName: r.originalName,
      excerpt: r.content.slice(0, 300),
    }));

    const system = [
      'You are an AI support assistant for a SaaS product.',
      'Answer using the provided context when relevant.',
      'If you are not sure, say so.',
      'Always be concise.',
    ].join('\n');

    const userPrompt = [
      `Question: ${params.message}`,
      '',
      'Context:',
      ...sources.map(
        (s, i) =>
          `[#${i + 1}] (${s.documentName} / chunk ${s.chunkId}) ${s.excerpt}`,
      ),
    ].join('\n');

    const llmRes = await this.llm.chat({ system, user: userPrompt });

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        role: MessageRole.ASSISTANT,
        content: llmRes.content,
        sources,
      },
      select: { id: true, content: true, sources: true, createdAt: true },
    });

    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: convo.id,
      message: assistantMessage,
    };
  }
}

function toVectorString(values: number[]) {
  return `[${values.map((v) => Number(v).toFixed(6)).join(',')}]`;
}
