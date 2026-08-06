# Data model (Phase 0 / Phase 1)

Canonical ER overview for the control plane (`public`) and tenant identity schema. Kept current with provisioning + migration runner (`lib/tenants/migrations.ts`).

## Control plane (`public`)

```mermaid
erDiagram
  tenants ||--o{ tenant_migrations : records
  tenants ||--o{ subscriptions : has
  plans ||--o{ subscriptions : covers
  platform_users ||--o{ platform_sessions : issues
  platform_users ||--o{ platform_audit_logs : acts

  tenants {
    uuid id PK
    varchar name
    varchar slug UK
    varchar schema_name UK
    varchar status
    jsonb feature_flags
    timestamptz created_at
  }

  tenant_migrations {
    uuid id PK
    uuid tenant_id FK
    varchar migration_name
    timestamptz applied_at
  }

  platform_users {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar role
    boolean is_active
  }

  platform_sessions {
    uuid id PK
    uuid platform_user_id FK
    varchar token_hash UK
    timestamptz expires_at
    timestamptz revoked_at
  }

  plans {
    uuid id PK
    varchar name UK
    integer price
    jsonb feature_flags
  }

  subscriptions {
    uuid id PK
    uuid tenant_id FK
    uuid plan_id FK
    varchar status
  }

  feature_flags {
    uuid id PK
    varchar key UK
    boolean enabled
    varchar scope
  }

  platform_audit_logs {
    uuid id PK
    uuid actor_user_id FK
    varchar action
    varchar resource
    timestamptz created_at
  }
```

Notes:
- Tenant lifecycle statuses: `provisioning` | `active` | `failed` | `suspended`.
- `plans` / `subscriptions` / platform kill-switches exist in schema; commercial ops remain Phase 12 product scope.
- Refresh for platform admins is stored in `platform_sessions` (hashed tokens).

## Tenant schema (`tenant_<slug>`) — identity core

Applied by migration `001_identity_core`.

```mermaid
erDiagram
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : grants
  roles ||--o{ permissions : contains
  users ||--o{ refresh_tokens : owns
  users ||--o{ audit_logs : performs

  users {
    uuid id PK
    uuid tenant_id
    varchar email
    text password_hash
    varchar status
  }

  roles {
    uuid id PK
    varchar name
    jsonb permissions
    boolean is_system
  }

  user_roles {
    uuid id PK
    uuid user_id FK
    uuid role_id FK
    uuid project_id
    uuid location_id
  }

  permissions {
    uuid id PK
    uuid role_id FK
    varchar module
    varchar action
    uuid project_id
    uuid location_id
  }

  refresh_tokens {
    uuid id PK
    uuid user_id FK
    varchar token_hash UK
    timestamptz expires_at
    timestamptz revoked_at
  }

  audit_logs {
    uuid id PK
    uuid user_id
    varchar action
    varchar resource
    jsonb details
  }

  tenant_settings {
    uuid id PK
    varchar key UK
    jsonb value
  }

  tenant_channels {
    uuid id PK
    varchar channel
    jsonb config
    boolean is_active
  }
```

## Four-axis AuthZ (runtime)

Evaluated in `lib/rbac/scope.ts` and enforced by `requireTenantApi`:

1. **Role / permission** — seeded matrix + JWT `permissions`
2. **Module** — tenant `tenant_settings.feature_flags` (`false` disables)
3. **Project** — JWT `projectIds` from `user_roles.project_id` (empty ⇒ unrestricted)
4. **Location** — JWT `locationIds` from `user_roles.location_id` (empty ⇒ unrestricted)

Active-tenant checks run in API gates (`assertTenantActive`) because Edge middleware cannot query Postgres.
