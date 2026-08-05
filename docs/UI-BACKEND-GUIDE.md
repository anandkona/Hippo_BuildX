# UI developer guide — BuildX backend (Phase 0 / 1)

This guide is for frontend engineers integrating against the current Next.js API on branch `dev2`.

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

Central session response includes `scope` (`platform` \| `tenant`) and `redirectTo`.

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

Minimum body: `{ name, slug }`.  
For email invites, always send a **real** `adminEmail` (or `contactEmail`). Blank → `admin@{slug}.local` (invite skipped).

Response highlights:

```json
{
  "tenant": { "status": "active", "...": "..." },
  "credentials": { "workspace": "acme", "adminEmail": "...", "adminPassword": "..." },
  "invite": { "sent": true, "to": "...", "messageId": "..." }
}
```

UI should:

1. Show credentials modal (password shown once).
2. Show green “Invite sent” if `invite.sent`, else amber warning with `invite.error`.
3. Deep-link tenant login to `/login` (no workspace field required when email is unique).

## API surfaces

### Platform (`/api/v1/platform/*`)

Requires `isPlatformAdmin` JWT. Used by `/platform` screens.

| Area | Methods |
|------|---------|
| Tenants | `GET/POST /tenants`, `GET/PATCH/POST /tenants/{id}`, `POST /tenants/{id}/suspend` |
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
