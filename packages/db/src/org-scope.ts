import type { PrismaClient } from '@prisma/client';

const ORG_SCOPED_MODELS = new Set(['Document', 'Conversation', 'Ticket']);

// Models that scope through a parent — keys are the column names that satisfy the guard.
const SCOPED_VIA_RELATION: Record<string, string[]> = {
  DocumentChunk: ['documentId', 'document'],
  Message: ['conversationId', 'conversation'],
};

const SAFE_OPS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'upsert',
  'aggregate',
  'count',
  'groupBy',
]);

const READ_OR_UPDATE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'updateMany',
  'deleteMany',
  'update',
  'delete',
]);

type ArgsWithWhere = { where?: unknown };

function whereMentions(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((v) => whereMentions(v, key));
  const obj = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return true;
  for (const k of Object.keys(obj)) {
    if (whereMentions(obj[k], key)) return true;
  }
  return false;
}

function findUniqueArgsAreById(
  args: ArgsWithWhere | undefined,
): boolean {
  if (!args || !args.where || typeof args.where !== 'object') return false;
  const w = args.where as Record<string, unknown>;
  return typeof w.id === 'string';
}

export function withOrgScopeGuard(client: PrismaClient) {
  return client.$extends({
    name: 'orgScopeGuard',
    query: {
      $allModels: {
        async $allOperations(params) {
          const { model, operation, args, query } = params as {
            model?: string;
            operation: string;
            args: unknown;
            query: (args: unknown) => Promise<unknown>;
          };

          if (!model) return query(args);

          const isOrgScoped = ORG_SCOPED_MODELS.has(model);
          const relationKeys = SCOPED_VIA_RELATION[model];
          if (!isOrgScoped && !relationKeys) return query(args);

          if (SAFE_OPS.has(operation)) return query(args);

          const a = args as ArgsWithWhere | undefined;
          const isUniqueLikeById =
            (operation === 'findUnique' ||
              operation === 'findUniqueOrThrow' ||
              operation === 'update' ||
              operation === 'delete') &&
            findUniqueArgsAreById(a);

          if (isOrgScoped && READ_OR_UPDATE_OPS.has(operation)) {
            if (isUniqueLikeById) return query(args);
            if (!whereMentions(a?.where, 'organizationId')) {
              throw new Error(
                `[org-scope] ${model}.${operation} called without 'organizationId' filter. ` +
                  `Add it to the where clause for tenant safety.`,
              );
            }
          }

          if (relationKeys && READ_OR_UPDATE_OPS.has(operation)) {
            if (isUniqueLikeById) return query(args);
            const hasParentScope = relationKeys.some((k) =>
              whereMentions(a?.where, k),
            );
            if (!hasParentScope) {
              throw new Error(
                `[org-scope] ${model}.${operation} called without a parent filter (${relationKeys.join(' / ')}). ` +
                  `Tenant safety requires scoping via the parent.`,
              );
            }
          }

          return query(args);
        },
      },
    },
  });
}
