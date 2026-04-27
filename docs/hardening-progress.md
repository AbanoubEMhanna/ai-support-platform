# Hardening Progress

Tracks the state of the production-grade hardening pass for `ai-support-platform`. The full plan lives in the approved plan file (`/Users/abanoubmhanna/.claude/plans/add-plan-to-do-rustling-matsumoto.md`).

Last updated: 2026-04-27.

---

## Phase 1 — Security & correctness ✅ SHIPPED

### Confirmed bugs fixed

| #   | Bug                                                         | Fix                                                                                                                                                                                  |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Refresh-token lookup picked "most recent" not the matching token — multi-device sessions broken | `RefreshToken.tokenHashSha256 String @unique` added. Refresh now looks up by SHA-256 of the presented token, then argon2-verifies against `tokenHash`.                               |
| 2   | Cookies hardcoded `secure: false`                           | Centralized `setAuthCookies` / `clearAuthCookies` helpers in `apps/api/src/common/http/cookies.ts`; `secure` flips on `NODE_ENV=production`. Auth + organizations controllers updated. |
| 3   | Worker ack-on-failure + `setTimeout` retry → data loss on crash | Replaced with a RabbitMQ retry queue: dedicated retry exchange + TTL-based dead-letter back to main, max 5 attempts then DLQ. Reconnect-on-close + `onModuleDestroy` cleanup. |
| 4   | Embedding split-brain — chunk insert + `embedding_vector` UPDATE were separate non-tx steps | Both are now inside a single `prisma.$transaction(async (tx) => …)`. Status flips to READY only after commit.                                                                       |
| 5   | Re-processing wiped chunks before insert; mid-flight crash → empty doc | Same transaction wraps `deleteMany` + per-chunk `create` + raw `UPDATE … embedding_vector` + final `Document.update`.                                                              |
| 6   | Queue publish was fire-and-forget — uploads could 200 while job lost | API uses `createConfirmChannel` with a 5s confirm timeout. Failed publish → 5xx + document marked FAILED.                                                                            |
| 7   | Duplicated `EmbeddingService` between API and worker        | Single `EmbeddingClient` in `@ai-support-platform/shared/ai/embedding.ts` (batching, retry/backoff, timeouts). Both apps' services are thin wrappers.                                |
| 8   | Duplicated `PrismaService` between API and worker           | Canonical `PrismaService` lives in `@ai-support-platform/db`. Both apps re-export it.                                                                                                |
| 9   | Web `eslint` disabled `@typescript-eslint/no-explicit-any`  | Deferred to Phase 6 (web overhaul); flagged here for tracking.                                                                                                                       |

### New defenses added

- **Helmet** + **compression** + **1 MB body limit** + tightened CORS (`apps/api/src/main.ts`).
- **`@nestjs/throttler`** global with per-route buckets:
  - `auth`: register 5/min, login 10/min, refresh 30/min.
  - `upload`: 30/min.
  - `chat`: 30/min.
  - `default`: 120/min.
- **Password policy** (`RegisterDto`): ≥12 chars, must contain a letter, a digit, and a symbol.
- **Env validation at boot** — zod schemas in `@ai-support-platform/shared/env.ts`. `validateApiEnv` / `validateWorkerEnv` throw before listening if:
  - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` missing or <32 chars.
  - The two JWT secrets are equal.
  - `DATABASE_URL` / `REDIS_URL` / `RABBITMQ_URL` missing.
- **Upload safety** (`apps/api/src/modules/documents/documents.service.ts`):
  - `file-type` magic-byte sniff verifies declared mime.
  - Filename sanitization (strip path separators, alphanum/`.`/`_`/`-` only, ≤200 chars).
  - Per-org disk quota check (`ORG_STORAGE_QUOTA_BYTES`, default 500 MB) before write.
- **Multi-tenancy safety net** (`packages/db/src/org-scope.ts`):
  - Prisma `$extends` query hook on `PrismaService`.
  - Throws if `Document` / `Conversation` / `Ticket` queries miss `organizationId`.
  - Throws if `DocumentChunk` / `Message` queries miss the parent-scope key (`documentId` / `conversationId`).
  - `findUnique({ where: { id } })` and `update`/`delete` by id are still allowed.
- **RBAC enforced** — `RolesGuard` + `@Roles('OWNER','ADMIN')` on `PATCH /tickets/:id/status`. Policy in `docs/rbac.md`.
- **Graceful shutdown**:
  - API: `app.enableShutdownHooks()` + `helmet` proxy trust.
  - Worker: `app.enableShutdownHooks()` + `SIGTERM`/`SIGINT` handlers; `QueueConsumerService.onModuleDestroy` cancels the consume tag, drains, closes channel + connection.
- **Worker observability seed** — structured logs with `[doc=...]` and `cid=...` tags; `correlationId` is propagated through every queue message via the `x-correlation-id` header.
- **PDF safety** — `PDF_MAX_PAGES` (default 200) and `PDF_MAX_TEXT_BYTES` (default 5 MB) caps in `document-processor.service.ts`.
- **Idempotent processing** — at the top of `process()`, if `document.status === PROCESSING` and `updatedAt` within 60 s, the worker skips (another worker is on it).

### Files changed (high-level)

```
packages/shared/                              NEW package
  src/env.ts                                  zod env validators
  src/cookies.ts                              cookie option helpers
  src/queue/topology.ts                       RabbitMQ exchanges/queues/retry policy
  src/ai/{types,embedding,llm}.ts             shared AI clients
  src/http/retry.ts                           fetchWithRetry helper
