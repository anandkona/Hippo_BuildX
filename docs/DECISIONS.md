# Architecture Decisions (BUILD-EX)

This document records the canonical architectural decisions for the BUILD-EX project based on the End-to-End Blueprint.

## 1. Codebase Structure
**Decision:** Single Repository (Next.js Root).
**Rationale:** The project keeps all source files in the Next.js standard directories (e.g. `src/app`, `src/lib`, `src/worker`). We avoid the complexity of a Turborepo monorepo while keeping strict separation of concerns via folders.

## 2. Multi-Tenant Strategy
**Decision:** Schema-per-tenant using PostgreSQL.
**Rationale:** Strict isolation is a correctness requirement. Schema-per-tenant ensures Tenant A cannot accidentally query Tenant B's data because the queries will be scoped to `SET search_path TO "tenant_a"`.

## 3. ORM
**Decision:** Drizzle ORM.
**Rationale:** Selected for its superior control over schema isolation. Drizzle allows explicit schema targeting during query construction without complex dynamic generation (unlike Prisma).

## 4. Asynchronous Processing
**Decision:** BullMQ on Redis.
**Rationale:** Ensures persistent, retryable, and idempotent background jobs (e.g., tenant provisioning, demand letter generation). The worker runs alongside the Next.js process.

## 5. Control Plane
**Decision:** Shared `public` schema in the same PostgreSQL cluster.
**Rationale:** Holds the `tenants` catalog (provisioning, active, suspended) to direct routing and lifecycle jobs, along with future platform metadata.
