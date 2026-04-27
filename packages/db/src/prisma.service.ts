import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withOrgScopeGuard } from './org-scope';

const LIFECYCLE_KEYS = new Set([
  'onModuleInit',
  'onModuleDestroy',
  '$connect',
  '$disconnect',
]);

/**
 * NestJS-injectable Prisma client.
 *
 * Internally we hold a real PrismaClient (so `$connect`/`$disconnect` work) and
 * expose a guarded view (via `$extends`) for every other access. Existing
 * callsites like `this.prisma.user.findMany(...)` keep working unchanged but
 * org-scoped models now throw at runtime if the where-clause omits
 * `organizationId` (or the parent scope key for related models).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    const guarded = withOrgScopeGuard(this);

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }
        if (LIFECYCLE_KEYS.has(prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const guardedValue = (guarded as unknown as Record<string, unknown>)[
          prop
        ];
        if (guardedValue !== undefined) {
          return typeof guardedValue === 'function'
            ? (guardedValue as Function).bind(guarded)
            : guardedValue;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
