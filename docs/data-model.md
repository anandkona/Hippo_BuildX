# Data model (Phase 0 / Phase 1 / Phase 2)

Canonical ER overview for the control plane (`public`) and tenant schemas. Kept current with provisioning + migration runner (`lib/tenants/migrations.ts`).

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
    text password_hash
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

## Tenant schema — identity core (`001_identity_core`)

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

## Tenant schema — Property + Planning-lite (`002_property_planning`)

PRD hierarchy: **Company (tenant) → Project → Block → Tower → Floor → Unit**.

```mermaid
erDiagram
  projects ||--o{ blocks : contains
  blocks ||--o{ towers : contains
  towers ||--o{ floors : contains
  floors ||--o{ units : contains
  unit_categories ||--o{ units : classifies
  projects ||--o{ units : owns
  units ||--o{ unit_status_history : audits
  projects ||--o{ milestones : plans
  milestones ||--o{ tasks : groups
  projects ||--o{ tasks : owns
  tasks ||--o{ task_dependencies : predecessor
  tasks ||--o{ task_dependencies : successor
  projects ||--o{ boq_items : costs
  projects ||--o{ drawings : register
  projects ||--o{ rfis : register
  projects ||--o{ issues : tracks
  projects ||--o{ approvals : gates
  projects ||--o{ project_budgets : budgets

  projects {
    uuid id PK
    varchar code UK
    varchar name
    varchar status
  }

  blocks {
    uuid id PK
    uuid project_id FK
    varchar code
    varchar name
  }

  towers {
    uuid id PK
    uuid project_id FK
    uuid block_id FK
    varchar code
    varchar name
  }

  floors {
    uuid id PK
    uuid project_id FK
    uuid tower_id FK
    integer level_number
  }

  unit_categories {
    uuid id PK
    varchar code UK
    varchar unit_type
  }

  units {
    uuid id PK
    uuid project_id FK
    uuid floor_id FK
    uuid category_id FK
    varchar code
    varchar unit_type
    varchar status
    uuid booking_id
    uuid customer_id
    uuid payment_plan_id
  }

  unit_status_history {
    uuid id PK
    uuid unit_id FK
    varchar from_status
    varchar to_status
  }

  milestones {
    uuid id PK
    uuid project_id FK
    varchar name
    varchar status
  }

  tasks {
    uuid id PK
    uuid project_id FK
    uuid milestone_id FK
    varchar name
    date planned_start
    date planned_end
    integer progress_pct
  }

  task_dependencies {
    uuid id PK
    uuid predecessor_task_id FK
    uuid successor_task_id FK
    varchar dependency_type
  }

  boq_items {
    uuid id PK
    uuid project_id FK
    varchar code
    numeric quantity
    numeric unit_rate
    numeric amount
  }

  drawings {
    uuid id PK
    uuid project_id FK
    varchar drawing_no
    integer version
    boolean is_current
  }

  rfis {
    uuid id PK
    uuid project_id FK
    varchar rfi_no
    integer version
    boolean is_current
  }

  issues {
    uuid id PK
    uuid project_id FK
    varchar title
    varchar severity
    varchar status
  }

  approvals {
    uuid id PK
    uuid project_id FK
    varchar entity_type
    uuid entity_id
    varchar status
  }

  project_budgets {
    uuid id PK
    uuid project_id FK
    varchar category
    numeric planned_amount
  }
```

### Unit status (PRD §8.3)

`available` → `reserved` → `booked` → `cancelled` | `completed` → `delivered`  
Every change writes `unit_status_history`.

### Planning notes (PRD §8.4)

- Task dependencies are **finish-to-start (`FS`)** in v1.
- Gantt API returns tasks + dependencies; **critical-path (CPM) is P1**.
- Drawings and RFIs are versioned (`version`, `supersedes_id`, `is_current`).
- Unit link columns `booking_id` / `customer_id` / `payment_plan_id` are reserved for Phases 3–5.

## Four-axis AuthZ (runtime)

Evaluated in `lib/rbac/scope.ts` and enforced by `requireTenantApi` / `requireProjectApi`:

1. **Role / permission** — seeded matrix + JWT `permissions` (`projects.*`)
2. **Module** — tenant `feature_flags.projects === false` denies
3. **Project** — JWT `projectIds` (empty ⇒ unrestricted)
4. **Location** — JWT `locationIds` (empty ⇒ unrestricted)

Active-tenant checks run in API gates (`assertTenantActive`) because Edge middleware cannot query Postgres.
