# KhetKavach web

The browser side of KhetKavach: a landing page and the agronomist's workspace. Next.js 14 (App
Router), React 18, TypeScript (strict, no `any`), Tailwind CSS 4, MapLibre GL JS with Terra Draw,
Recharts. Deployed on Vercel with root directory `apps/web`.

The browser talks only to our own API (`NEXT_PUBLIC_API_URL`) and to the Esri World Imagery map
tiles it displays. It never calls a weather, satellite, or LLM source, and holds no API key.

## Routes

| Path | What it is |
|---|---|
| `/` | Landing page: pitch, features, data sources, and a live status block read from the API (`GET /health`, `GET /api/districts`) that says "unavailable" when the API cannot answer |
| `/app` | Workspace: draw a field on the satellite basemap, register it, press Assess, watch the agent trace stream over SSE, read the risk card. Also Time Machine, the admin source kill switch, and an EN / हिन्दी / ਪੰਜਾਬੀ switch |

## Run

```bash
pnpm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL, for example http://localhost:8000
pnpm dev                        # http://localhost:3000
```

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev server, production build, serve the build |
| `pnpm lint` | ESLint (`next/core-web-vitals`, `next/typescript`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (API client and formatting helpers) |

`NEXT_PUBLIC_API_URL` is the only variable. It is public by design: it is a URL, never a secret.

## Layout of the code

```
app/page.tsx          landing page (server component)
app/app/page.tsx      workspace (client component: state, SSE, map, panels)
components/shells     DashboardShell (workspace frame), MarketingShell (landing frame)
components/layouts    SplitView (resizable panels), BentoGrid (container-query grid)
components/navigation SidebarNav, MobileNav (drawer)
components/sections   Hero, Features, CTA
components/loading    Skeleton, AsyncContainer (loading / error / empty states)
components/ui         button, card, badge, tooltip, sheet, separator, sonner (toasts)
components/*.tsx      FieldMap, AgentTrace, RiskCard, Charts, SidePanels, LiveStatus
lib/api.ts            typed API client and the SSE subscription
lib/types.ts          mirrors docs/CONTRACTS.md and apps/api/app/schemas.py
```

`lib/types.ts` mirrors the API contract. Change `docs/CONTRACTS.md` first, then the Pydantic models
in `apps/api/app/schemas.py`, then this file.

Every number shown carries its source, status (live, cached, archived, unavailable) and fetch time,
and an unavailable value is shown as unavailable, never replaced.