packages/db/
  src/prisma.ts                               + guardedPrisma
  src/prisma.service.ts                       moved here from apps/*/src/prisma
  src/org-scope.ts                            NEW org-scope Prisma extension
  prisma/schema.prisma                        + RefreshToken.tokenHashSha256
docker/postgres/init/001_init.sql             + RefreshToken.tokenHashSha256
docker/postgres/upgrades/                     NEW dir
  2026-04-add_refresh_token_sha256.sql        non-destructive upgrade
apps/api/src/
  main.ts                                     helmet, compression, body limits, env validation, shutdown hooks
  app.module.ts                               + ThrottlerModule + APP_GUARD
  modules/auth/auth.service.ts                refresh-token lookup fix
  modules/auth/auth.controller.ts             cookie helpers, throttle decorators, AuthUser typing
  modules/auth/dto/{register,login}.dto.ts    password policy
  modules/organizations/organizations.controller.ts cookie helper, AuthUser typing
  modules/documents/documents.service.ts      mime sniff, filename sanitize, per-org quota, awaited enqueue
  modules/documents/documents.controller.ts   throttle, AuthUser typing
  modules/queue/queue.service.ts              confirm channel, reconnect, durable topology
  modules/chat/chat.controller.ts             throttle, AuthUser typing
  modules/tickets/tickets.controller.ts       RolesGuard + @Roles on status update
  modules/ai/{embedding,llm}.service.ts       thin wrappers around @ai-support-platform/shared
  prisma/prisma.service.ts                    re-exports from packages/db
apps/worker/src/
  main.ts                                     env validation, shutdown hooks
  queue/queue-consumer.service.ts             new ack/nack semantics, retry exchange, DLQ, reconnect, prefetch=4
  documents/document-processor.service.ts    transactional reprocess, PDF caps, idempotency, batched embeddings, structured logs
  embeddings/embedding.service.ts             thin wrapper around @ai-support-platform/shared
  prisma/prisma.service.ts                    re-exports from packages/db
docs/rbac.md                                  NEW policy table
docs/hardening-progress.md                    THIS file
CLAUDE.md                                     updated to reflect new architecture
```

### Verification (local)

- `pnpm -r build` — green across api / worker / web / shared / db.
- `pnpm -r lint` — 0 errors (warnings are pre-existing prettier formatting).

### Manual upgrade steps for an existing dev environment

1. Apply the refresh-token SHA-256 column to your running Postgres volume (one-time):
   ```bash
   docker exec -i ai_support_postgres psql -U postgres -d ai_support \
     < docker/postgres/upgrades/2026-04-add_refresh_token_sha256.sql
   ```
   Existing refresh tokens are revoked by the upgrade — every user signs in once.
2. Update `.env`:
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be ≥32 characters and differ from each other; the API throws on boot otherwise.
3. RabbitMQ topology change — the queue name moved from `PROCESS_DOCUMENT` to `process_document` (with retry exchange + DLQ). The old queue is orphaned and harmless; delete it via the management UI (`http://localhost:15672`) when convenient.
4. Regenerate Prisma client + reinstall (already wired into install / dev):
   ```bash
   pnpm install
   pnpm -C packages/db prisma:generate
   ```

---

## What's left (per the approved plan)

### Phase 2 — DB & schema canonicalization (~1 day)

- Generate initial Prisma migration from current schema (`prisma migrate dev --name init`).
- Add a manual migration `add_pgvector.sql` for the `vector` extension, the `embedding_vector` column, the ivfflat index, and the `RefreshToken.tokenHashSha256` column added in Phase 1.
- Delete `docker/postgres/init/001_init.sql`; remove the init mount from `docker-compose.yml`.
- CI runs `prisma migrate deploy` against an ephemeral Postgres (testcontainers in tests).
- Update `CLAUDE.md` and `docs/local-dev.md` to swap the init-script path for `prisma migrate`.

### Phase 3 — Reliability, retries, observability (~3 days)

- **Structured logging** — `nestjs-pino` in API + worker; `RequestIdMiddleware` reads/generates `X-Request-ID` and binds it to every log line; queue messages already carry `correlationId`, just need to read it back into the worker logger context.
- **Embedding/LLM resilience** — already added retry/backoff in Phase 1; remaining work is exposing `OPENAI_EMBEDDING_BATCH` env override and a per-provider timeout matrix.
- **Health & metrics**:
  - `GET /health/live` (liveness) and `GET /health/ready` (DB + MQ + Redis ping).
  - `GET /metrics` via `prom-client`: `chat_request_duration_seconds`, `embedding_request_duration_seconds`, `document_processing_duration_seconds`, `queue_publish_failures_total`, `queue_dlq_messages_total`.
- **Audit log** — `AuditEvent` model (`organizationId, userId, action, targetType, targetId, metadata, createdAt`). `AuditService.record(...)` called from auth, org, documents, chat, tickets.

### Phase 4 — API surface polish (~2 days)

- **Pagination & filtering** — `PaginationDto { page=1, pageSize=20 (max 100) }` + `SortDto`. Apply to documents, conversations, messages, tickets. Response envelope `{ items, page, pageSize, total }`.
- **Idempotency** — `Idempotency-Key` header on `POST /chat`, `POST /documents/upload`, `POST /tickets`. New `IdempotencyKey` table (TTL 24h via cleanup cron); replay stored response on duplicate.
- **API versioning** — global `/v1` prefix.
- **Swagger completeness** — `@ApiOperation` + every `@Api*Response` (200, 401, 403, 404, 429) on every route. Shared envelope schemas via `@ApiExtraModels`.
- **RAG quality**:
  - System prompt rewritten to refuse if `sources.length === 0` and surface `suggestEscalation: true`.
  - Cite sources by `[#i]` in answer text.
  - Include last 10 conversation messages as additional context.
  - Auto-title endpoint `POST /chat/conversations/:id/title` enqueued via a new `GENERATE_TITLE` queue.

### Phase 5 — Testing (~3 days)

- **Unit tests** — `auth.service.spec` (incl. multi-device refresh regression), `chat.service.spec`, `document-processor.service.spec` (chunkText edges, transaction rollback), worker queue retry math, org-scope Prisma extension throws when filter missing.
- **Integration tests (testcontainers)** — full register → org create → upload → READY → chat → ticket flow; auth multi-device; org switch isolation.
- **Web e2e (Playwright)** — register, upload, chat, ticket, logout flows.
- **CI** — `.github/workflows/ci.yml` jobs: install → typecheck (`tsc --noEmit -p` per app) → lint → unit → integration → e2e (PRs only). Cache pnpm + Prisma client. Add `dependabot.yml`.

### Phase 6 — Web overhaul (~3 days)

- `apps/web/middleware.ts` — read `access_token` cookie; redirect unauthenticated users from protected routes to `/login?redirect=…`.
- `apps/web/src/lib/api.ts` — `X-Request-ID` per request, single-flight refresh-on-401, exponential backoff on 502/503/504, drop `any` from `body` param.
- **`@tanstack/react-query`** — provider in root layout; migrate dashboard / documents / chat / tickets / settings from hand-rolled `useEffect+fetch` to `useQuery`/`useMutation` with mutation-driven invalidation.
- **SSE for document status** — replace 2 s polling with `GET /documents/events`.
- **Chat UX** — message bubbles, source citation cards, scroll-to-bottom, typing indicator, retry on transient failure.
- **Forms** — client-side validation matching API DTOs (zod schemas shared via `packages/shared/schemas`); inline field errors.
- `app/error.tsx`, `app/not-found.tsx` per segment.
- **Accessibility** — aria labels, focus styles, keyboard shortcuts.
- **Logout cleanup** — clear localStorage and react-query cache.
- **Build hygiene** — re-enable `@typescript-eslint/no-explicit-any` (fix the ~16 callsites); add `"typecheck": "tsc --noEmit"` script; validate `NEXT_PUBLIC_API_URL` at boot via zod.
- **Next.js 16 patterns** — convert read-only pages (dashboard, list views) to Server Components; use `cacheTag` / `updateTag` for documents and tickets list invalidation.

### Phase 7 — Repo & infra polish (~1 day)

- Root `tsconfig.base.json`, `eslint.config.base.mjs`, `prettier.config.mjs`; each app extends.
- **Husky + lint-staged** — pre-commit prettier + eslint + typecheck on staged files.
- Populate `packages/shared/`:
  - `schemas/` — zod DTOs reusable on web for client validation (paired with `nestjs-zod` or hand-converted to class-validator).
  - `errors.ts` — shared error codes.
- `.editorconfig`.
- Update `README.md` and `CLAUDE.md` to reflect post-hardening reality.
- `docs/operations.md` — deploy notes, env reference, runbook (RabbitMQ down, OpenAI down, Postgres down, DLQ drain procedure).

---

## Out of scope (deliberate)

- Streaming chat responses (SSE/WebSocket from `POST /chat`).
- Hybrid search / reranker.
- S3-backed storage abstraction (local FS is fine for the portfolio demo).
- Deploy automation (Vercel / Fly).
- ML-based escalation scoring (current "no sources → suggestEscalation:true" heuristic is enough for now).
