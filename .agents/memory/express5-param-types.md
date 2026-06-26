---
name: Express 5 param types
description: req.params.id types as string | string[] in Express 5 TypeScript; always cast before parseInt
---

In Express 5 with TypeScript, route parameters like `req.params.id` are typed as `string | string[]`, not just `string`. This causes TS2345 errors when passing to `parseInt()`.

**How to apply:** Always cast before parsing: `parseInt(req.params.id as string)`.

**Why:** Express 5 broadened the params type to accommodate complex routing scenarios, but individual route params are always `string` at runtime.
