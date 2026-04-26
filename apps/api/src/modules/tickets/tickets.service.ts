import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.ticket.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conversationId: true,
        status: true,
        priority: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(params: {
    organizationId: string;
    createdByUserId: string;
    conversationId: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    note?: string;
  }) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.ticket.create({
      data: {
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        createdByUserId: params.createdByUserId,
        priority: params.priority as TicketPriority,
        note: params.note,
      },
      select: {
        id: true,
        conversationId: true,
        status: true,
        priority: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateStatus(params: {
    organizationId: string;
    ticketId: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  }) {
    if (!Object.values(TicketStatus).includes(params.status as any)) {
      throw new BadRequestException('Invalid status');
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: params.ticketId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: params.status as TicketStatus },
      select: {
        id: true,
        conversationId: true,
        status: true,
        priority: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

