---
name: MedPay auth pattern
description: JWT auth pattern for Expo app — module-level token variable + AsyncStorage + setAuthTokenGetter
---

JWT stored in AsyncStorage. A module-level variable in `lib/apiToken.ts` caches the current token so `setAuthTokenGetter` gets a synchronous getter.

**Pattern:**
1. `lib/apiToken.ts` — `let _token: string | null = null; export function getToken() { return _token; } export function setToken(t) { _token = t; }`
2. `app/_layout.tsx` (module level, outside component) — `setAuthTokenGetter(getToken);` and `setBaseUrl(...)` 
3. `AuthProvider` — calls `setToken(token)` after AsyncStorage reads/writes

**Why:** `setAuthTokenGetter` expects a synchronous getter; AsyncStorage is async, so the module-level variable acts as a sync cache.

**Admin credentials:** username `admin`, password `medpay@2024` (overridable via `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars). JWT secret from `SESSION_SECRET` env var.
