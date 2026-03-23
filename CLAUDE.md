# Project: ARIA
AI-powered email assistant — Gmail/Outlook, AI triage, tasks, calendar, analytics.

**Repo:** https://github.com/pakito955/ARIA | **Deploy:** Vercel (auto from `main`)

---

## Tech Stack
- **Next.js 15** App Router + TypeScript strict
- **Prisma ORM** — SQLite (dev) / PostgreSQL (prod via `DATABASE_URL`)
- **NextAuth v5** — Google OAuth, JWT, `trustHost: true` (required for Vercel — do NOT set `NEXTAUTH_URL` on Vercel)
- **TanStack Query** — all client-side data fetching
- **Tailwind CSS** + CSS variables (`globals.css`) + `cn()` from `utils.ts`
- **Framer Motion** — modals and overlays only
- **Anthropic SDK** — `claude-haiku-4-5` (real-time), `claude-sonnet-4-6` (analysis)
- **Zustand** — global UI state (`src/lib/store.ts`)
- **BullMQ + ioredis** — background job queue
- **googleapis** — Gmail + Calendar API
- **@microsoft/microsoft-graph-client** — Outlook (scaffolded)

---

## Commands
```bash
npm run dev          # localhost:3000
npm run build        # production (runs prisma generate first)
npm run db:push      # apply schema changes — run after EVERY schema edit
npm run db:migrate   # named migration
npm run db:studio    # Prisma Studio
npm run queue:worker # BullMQ email worker
```

---

## Code Rules

**Auth** — Always `getAuthUser(req)` from `src/lib/authOrToken.ts` in API routes. Never `auth()` directly. Supports both session and Bearer token.

**Encryption** — All OAuth tokens stored encrypted. Use `encrypt()`/`decrypt()` from `src/lib/encryption.ts`. `ENCRYPTION_KEY` env var must always be set — losing it makes all stored tokens unreadable. Gmail refresh tokens live in `Integration.refreshToken`; `GmailProvider` auto-refreshes and re-encrypts on expiry.

**Email sync** — Always fire-and-forget: `syncGmailEmails(...).catch(...)`. Never `await` it in a GET handler.

**TanStack Query** — `queryKey` must include all filter params. Always set `staleTime` to avoid unnecessary refetches.

**INP** — No Framer Motion on list items. No synchronous work (no `window.prompt`, no heavy state) in click handlers. Use `startTransition` for state updates that trigger large re-renders.

**CSS** — `var(--token)` always; never hardcode colors. All tokens in `globals.css`.

**Tailwind** — `className` over inline `style`. `cn()` for conditionals.

**Exports** — Named exports only in `src/lib/`. No default exports for utilities.

---

## Design Tokens (globals.css)
| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#7C5CFF` | Primary purple |
| `--accent-text` | lighter purple | Text on accent bg |
| `--accent-subtle` | purple/8% | Subtle tint |
| `--bg-base` | `#0B0B0F` | Page background |
| `--bg-surface` / `--bg-card` / `--bg-hover` | progressively lighter | Surfaces |
| `--text-1` / `--text-2` / `--text-3` | white → muted | Text hierarchy |
| `--border` / `--border-medium` | subtle → visible | Borders |
| `--red` / `--amber` / `--green` / `--blue` | status colors | + `-subtle` variants |

---

## Critical Constraints
- **`prisma db push`** after every schema change — no auto-migrations in dev
- **Stats route** `/api/stats` must always return `{ unread, critical, tasks, waiting }` — all 4 fields or sidebar breaks
- **Service worker** `public/sw.js` — network-first for HTML/JS/CSS; cache-first for images/fonts only; never cache `/api/` routes
- **AI panel** is an in-flow flex sibling to `<main>` in `dashboard/layout.tsx` — not a fixed overlay

---

## File Map
Full file map is in memory: `aria_project_map.md` (auto-loaded each session).

Key locations:
- `src/lib/auth.ts` — NextAuth config
- `src/lib/authOrToken.ts` — `getAuthUser(req)` — use this in every API route
- `src/lib/encryption.ts` — `encrypt()`/`decrypt()`
- `src/lib/store.ts` — Zustand state
- `src/lib/providers/gmail.ts` — Gmail API wrapper
- `src/components/analysis/AnalysisPanel.tsx` — AI panel
- `src/app/dashboard/layout.tsx` — dashboard shell
- `prisma/schema.prisma` — DB schema (single source of truth)

---

## Out of Scope
`node_modules/` · `.next/` · `.vercel/` · `prisma/dev.db` · `aria-tester/node_modules/` · `*.env*`
