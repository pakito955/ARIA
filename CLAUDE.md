# Project: ARIA
AI-powered email assistant — Gmail/Outlook integration, AI triage, tasks, calendar, analytics.

**Repo:** https://github.com/pakito955/ARIA | **Deploy:** Vercel (auto from `main`)

---

## Tech Stack
- **Next.js 15** (App Router, Server Components)
- **TypeScript** (strict mode)
- **Prisma ORM** + SQLite (dev) / PostgreSQL (prod via `DATABASE_URL`)
- **NextAuth v5** — Google OAuth, JWT sessions, `trustHost: true`
- **TanStack Query** — all client-side data fetching
- **Tailwind CSS** + custom CSS variables (design tokens in `globals.css`)
- **Framer Motion** — modals and overlays only (not list items)
- **Anthropic SDK** (`claude-haiku-4-5` for real-time AI, `claude-sonnet-4-6` for analysis)
- **Zustand** — global UI state (`src/lib/store.ts`)
- **BullMQ + ioredis** — background job queue
- **googleapis** — Gmail + Calendar API
- **@microsoft/microsoft-graph-client** — Outlook (scaffolded)

---

## Commands
```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build (runs prisma generate first)
npm run lint         # ESLint
npm run db:push      # apply schema changes (no migration file)
npm run db:migrate   # create + apply a named migration
npm run db:studio    # open Prisma Studio
npm run db:seed      # seed the database
npm run queue:worker # start BullMQ email worker
```

---

## Full File Map

### Pages
```
src/app/
  globals.css                         — design tokens, all CSS variables
  layout.tsx                          — root layout (Providers)
  page.tsx                            — / redirect
  login/page.tsx                      — Google OAuth sign-in
  onboarding/page.tsx                 — 3-step post-login setup
  dashboard/
    layout.tsx                        — shell: Sidebar + main + AnalysisPanel (in-flow flex)
    page.tsx                          — /dashboard home, widgets
    inbox/page.tsx                    — main inbox (email list + reading pane)
    analytics/page.tsx
    calendar/page.tsx
    tasks/page.tsx
    followups/page.tsx
    rules/page.tsx
    settings/page.tsx
    templates/page.tsx
    report/page.tsx
    unsubscribe/page.tsx
    waiting/page.tsx
```

### API Routes
```
src/app/api/
  auth/[...nextauth]/route.ts         — NextAuth handler
  stats/route.ts                      — {unread, critical, tasks, waiting} — ALL 4 required
  emails/
    route.ts                          — GET list/search
    [id]/route.ts                     — GET detail
    [id]/archive/route.ts             — POST archive
    [id]/snooze/route.ts              — POST snooze
    [id]/unsnooze/route.ts            — POST unsnooze
    [id]/thread/route.ts              — GET thread
    bulk/route.ts                     — POST bulk actions
    snooze/route.ts                   — POST snooze (legacy)
    schedule/route.ts                 — POST schedule send
    search/route.ts                   — GET search
    stream/route.ts                   — GET SSE real-time updates
    thread/[threadId]/route.ts        — GET thread by id
  ai/
    analyze/route.ts                  — POST full email analysis
    reply/route.ts                    — POST send reply
    smart-reply/route.ts
    regenerate/route.ts
    briefing/route.ts
    compose/route.ts
    draft/route.ts
    tone/route.ts
    writing-coach/route.ts
    bulk-action/route.ts
    detect-meeting/route.ts
    meetingprep/route.ts
    followup/route.ts
    smart-search/route.ts
  tasks/route.ts
  calendar/
    events/route.ts
    prep/route.ts
  notifications/
    route.ts
    [id]/read/route.ts
  rules/
    route.ts
    [id]/route.ts
  signatures/
    route.ts
    [id]/route.ts
  templates/
    route.ts
    [id]/route.ts
  followup/route.ts
  outbox/route.ts
  analytics/route.ts
  contacts/
    [email]/route.ts                  — contact intelligence
    health/route.ts
  vip/route.ts
  score/route.ts
  report/weekly/route.ts
  invoices/route.ts
  export/crm/route.ts
  unsubscribe/route.ts
  track/[token]/route.ts              — read receipt pixel
  extension/token/route.ts            — Chrome extension bearer token
  integrations/
    gmail/route.ts
    gmail/callback/route.ts
    outlook/route.ts
    outlook/callback/route.ts
    slack/send/route.ts
  webhooks/route.ts
  cron/
    snooze/route.ts
    followup-check/route.ts
    scheduled/route.ts
  debug/route.ts
```

