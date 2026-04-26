# ai-support-platform

AI customer support SaaS (portfolio project) showcasing:

- Multi-tenant backend (NestJS)
- Async processing (RabbitMQ)
- Vector search (Postgres + pgvector)
- RAG chat (OpenAI)
- Web dashboard (Next.js)

## Monorepo structure

```txt
apps/api       # NestJS API
apps/worker    # NestJS background worker
apps/web       # Next.js web app
packages/db    # Prisma schema/client workspace
packages/shared
docs
docker
```

## Getting started

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm -C packages/db prisma:generate
pnpm dev
```

## URLs

- API: `http://localhost:3000` (Swagger: `http://localhost:3000/docs`)
- Web: `http://localhost:3001`
- RabbitMQ UI: `http://localhost:15672` (guest/guest)

## Docs

- `docs/api.md`
- `docs/local-dev.md`
- `docs/architecture.md`
- `docs/rag.md`
- `docs/features-checklist.md`
