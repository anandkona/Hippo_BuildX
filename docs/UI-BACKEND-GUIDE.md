# UI developer guide — BuildX backend (Phase 0 / 1 / 2)

This guide is for frontend engineers integrating against the current Next.js API.

## Quick start

| Item | Value |
|------|--------|
| Base URL (local) | `http://localhost:3000` |
| Swagger UI | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| OpenAPI JSON | [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json) |
| Central login UI | `/login` |
| Platform shell | `/platform/*` (super admin) |
| Tenant shell | `/dashboard`, `/admin/*` |

Seeded credentials (local / demo):

- Platform: `super@buildx.com` / `password123`
- Demo tenant (if seeded): `user@demo.com` / `password123`

## Auth model (important)

1. **Prefer cookies** — login endpoints set HttpOnly:
   - `access_token` (~15 minutes JWT)
   - `refresh_token` (~30 days)
2. Browser `fetch` must use `credentials: 'include'`.
3. Optional: `Authorization: Bearer <access_token>` for non-browser clients.
4. **Never send / trust** `x-tenant-id` or `x-schema-name` from the client for authz — middleware **overwrites** these from the JWT.

### Which login to call

| Who | Endpoint | Body |
|-----|----------|------|
| Platform or tenant (recommended) | `POST /api/v1/auth/session` | `{ email, password }` — optional `workspace` slug |
| Platform only | `POST /api/v1/platform/auth/login` | `{ email, password }` |
| Tenant legacy | `POST /api/v1/auth/login` | `{ tenantSlug, email, password }` |
| Refresh | `POST /api/v1/auth/refresh` | cookies or `{ refreshToken, scope? }` |
| Logout | `POST /api/v1/auth/logout` | cookies |
| Forgot password | `POST /api/v1/auth/forgot-password` | `{ email }` — always generic success |
| Reset preview | `GET /api/v1/auth/reset-password?token=` | public |
| Reset password | `POST /api/v1/auth/reset-password` | `{ token, password }` → `/login?reset=1` |

Central session response includes `scope` (`platform` \| `tenant`) and `redirectTo`.

UI pages: `/login` (includes **Forgot password?**), `/forgot-password`, `/reset-password?token=...`.

```ts
const res = await fetch('/api/v1/auth/session', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
// data.scope === 'platform' → router.push('/platform')
// data.scope === 'tenant'   → router.push(data.redirectTo || '/dashboard')
```

On `401` from APIs: call refresh once, then retry; if still failing, send user to `/login`.

## Tenant creation + Brevo invite (platform)

`POST /api/v1/platform/tenants` (requires platform JWT with `super_admin`).

Minimum body: `{ name, slug, adminEmail }`.  
Buyer **creates their own password** via a Brevo set-password link (`/invite?token=...`). No password is emailed.

Response highlights:

```json
{
  "tenant": { "status": "active", "...": "..." },
  "credentials": {
    "workspace": "acme",
    "adminEmail": "...",
    "adminPassword": null,
    "mustSetPassword": true
  },
  "invite": {
    "sent": true,
    "to": "...",
    "messageId": "...",
    "inviteUrl": "http://localhost:3000/invite?token=..."
  }
}
```

UI should:

1. Show that the buyer must set a password (do not show a temp password when `mustSetPassword` is true).
2. Show green “Invite sent” if `invite.sent`, else amber warning with `invite.error`.
3. Always surface `invite.inviteUrl` so platform operators can share it if email is delayed/spam-foldered.
4. Accept flow: `GET /api/v1/auth/invite?token=...` → `POST /api/v1/auth/invite/accept` with `{ token, password, name? }` → cookies set → `/dashboard`.
5. Resend: `POST /api/v1/platform/tenants/{id}/invite`.

## Forgot password (platform + tenant)

1. User opens `/forgot-password` and submits email.
2. Server resolves **platform first**, then tenant by email (same as central login).
3. Brevo sends a one-time link to `/reset-password?token=...` (TTL 1 hour).
4. User sets a new password (min 8 chars) → redirect to `/login?reset=1`.
5. API never reveals whether the email exists (anti-enumeration), except optionally `debugResetUrl` in development.

## API surfaces

### Platform (`/api/v1/platform/*`)

Requires `isPlatformAdmin` JWT. Used by `/platform` screens.

| Area | Methods |
|------|---------|
| Tenants | `GET/POST /tenants`, `GET/PATCH /tenants/{id}`, `POST /tenants/{id}/suspend`, `POST /tenants/{id}/invite` |
| Plans | `GET/POST /plans`, `GET/PUT/DELETE /plans/{id}` |
| Subscriptions | `GET/POST /subscriptions` |
| Feature flags | `GET/POST /feature-flags`, `PUT /feature-flags/{id}` |
| Platform users | `GET/POST /users`, `PUT/DELETE /users/{id}` |
| Settings / metrics / audit | `GET/PUT /settings`, `GET /metrics`, `GET /audit` |

