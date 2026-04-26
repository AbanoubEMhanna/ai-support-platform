# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack and layout

pnpm 9 workspace monorepo (Node 20). Three runnable apps share one Prisma client.

- `apps/api` — NestJS 11 HTTP API (port `3000`, Swagger at `/docs`).
- `apps/worker` — NestJS application *context* (no HTTP). Boots only `QueueConsumerService` which consumes `PROCESS_DOCUMENT` from RabbitMQ.
- `apps/web` — Next.js 16 + React 19 (port `3001`). See "Next.js gotcha" below.
- `packages/db` — Prisma 6 schema + a singleton `PrismaClient` re-exported from `@ai-support-platform/db`. Both API and Worker have their own thin `PrismaService` that wraps it; do not instantiate `PrismaClient` directly elsewhere.
- `packages/shared` — placeholder, not yet used.

## Common commands

Run from the repo root unless noted:

```bash
docker compose up -d                       # postgres(5433) + redis(6380) + rabbitmq(5672/15672)
pnpm install
pnpm -C packages/db prisma:generate        # required after schema changes or first install
pnpm dev                                   # runs api + worker + web in parallel (-r --parallel)
pnpm -r build
pnpm -r lint
pnpm -r test
```

Per-app:

```bash
pnpm -C apps/api dev                       # nest start --watch
pnpm -C apps/worker dev
pnpm -C apps/web dev                       # next dev --webpack -p 3001 (NOT turbopack — see below)

pnpm -C apps/api test -- path/to/file.spec.ts        # single Jest spec
pnpm -C apps/api test -- -t "name of test"           # by test name

pnpm -C packages/db prisma:studio
pnpm -C packages/db prisma:migrate:dev               # see "DB bootstrap" caveat
```

## Environment

There is exactly one `.env` — at the repo root. Both `apps/api` and `apps/worker` configure NestJS `ConfigModule` with `envFilePath: ['.env', '../../.env']`, so they pick it up whether started from the repo root or the app dir. Do not create per-app `.env` files. Start from `cp .env.example .env`.

Required: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_ORIGIN`.
Optional (LLM providers): `OPENAI_API_KEY`, `OLLAMA_BASE_URL`, `LM_STUDIO_BASE_URL`, `LM_STUDIO_API_KEY`. With no `OPENAI_API_KEY`, the system runs in "fallback mode": deterministic local embeddings and a canned chat response (still returns retrieved sources). Keep that fallback working — the local demo depends on it.

## DB bootstrap caveat

Postgres is initialized by `docker/postgres/init/001_init.sql` on first container boot — that SQL creates the enums, all tables, and the pgvector extension/index. `packages/db/prisma/schema.prisma` is the source of truth for the **Prisma client types**, but `prisma migrate dev` is *not* the bootstrap path today (no migrations directory). When changing the schema, update both `schema.prisma` and `001_init.sql` and recreate the postgres volume (`docker compose down -v`), unless you intentionally introduce Prisma Migrate.

`DocumentChunk` has two embedding columns: `embedding Float[]` (Prisma-managed, mostly unused) and `embedding_vector vector(1536)` (pgvector, **not** in the Prisma schema). The vector column is populated by raw SQL `UPDATE` from the worker and queried with `<=>` in the chat retrieval. Any code that stores or reads embeddings must go through raw SQL — Prisma doesn't know about `embedding_vector`.

## Architecture flow

**Document ingestion.** API `POST /documents/upload` writes the file to local disk under the org, creates a `Document(status=UPLOADED)`, and publishes a `PROCESS_DOCUMENT` message to RabbitMQ. The worker consumes it, extracts text (TXT directly, PDF via `pdf-parse`), chunks (size 800, overlap 100), generates embeddings, inserts `DocumentChunk` rows, then runs a raw SQL `UPDATE` to populate `embedding_vector`, and flips status to `READY` (or `FAILED` with `errorMessage`).

**RAG chat.** API `POST /chat` embeds the user query, runs a top-5 pgvector similarity query (`ORDER BY embedding_vector <=> $vec::vector`), passes retrieved chunks to the configured LLM provider (`openai` | `ollama` | `lmstudio`), and persists the assistant message with `sources` JSON containing the citations. Provider/model is selected per-request; `GET /ai/models?provider=…` lists what's available locally.

**Multi-tenancy.** JWT carries `{ sub, email, orgId, role }`. `OrgGuard` (in `apps/api/src/common/guards/org.guard.ts`) blocks any route that requires an active org — it just checks `req.user.orgId` is set. Switching orgs reissues the token pair via `POST /organizations/:id/switch`; the new `orgId` lives in the JWT, not in a request param. Every org-scoped query must filter by `req.user.orgId` — there's no row-level security.

**Auth.** `access_token` and `refresh_token` are httpOnly cookies (Bearer is also accepted, mainly for Swagger). `argon2` for password hashing. Refresh tokens are stored hashed in `RefreshToken` and revoked on logout.

**HTTP envelope.** Every successful response is wrapped by `ResponseInterceptor` as `{ success: true, data }`. Errors are normalized by `HttpExceptionFilter`. The Next.js client expects this shape — don't return raw payloads from controllers, return the `data` and let the interceptor wrap it.

## Conventions worth knowing

- `apps/web` is forced to **webpack**, not Turbopack — `next dev --webpack` / `next build --webpack`. This is intentional (env loading issues with Turbopack); don't "fix" it by switching.
- The web app has its own `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` warning that this Next.js version has breaking changes vs. older training data — when editing under `apps/web`, consult `apps/web/node_modules/next/dist/docs/` before relying on remembered Next.js APIs.
- API global pipes use `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`. DTOs are required on every body — unknown fields are rejected.
- The roles guard exists (`common/guards/roles.guard.ts` + `@Roles()` decorator) but is not yet applied per-route. Org membership is enforced; role-based authorization is not.
- CI is `.github/workflows/ci.yml` — runs build + `prisma generate`. No test step yet.

## Docs

- `docs/api.md` — endpoint map, auth flow, end-to-end MVP walkthrough, troubleshooting.
- `docs/architecture.md` — flow diagram.
- `docs/rag.md` — embedding/retrieval specifics.
- `docs/local-dev.md` — bootstrap recap.
- `docs/features-checklist.md` — what's done vs. next; a useful map of unimplemented work (no DLQ, no rate limiting, no E2E tests, no RBAC enforcement, etc.).