### Components
```
src/components/
  analysis/
    AnalysisPanel.tsx                 — AI side panel (in-flow, 0→380px CSS transition)
                                        Exports: AnalysisPanel, AITriggerButton
  layout/
    Sidebar.tsx                       — left sidebar navigation
    MobileNav.tsx                     — bottom nav (mobile)
    PageTransition.tsx                — page animation wrapper
    Topbar.tsx
  inbox/
    EmailCard.tsx                     — email list item
    ThreadView.tsx                    — email thread
    SmartReply.tsx                    — AI reply
    WritingCoach.tsx                  — AI writing coach
    MeetingBooking.tsx                — meeting scheduling
    BulkActionBar.tsx                 — bulk actions bar
    ContactPanel.tsx                  — slide-in contact intel
    SnoozeMenu.tsx                    — snooze dropdown
    SnoozePickerModal.tsx             — snooze date picker
  dashboard/
    WidgetGallery.tsx                 — widget grid layout
    widgets/
      AiBriefingWidget.tsx
      CriticalNowWidget.tsx
      DailyScoreWidget.tsx
      EmailVolumeWidget.tsx
      FollowupsWidget.tsx
      InboxProgressWidget.tsx
      InvoicesWidget.tsx
      NextActionWidget.tsx
      QuickActionsWidget.tsx
      ResponseTimeWidget.tsx
      TodayTimelineWidget.tsx
      TopSendersWidget.tsx
  settings/
    ExtensionTokenManager.tsx
    VipContactManager.tsx
  notifications/
    NotificationBell.tsx
  ui/
    Toast.tsx
    Skeletons.tsx
    AnimatedNumber.tsx
  CommandPalette.tsx                  — ⌘K palette
  ComposeModal.tsx                    — compose email modal
  OnboardingFlow.tsx                  — 3-step onboarding
  KeyboardShortcuts.tsx               — keyboard shortcuts overlay
  NotificationManager.tsx             — in-app notifications
  TriageMode.tsx                      — triage mode overlay
  VoiceBriefing.tsx                   — voice briefing
  Providers.tsx                       — TanStack Query + Auth providers
```

### Libraries & Agents
```
src/lib/
  auth.ts                             — NextAuth config (trustHost, JWT, auto-create Integration)
  authOrToken.ts                      — getAuthUser(req) — ALWAYS use this in API routes
  prisma.ts                           — Prisma client singleton
  encryption.ts                       — encrypt()/decrypt() for OAuth tokens
  store.ts                            — Zustand: aiPanelOpen, selectedEmailId, emailFilter…
  utils.ts                            — cn() + misc utils
  anthropic.ts                        — Anthropic SDK client
  queue.ts                            — BullMQ queue setup
  slack.ts / notion.ts / linear.ts    — third-party clients
  theme.tsx / widgets.tsx
  providers/
    gmail.ts                          — Gmail API: fetch, send, archive, mark-read, token refresh
    outlook.ts                        — Outlook/Graph (scaffolded)
    types.ts                          — provider type definitions

src/agents/
  briefingAgent.ts
  classificationAgent.ts
  followUpAgent.ts
  meetingPrepAgent.ts
  replyAgent.ts

src/hooks/
  useDebounce.ts
  useInboxKeyboard.ts
  useWidgetConfig.ts

src/workers/
  emailWorker.ts                      — BullMQ email processing worker

src/types/index.ts

prisma/schema.prisma                  — SINGLE SOURCE OF TRUTH for DB schema
public/sw.js                          — service worker
public/manifest.json                  — PWA manifest
aria-tester/index.ts                  — standalone AI testing agent
```

---

## Code Style
- **Auth in API routes** — always `getAuthUser(req)` from `authOrToken.ts`; never `auth()` directly
- **No default exports for utilities** — named exports only in `src/lib/`
- **Encryption** — all OAuth tokens stored encrypted; `encrypt()`/`decrypt()` from `encryption.ts`
- **Non-blocking sync** — `syncGmailEmails(...).catch(...)`, never `await` in GET handler
- **TanStack Query** — `queryKey` must include all filter params; use `staleTime`
- **Framer Motion** — modals/overlays only; never animate list items (INP)
- **CSS** — `var(--token)` always; never hardcode colors
- **Tailwind** — `className` over inline `style`; `cn()` for conditionals

---

## Design Tokens (globals.css)
| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#7C5CFF` | Primary purple accent |
| `--accent-text` | lighter purple | Text on accent bg |
| `--accent-subtle` | purple/8% | Subtle accent bg |
| `--bg-base` | `#0B0B0F` | Page background |
| `--bg-surface` | slightly lighter | Surface cards |
| `--bg-card` | card background | Card components |
| `--bg-hover` | hover state | Hover backgrounds |
| `--text-1` | white | Primary text |
| `--text-2` | gray | Secondary text |
| `--text-3` | muted gray | Muted/placeholder |
| `--border` | subtle border | Default borders |
| `--border-medium` | visible border | Emphasized borders |
| `--red/amber/green/blue` | status colors | + `-subtle` variants |

---

## Critical Rules
- **`prisma db push`** after every schema change
- **`ENCRYPTION_KEY`** env var must always be set — losing it = all tokens unreadable
- **Stats route** must return `{ unread, critical, tasks, waiting }` — all 4 always
- **Archive endpoint** `POST /api/emails/[id]/archive` must exist
- **AI Panel** — in-flow flex sibling to `<main>` in `layout.tsx`, width 0→380px CSS transition
- **Service worker** — network-first for HTML/JS/CSS; cache-first for images/fonts; never cache `/api/`
- **INP** — no sync work in click handlers; use `startTransition` for heavy re-renders

---

## Out of Scope (never touch)
- `node_modules/` / `.next/` / `.vercel/`
- `prisma/dev.db`
- `aria-tester/node_modules/`
- Any `*.env*` files
