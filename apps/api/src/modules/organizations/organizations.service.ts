import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m: (typeof memberships)[number]) => ({
      organization: m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async createForUser(userId: string, name: string) {
    const org = await this.prisma.organization.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    return org;
  }
}