Phase 12 surfaces (suspend, plans, forced flags) exist early — keep UI doors but do not block Phase 1 UX on them.

### Tenant admin (`/api/v1/admin/*`)

Requires tenant JWT; gated by active tenant + four-axis RBAC (`tenant_admin` or permission like `users.create`).

| Area | Methods |
|------|---------|
| Users | `GET/POST /users`, `GET/PUT/DELETE /users/{id}` |
| Roles | `GET/POST /roles`, `GET/PUT/DELETE /roles/{id}` |
| Settings | `GET/PUT /settings` (flat branding + `feature_flags`) |
| Channels | `GET/POST /channels` |
| Audit | `GET /audit` |

Mutations are auto-audited via `withAudit` — no extra client work.

### Projects — Property + Planning-lite (`/api/v1/projects/*`) — Phase 2

Requires tenant JWT with `projects.read|create|update|delete` (or `tenant_admin` / `*`).  
When the JWT has non-empty `projectIds`, resource routes enforce that project scope.

| Area | Methods |
|------|---------|
| Projects | `GET/POST /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/{projectId}` |
| Hierarchy tree | `GET /api/v1/projects/{projectId}/tree` |
| Bulk generate | `POST /api/v1/projects/{projectId}/generate` — body `{ block?, towers: [{ name, floorCount, unitsPerFloor, unitType?, categoryId?, unitPrefix? }] }` |
| Blocks / towers / floors | `GET/POST .../blocks`, `.../towers`, `.../floors` |
| Units | `GET/POST .../units`, `GET .../units/{unitId}`, `POST .../units/{unitId}/status` `{ toStatus, reason? }` |
| Unit categories | `GET/POST /api/v1/unit-categories` |
| Milestones / tasks | `GET/POST .../milestones`, `PATCH/DELETE .../milestones/{id}`, `GET/POST .../tasks`, `PATCH/DELETE .../tasks/{id}` |
| Dependencies / Gantt | `GET/POST .../dependencies` (FS only), `GET .../gantt` |
| BOQ | `GET/POST .../boq`, `DELETE .../boq/{itemId}` |
| Drawings / RFIs | `GET/POST .../drawings`, `GET .../drawings/{id}`, `GET/POST .../rfis`, `GET/PATCH .../rfis/{id}` (versioned) |
| Issues / approvals / budget | `GET/POST .../issues`, `PATCH .../issues/{id}`, `GET/POST .../approvals`, `GET/POST .../budget` |

**Unit statuses:** `available`, `reserved`, `booked`, `cancelled`, `completed`, `delivered` (each change audited).

**Workflow (PRD):** create project → bulk-generate Block→Tower→Floor→Unit tree → plan milestones/tasks with FS deps (Gantt) → maintain BOQ / drawings / RFIs / issues / budget. CRM booking + construction progress come in later phases; units already expose `booking_id`, `customer_id`, `payment_plan_id` placeholders.

### Health

- `GET /api/v1/health`
- `GET /api/v1/health/ready`

## Errors & status codes

| Status | Meaning |
|--------|---------|
| 400 | Validation |
| 401 | Missing/invalid/expired token |
| 403 | Wrong scope / permission / suspended tenant |
| 404 | Not found / inactive workspace (login) |
| 409 | Conflict (slug/email) |
| 500 | Server error |

Body shape is usually `{ "error": "..." }`.

## Suggested UI route map

| Screen | API usage |
|--------|-----------|
| `/login` | `POST /api/v1/auth/session` |
| `/platform` dashboard | `GET /platform/metrics`, tenants count |
| `/platform/tenants` | list/create tenants; show `invite` |
| `/platform/plans` | plans CRUD |
| `/platform/subscriptions` | list/assign |
| `/admin/users` | tenant users CRUD |
| `/admin/roles` | roles CRUD |
| `/admin/settings` | branding + feature flags blob |
| `/admin/channels` | channel upsert |
| Projects (Phase 2) | `/api/v1/projects`, tree, generate, units, gantt, boq, drawings, rfis |

## Local backend checklist for UI

```bash
npm install
# configure .env.local (DATABASE_URL, JWT_SECRET, Brevo keys if testing invites)
npm run dev
# optional worker if not using sync provision:
# npm run dev:worker
```

Open Swagger: `http://localhost:3000/api-docs` → Authorize with cookie after logging in once in the browser, or paste a Bearer JWT from login JSON when available.

## Branch / PR workflow (team)

1. Backend lands on feature branches → PR → `master`.
2. UI should target **merged `master`** (or agreed `dev2` while Phase 0/1 PR is open).
3. Prefer `credentials: 'include'` over storing passwords or JWT in `localStorage`.

## Need help?

- Contract source of truth: `/openapi.json` + this guide.
- Backend DoD PR: https://github.com/anandkona/Hippo_BuildX/pull/3
