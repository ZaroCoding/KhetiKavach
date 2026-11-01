---
trigger: glob
globs: apps/web/**
---
# Web rules
- Types only from lib/types.ts; API calls only through lib/api.ts (NEXT_PUBLIC_API_URL).
- Show provenance and freshness beside data; "unavailable" is shown, never hidden or faked.
- Risk colour always paired with a text label. No login screens. No `any` (next/typescript lint).
