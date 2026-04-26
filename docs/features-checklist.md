# Features Checklist — ai-support-platform

Use this file as an iteration tracker (checklist). Items marked **[x]** are implemented in the current repo state; **[ ]** are next iterations.

---

## 0) Project / Repo

- [x] Monorepo (pnpm workspaces)
- [x] Apps: API (`apps/api`)
- [x] Apps: Worker (`apps/worker`)
- [x] Apps: Web (`apps/web`)
- [x] Docs folder (`docs/`)
- [x] GitHub Actions CI (build + prisma generate)
- [ ] Consistent root tooling: shared eslint/prettier/tsconfig base (optional)

---

## 1) Local Dev + Docker

- [x] `docker-compose.yml` for Postgres (pgvector) + Redis + RabbitMQ
- [x] Non-conflicting ports (Postgres `5433`, Redis `6380`, Rabbit `5672/15672`)
- [x] `.env.example`
- [x] Postgres init SQL:
  - [x] `vector` extension
  - [x] tables for MVP entities
  - [x] `embedding_vector vector(1536)` + ivfflat index
- [ ] Prisma migrations fully working (`prisma migrate dev`) end-to-end
  - Note: currently DB is initialized by SQL init script (not Prisma Migrate)

---

## 2) API (NestJS)

### Core platform
- [x] Swagger at `/docs`
- [x] ValidationPipe (whitelist + transform)
- [x] Global exception filter (consistent error envelope)
- [x] Global response interceptor (success envelope)
- [x] CORS enabled for web origin + `credentials: true`
- [x] Cookie parser enabled
- [x] Health endpoint `GET /health`

### Auth (Email/Password + JWT + refresh)
- [x] `POST /auth/register` (argon2 password hashing)
- [x] `POST /auth/login`
- [x] `POST /auth/refresh` (refresh via cookie)
- [x] `POST /auth/logout` (revokes refresh tokens)
- [x] `GET /auth/me`
- [x] `GET /me`
- [x] httpOnly cookies: `access_token`, `refresh_token`
- [x] Better refresh UX (web-triggered refresh flow on 401)
- [ ] Password policy + rate limiting on auth endpoints

### Multi-tenancy (Organizations + Membership)
- [x] `POST /organizations` (creates org + owner membership + switches org in token)
- [x] `GET /organizations` (lists memberships)
- [x] `POST /organizations/:id/switch` (switch active org by issuing new token pair)
- [x] Org scoping guard (requires `orgId` in JWT)
- [ ] RBAC enforcement using roles guard (currently available but not applied per-route)

---

## 3) Documents (Upload + Async Processing)

### API
- [x] `POST /documents/upload` (multer, 10MB limit, TXT/PDF)
- [x] `GET /documents` (org-scoped list)
- [x] Local filesystem storage (per org)
- [x] Enqueue `PROCESS_DOCUMENT` on upload
- [ ] File storage hardening (virus scan / content-type sniffing / path safety)
- [ ] Pagination + filtering (status, date range)

### Queue
- [x] RabbitMQ queue `PROCESS_DOCUMENT` (durable)
- [ ] DLQ + delayed retries via RabbitMQ plugins (current retry is app-level requeue with delay)

### Worker
- [x] Consumes `PROCESS_DOCUMENT`
- [x] Document statuses:
  - [x] `UPLOADED`
  - [x] `PROCESSING`
  - [x] `READY`
  - [x] `FAILED` (stores errorMessage)
- [x] Text extraction:
  - [x] TXT
  - [x] PDF (via `pdf-parse`)
- [x] Chunking (size 800, overlap 100)
- [x] Embeddings:
  - [x] OpenAI embeddings when `OPENAI_API_KEY` is set
  - [x] Deterministic fallback embeddings when key is missing
- [x] Stores chunks + writes `embedding_vector` (pgvector) via SQL update
- [ ] Worker observability (structured logs, trace ids, metrics)

---

## 4) Chat (RAG)

### API
- [x] `POST /chat` (create or continue conversation)
- [x] `GET /chat/conversations`
- [x] `GET /chat/conversations/:id/messages`
- [x] Retrieval:
  - [x] query embedding
  - [x] TopK=5 similarity search using `embedding_vector <=> queryVector`
- [x] Response includes `sources` saved on assistant message
- [x] LLM:
  - [x] OpenAI ChatCompletions when `OPENAI_API_KEY` is set
  - [x] Fallback response when key is missing (still returns sources)
- [ ] Prompt improvements (grounding rules + refusal policy + formatting)
- [ ] RAG evaluation (golden set + basic metrics)
- [ ] Conversation titles (auto-generate)

---

## 5) Tickets

- [x] `POST /tickets` (manual create from conversation)
- [x] `GET /tickets`
- [x] `PATCH /tickets/:id/status`
- [x] Status enum: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- [x] Priority enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- [x] Ticket create UI in Web
- [ ] AI-suggested escalation (flag + endpoint / rule)

---

## 6) Web (Next.js)

- [x] Pages:
  - [x] `/`
  - [x] `/login`
  - [x] `/register`
  - [x] `/settings` (org list + create + switch)
  - [x] `/dashboard` (cards)
  - [x] `/documents` (upload + polling list)
  - [x] `/chat` (conversations + messages + send)
  - [x] `/tickets` (list + status update)
- [x] Uses cookies (`credentials: include`) to talk to API
- [x] Web dev/build forced to webpack to avoid Turbopack env issues
- [ ] Better UX:
  - [ ] Loading states per section
  - [ ] Better chat UI (message bubbles + source rendering)
  - [x] Ticket create UI
  - [x] Logout button

---

## 7) Testing

- [x] Basic build pipeline passes (`pnpm -r build`)
- [ ] API E2E tests for:
  - [ ] register/login/refresh/logout
  - [ ] org create + switch
  - [ ] upload TXT -> worker process -> READY
  - [ ] chat returns sources
  - [ ] tickets flow
- [ ] Worker unit tests (chunking + status transitions)

---

## 8) Hardening / Production Signals (Next iterations)

- [ ] Security: Helmet, rate limiting, input size limits, better CORS config
- [ ] Audit logging (events like upload, chat, ticket)
- [ ] Redis usage (caching / rate limit / job dedupe)
- [ ] Structured logging (pino) + request id propagation to worker jobs
- [ ] Deployment (optional later): Vercel + Railway/Fly.io
