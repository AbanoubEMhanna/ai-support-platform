# Local Development

## Prerequisites

- Node.js 20.x
- pnpm
- Docker Desktop

## 1) Start dependencies

```bash
cp .env.example .env
docker compose up -d
```

Services:

- Postgres (pgvector) on `localhost:5433`
- Redis on `localhost:6380`
- RabbitMQ on `localhost:5672` (management UI `http://localhost:15672`)

## 2) Install dependencies

```bash
pnpm install
pnpm -C packages/db prisma:generate
```

## 3) Run apps

```bash
pnpm dev
```

- API: `http://localhost:3000` (Swagger: `http://localhost:3000/docs`)
- Web: `http://localhost:3001`
