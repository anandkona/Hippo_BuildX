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

## 6. Active-tenant enforcement
**Decision:** Enforce `tenants.status === 'active'` inside API helpers (`requireTenantApi` / `assertTenantActive`), not Edge middleware.
**Rationale:** Next.js middleware runs on the Edge runtime and cannot reliably open a Postgres connection. JWT middleware still strips untrusted tenant headers and requires a valid access token for all non-public `/api/v1/*` routes.

## 7. Platform refresh sessions
**Decision:** Platform admins receive HttpOnly `refresh_token` cookies backed by `public.platform_sessions` (hashed). `/api/v1/auth/refresh` rotates either platform or tenant refresh tokens.
**Rationale:** Matches tenant JWT+refresh parity for Phase 1 DoD without waiting for Phase 12 session ops UI.

## 8. Four-axis RBAC delivery
**Decision:** Ship `evaluateScope` (role ∧ module ∧ project ∧ location) in Phase 1; wire through `requireTenantApi`. Resource-level project/location arguments are optional until domain modules exist (Phase 2+).
**Rationale:** Claims and assignment columns already exist on `user_roles`; domain APIs will pass target IDs as modules land.

## 9. Audit interceptor
**Decision:** State-changing tenant admin routes use `withAudit` / `withTenantMutation` (`lib/api/tenant-admin.ts`) so AuthZ → handler → audit on 2xx is shared, not hand-rolled per handler.
**Rationale:** PRD §14 requires a shared interceptor on mutations; Next.js App Router has no Nest-style interceptor, so an HOF wrapping route handlers is the equivalent.

## 10. TODO (Phase 2) — single source of truth for role permissions
**TODO:** Deprecate `roles.permissions` JSONB in tenant migration `001_identity_core` once the relational `permissions` table (`module`, `action`, optional project/location) is the sole AuthZ source. Today `loadTenantAuthClaims` unions both for backward compatibility; Phase 2 should migrate JSONB rows into `permissions`, drop the column, and update Tenant Admin role editors accordingly.
