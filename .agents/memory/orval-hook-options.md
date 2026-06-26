---
name: Orval hook options pattern
description: Passing partial UseQueryOptions to orval-generated hooks requires queryKey; avoid or use full options
---

Orval-generated query hooks have signature: `useGetXxx(params?, options?: { query?: UseQueryOptions<...>, request?: ... })`.

`UseQueryOptions` from TanStack Query v5 requires `queryKey`, so passing `{ query: { enabled: false } }` causes TS error: "Property 'queryKey' is missing".

**How to apply:**
- Simplest: just call the hook without options and rely on the hook's internal queryKey.
- For conditionally enabled queries with a required id param: pass `id ?? 0` and handle null state in the UI rather than using `enabled: false`.
- If you must use `enabled`, also pass `queryKey: getGet...QueryKey(id)`.

**Why:** TanStack Query v5 made queryKey mandatory in UseQueryOptions; orval doesn't use Partial for the query option type.
