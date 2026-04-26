# API Reference & Workflows

This project exposes a NestJS API for a local AI support SaaS MVP.

## Swagger

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Auth schemes:
  - `access_token` httpOnly cookie, used by the web app.
  - Bearer token, useful for manual API testing.

The API uses a consistent response envelope through the global response interceptor. Errors are normalized through the global HTTP exception filter.

## Local prerequisites

Start dependencies and apps from the repository root:

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm -C packages/db prisma:generate
pnpm dev
```

Required local services:

- Postgres + pgvector: `localhost:5433`
- Redis: `localhost:6380`
- RabbitMQ: `localhost:5672`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)

`apps/api` and `apps/worker` load environment values from the root `.env`, even when run from workspace scripts.

## Authentication flow

The default browser flow uses cookies:

1. `POST /auth/register` or `POST /auth/login`
2. API sets `access_token` and `refresh_token` as httpOnly cookies.
3. Web requests include cookies with `credentials: include`.
4. `POST /auth/refresh` rotates the refresh token from the cookie.
5. `POST /auth/logout` revokes refresh tokens and clears cookies.

For Swagger/manual testing, use either:

- Browser cookies after login/register.
- `Authorization: Bearer <accessToken>` if you extract an access token.

## End-to-end MVP flow

1. Register or login.
2. Create an organization with `POST /organizations`.
3. Switch org if needed with `POST /organizations/:id/switch`.
4. Upload a TXT/PDF with `POST /documents/upload`.
5. Worker consumes `PROCESS_DOCUMENT`, extracts text, chunks it, stores embeddings, and marks the document `READY`.
6. Ask a question with `POST /chat`.
7. Review returned answer + `sources`.
8. Create a ticket with `POST /tickets`.
9. Update status with `PATCH /tickets/:id/status`.

## Endpoint map

| Area          | Method  | Path                               | Notes                                     |
| ------------- | ------- | ---------------------------------- | ----------------------------------------- |
| Health        | `GET`   | `/health`                          | Public runtime check                      |
| Auth          | `POST`  | `/auth/register`                   | Creates user + first org and sets cookies |
| Auth          | `POST`  | `/auth/login`                      | Sets cookies                              |
| Auth          | `POST`  | `/auth/refresh`                    | Rotates tokens from refresh cookie        |
| Auth          | `POST`  | `/auth/logout`                     | Requires auth                             |
| Auth          | `GET`   | `/auth/me`                         | Current JWT context                       |
| Users         | `GET`   | `/me`                              | Alias for current JWT context             |
| Organizations | `GET`   | `/organizations`                   | User memberships                          |
| Organizations | `POST`  | `/organizations`                   | Creates org and switches token context    |
| Organizations | `POST`  | `/organizations/:id/switch`        | Requires membership                       |
| Documents     | `GET`   | `/documents`                       | Active-org scoped                         |
| Documents     | `POST`  | `/documents/upload`                | Multipart field name: `file`              |
| Chat          | `POST`  | `/chat`                            | Creates or continues a conversation       |
| Chat          | `GET`   | `/chat/conversations`              | Active-org scoped                         |
| Chat          | `GET`   | `/chat/conversations/:id/messages` | Active-org scoped                         |
| Tickets       | `GET`   | `/tickets`                         | Active-org scoped                         |
| Tickets       | `POST`  | `/tickets`                         | Manual escalation                         |
| Tickets       | `PATCH` | `/tickets/:id/status`              | Status update                             |

## Document upload contract

- Content types: `text/plain`, `application/pdf`
- Max size: `10MB`
- Field name: `file`
- Initial status: `UPLOADED`
- Success status: `READY`
- Failure status: `FAILED` with `errorMessage`

Example:

```bash
curl -i \
  -b cookies.txt \
  -F "file=@./sample.txt;type=text/plain" \
  http://localhost:3000/documents/upload
```

## RAG behavior

- Embedding model: OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is present.
- Fallback mode: deterministic local embeddings when no API key is configured, so local demo still works.
- Vector dimension: `1536`.
- Retrieval: top 5 chunks using pgvector distance.
- Assistant messages store citations in `sources`.

## Troubleshooting

- If API or Worker cannot find `DATABASE_URL`, confirm `.env` exists in the repository root and rerun `pnpm dev`.
- If uploads stay `UPLOADED`, confirm RabbitMQ is running and the worker log says it is consuming `PROCESS_DOCUMENT`.
- If Postgres connection fails, confirm Docker is running and `DATABASE_URL` targets port `5433`.
- If chat returns fallback answers, set `OPENAI_API_KEY` in `.env` and restart API + Worker.
