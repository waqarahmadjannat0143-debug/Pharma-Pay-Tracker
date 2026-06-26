# MedPay — Medical Agency Payment Manager

A mobile app for pharmaceutical distributors to manage invoices, collect payments, and track outstanding balances from medical stores.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Mobile: Expo / React Native + Expo Router + React Query
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (customers, invoices, payments, payment_allocations)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks + types
- `artifacts/api-server/src/routes/` — Express route handlers (auth, customers, invoices, payments, dashboard, reports)
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/constants/colors.ts` — Blue/White theme (light + dark)
- `artifacts/mobile/contexts/AuthContext.tsx` — JWT auth state

## Architecture decisions

- JWT auth: token stored in AsyncStorage, retrieved via module-level `getToken()` in `lib/apiToken.ts` and injected via `setAuthTokenGetter(getToken)` at module load in `_layout.tsx`
- Payment auto-allocation: records a payment and allocates it against oldest pending/partial/overdue invoices first, updating balances atomically; allocations stored in `payment_allocations` table
- Admin auth: hardcoded single admin user (username/password via `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, defaults: `admin`/`medpay@2024`)
- Dark mode: fully supported — `colors.ts` exports both `light` and `dark` palettes; `useColors()` hook auto-switches based on device setting
- Blue & White theme: primary `#1565C0` (light) / `#3B82F6` (dark)

## Product

- **Login**: Single admin user with JWT auth (30-day token)
- **Dashboard**: Total outstanding, today's/monthly collection, overdue alerts, monthly bar chart, quick actions
- **Medical Stores**: Full CRUD for customer stores with credit limits and outstanding tracking
- **Invoices**: Create/view/delete invoices with auto-status (pending/partial/overdue/paid)
- **Payments**: Record payments with auto-allocation (oldest invoice first), filter by mode
- **Reports**: Outstanding report, overdue report, customer ledger, date-wise & monthly collection

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes before starting the API server
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- `req.params.id` in Express 5 types as `string | string[]` — always cast with `as string` before `parseInt`
- Dark key in `colors.ts` must include all the same fields as `light` (including `tabBar`) or `useColors` will error
- `useGetCustomerLedger` and similar hooks require `queryKey` in options — use the hook without explicit options, or pass the full queryKey from `getGet...QueryKey()`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API proxy path: `/api` → port 8080
- Mobile preview via Expo Go QR code in workflow logs
