CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE membership_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE document_status AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE message_role AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "role" membership_role NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "organizationId")
);
CREATE INDEX IF NOT EXISTS "Membership_organizationId_idx" ON "Membership" ("organizationId");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "tokenHashSha256" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken" ("userId");

CREATE TABLE IF NOT EXISTS "Document" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "uploadedByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "status" document_status NOT NULL DEFAULT 'UPLOADED',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Document_org_status_idx" ON "Document" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS "DocumentChunk" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "chunkIndex" INT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" DOUBLE PRECISION[] NOT NULL DEFAULT '{}',
  "embedding_vector" vector(1536),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("documentId", "chunkIndex")
);
CREATE INDEX IF NOT EXISTS "DocumentChunk_documentId_idx" ON "DocumentChunk" ("documentId");
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_vector_idx" ON "DocumentChunk" USING ivfflat ("embedding_vector" vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Conversation_org_user_idx" ON "Conversation" ("organizationId", "userId");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "role" message_role NOT NULL,
  "content" TEXT NOT NULL,
  "sources" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message" ("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "Ticket" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "createdByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status" ticket_status NOT NULL DEFAULT 'OPEN',
  "priority" ticket_priority NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Ticket_org_status_idx" ON "Ticket" ("organizationId", "status");
