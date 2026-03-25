# ARIA — AI Executive Assistant
Next.js 15 app. Gmail/Outlook email triage, AI agents, tasks, calendar, analytics.

**Repo:** https://github.com/pakito955/ARIA | **Deploy:** Vercel (auto from `main`)

---

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 15, App Router, TypeScript strict |
| DB | Prisma ORM — PostgreSQL (prod), SQLite (dev) |
| Auth | NextAuth v5, Google OAuth, JWT — do NOT set `NEXTAUTH_URL` on Vercel |
| Client data | TanStack Query (all fetching) |
| UI | Tailwind CSS + CSS vars + Radix UI + Framer Motion (modals only) |
| State | Zustand (`src/lib/store.ts`) |
| AI | Anthropic SDK — haiku-4-5 (real-time), sonnet-4-6 (analysis) |
| Queue | BullMQ + ioredis |
| Email APIs | googleapis (Gmail), @microsoft/microsoft-graph-client (Outlook) |

---

## Commands
```bash
npm run dev           # localhost:3000
npm run build         # prisma generate + next build
npm run db:push       # apply schema — run after EVERY schema edit
npm run db:migrate    # named migration
npm run db:studio     # Prisma Studio
npm run queue:worker  # BullMQ email worker
npm run test:unit     # vitest
npm run test:e2e      # playwright
```

---

## Code Rules

**Auth** — Always `getAuthUser(req)` from `src/lib/authOrToken.ts`. Never `auth()` directly. Supports session + Bearer token.

**Encryption** — All OAuth tokens stored AES-256-GCM encrypted. `encrypt()`/`decrypt()` from `src/lib/encryption.ts`. Never lose `ENCRYPTION_KEY` env var.

**Email sync** — Always fire-and-forget: `syncGmailEmails(...).catch(...)`. Never `await` in a GET handler.

**TanStack Query** — `queryKey` must include all filter params. Always set `staleTime`.

**Performance (INP)** — No Framer Motion on list items. Use `startTransition` for large re-renders. No `window.prompt` in click handlers.

**CSS** — `var(--token)` always; never hardcode colors. Tokens in `globals.css`. `cn()` for conditionals. `className` over inline `style`.

**Exports** — Named exports only in `src/lib/`. No default exports for utilities.

**Stats route** `/api/stats` must always return `{ unread, critical, tasks, waiting }` — all 4 or sidebar breaks.

---

## Design Tokens (globals.css)
| Token | Use |
|-------|-----|
| `--accent` `#7C5CFF` | Primary purple |
| `--bg-base` `#0B0B0F` | Page background |
| `--bg-surface` / `--bg-card` / `--bg-hover` | Surfaces (progressively lighter) |
| `--text-1` / `--text-2` / `--text-3` | Text hierarchy (white → muted) |
| `--red` / `--amber` / `--green` / `--blue` | Status + `-subtle` variants |

---

## File Map

### Entry Points
```
src/app/layout.tsx              — Root layout, Providers, theme
src/app/page.tsx                — Landing / redirect to dashboard
src/app/login/page.tsx          — Login screen
src/app/onboarding/page.tsx     — First-run onboarding
src/app/dashboard/layout.tsx    — Dashboard shell (Sidebar + AI panel as flex sibling to <main>)
src/app/dashboard/page.tsx      — Main dashboard (widgets)
src/app/globals.css             — All CSS tokens
```

### Dashboard Pages
```
src/app/dashboard/inbox/        — Main inbox
src/app/dashboard/calendar/     — Calendar view
src/app/dashboard/tasks/        — Task list
src/app/dashboard/analytics/    — Email analytics
src/app/dashboard/briefing/     — Daily AI briefing
src/app/dashboard/insights/     — AI insights
src/app/dashboard/followups/    — Follow-up reminders
src/app/dashboard/queue/        — Draft approval queue
src/app/dashboard/rules/        — Email automation rules
src/app/dashboard/templates/    — Email templates
src/app/dashboard/knowledge/    — Knowledge base
src/app/dashboard/settings/     — User settings
src/app/dashboard/report/       — Weekly report
src/app/dashboard/unsubscribe/  — Unsubscribe manager
src/app/dashboard/waiting/      — Waiting for reply
```

### API Routes
```
/api/auth/[...nextauth]         — NextAuth
/api/emails                     — List/search emails (GET), bulk actions
/api/emails/[id]                — Get email, archive, snooze, thread
/api/emails/stream              — SSE real-time sync stream
/api/calendar                   — Calendar events
/api/tasks                      — Task CRUD
/api/stats                      — Sidebar counts {unread,critical,tasks,waiting}
/api/ai/*                       — All AI endpoints (see below)
/api/briefing/daily             — Morning briefing
/api/followup                   — Follow-up reminders
/api/rules                      — Email automation rules
/api/templates                  — Email templates
/api/knowledge                  — Knowledge base
/api/notifications              — Notification bell
/api/queue                      — Draft approval queue
/api/analytics                  — Usage analytics
/api/webhooks                   — Webhook triggers
/api/integrations/gmail         — Gmail OAuth connect
/api/integrations/outlook       — Outlook OAuth connect
/api/integrations/imap          — IMAP connect
/api/cron/*                     — Cron jobs (followup-check, snooze, scheduled)
/api/export/crm                 — CRM export
/api/extension/token            — Browser extension token
```

### AI API Endpoints
```
/api/ai/analyze         — Classify + analyze email
/api/ai/draft           — Generate draft reply
/api/ai/reply           — Reply generation
/api/ai/smart-reply     — Quick smart replies
/api/ai/compose         — Compose new email
/api/ai/briefing        — Daily briefing generation
/api/ai/meetingprep     — Meeting prep notes
/api/ai/followup        — Follow-up suggestions
/api/ai/brain-dump      — Brain dump processor
/api/ai/bulk-action     — Bulk AI actions
/api/ai/insights        — Email insights
/api/ai/smart-search    — Natural language search
/api/ai/suggest-rules   — AI rule suggestions
/api/ai/tone            — Tone analysis/adjustment
/api/ai/voice-command   — Voice command processing
/api/ai/voice-agent     — Voice agent (TTS)
/api/ai/writing-coach   — Writing improvement
/api/ai/regenerate      — Regenerate draft
/api/ai/detect-meeting  — Detect meeting in email
```

### AI Agents (src/agents/)
```
classificationAgent.ts  — Email triage (priority, category, intent, sentiment)
replyAgent.ts           — Reply generation (short/professional/friendly)
briefingAgent.ts        — Morning briefing
meetingPrepAgent.ts     — Meeting prep
followUpAgent.ts        — Follow-up tracking
insightsAgent.ts        — Analytics insights
knowledgeAgent.ts       — Knowledge base queries
schedulingAgent.ts      — Calendar scheduling
brainDumpAgent.ts       — Brain dump to tasks/drafts
webhookDraftAgent.ts    — Webhook → draft email
```

### Core Libraries (src/lib/)
```
auth.ts             — NextAuth config (NEVER use directly in API routes)
authOrToken.ts      — getAuthUser(req) — USE THIS in all API routes
encryption.ts       — encrypt()/decrypt() — AES-256-GCM for tokens
prisma.ts           — Prisma client singleton
store.ts            — Zustand global UI state
utils.ts            — cn(), date helpers
queue.ts            — BullMQ queue setup
rate-limit.ts       — Upstash rate limiting
anthropic.ts        — Anthropic SDK client
slack.ts            — Slack integration
notion.ts           — Notion integration
linear.ts           — Linear integration
theme.tsx           — Theme provider
widgets.tsx         — Widget registry
providers/gmail.ts  — GmailProvider (auto-refresh tokens)
providers/outlook.ts — OutlookProvider
providers/imap.ts   — ImapProvider
providers/types.ts  — EmailProviderInterface
```

### Components (src/components/)
```
layout/
  DashboardShell.tsx  — Main shell wrapper
  Sidebar.tsx         — Navigation sidebar
  Topbar.tsx          — Top bar with search
  MobileNav.tsx       — Mobile navigation
  PageTransition.tsx  — Page transitions

inbox/
  EmailCard.tsx       — Email list item
  ThreadView.tsx      — Thread/conversation view
  SmartReply.tsx      — AI smart reply panel
  WritingCoach.tsx    — Writing coach overlay
  BulkActionBar.tsx   — Bulk selection bar
  ContactPanel.tsx    — Contact info slide-in
  MeetingBooking.tsx  — Meeting booking UI
  SnoozeMenu.tsx      — Snooze quick menu
  SnoozePickerModal.tsx — Snooze date picker

dashboard/
  WidgetGallery.tsx          — Widget picker
  widgets/AiBriefingWidget   — AI briefing
  widgets/CriticalNowWidget  — Critical emails
  widgets/DailyScoreWidget   — Productivity score
  widgets/EmailVolumeWidget  — Volume chart
  widgets/FollowupsWidget    — Follow-ups
  widgets/InboxProgressWidget — Inbox zero progress
  widgets/InvoicesWidget     — Invoice tracking
  widgets/NextActionWidget   — AI next action
  widgets/QuickActionsWidget — Quick actions
  widgets/ResponseTimeWidget — Response time stats
  widgets/TodayTimelineWidget — Today's schedule
  widgets/TopSendersWidget   — Top senders

analysis/
  AnalysisPanel.tsx   — AI analysis right panel (flex sibling to <main>)

settings/
  ExtensionTokenManager.tsx — Chrome extension token
  ImapConnectModal.tsx      — IMAP setup
  VipContactManager.tsx     — VIP contacts

notifications/
  NotificationBell.tsx — Notification dropdown

ui/
  AnimatedNumber.tsx  — Animated counter
  Skeletons.tsx       — Loading skeletons
  Toast.tsx           — Toast notifications

CommandPalette.tsx    — Cmd+K command palette
ComposeModal.tsx      — Compose new email
KeyboardShortcuts.tsx — Keyboard shortcut help
LandingPage.tsx       — Marketing landing
NotificationManager.tsx — Global notification handler
OnboardingFlow.tsx    — Onboarding wizard
Providers.tsx         — All React providers
TriageMode.tsx        — Focus triage mode
VoiceBriefing.tsx     — Voice briefing playback
VoiceCommand.tsx      — Voice command input
```

### Hooks (src/hooks/)
```
useDebounce.ts       — Debounce hook
useInboxKeyboard.ts  — Keyboard shortcuts for inbox
useVoice.ts          — Voice input/output
useWidgetConfig.ts   — Dashboard widget config
```

### Workers & Types
```
src/workers/emailWorker.ts  — BullMQ worker (email sync + analysis jobs)
src/types/index.ts          — All TypeScript types (UnifiedEmail, EmailAnalysis, etc.)
```

### DB Models (prisma/schema.prisma)
```
User, Account, Session     — Auth (NextAuth)
Integration                — Gmail/Outlook/IMAP connections (encrypted tokens)
Email, Thread              — Stored emails
AIAnalysis                 — AI classification results
Task                       — Tasks extracted from emails
CalendarEvent              — Calendar events
Briefing                   — Daily briefings
VipContact                 — VIP sender list
EmailTemplate              — Email templates
FollowupReminder           — Follow-up tracking
ScheduledEmail             — Scheduled sends
ExtensionToken             — Browser extension auth
OutboxEmail                — Outbox queue
EmailSignature             — Email signatures
EmailRule                  — Automation rules
Notification               — In-app notifications
UserSettings               — Per-user config
KnowledgeItem              — Knowledge base
ContactNote                — Notes per contact
DraftEmail                 — Approval queue drafts
Webhook                    — Outbound webhooks
```

---

## Critical Constraints
- `prisma db push` after every schema change
- `/api/stats` must return all 4 fields: `{ unread, critical, tasks, waiting }`
- `public/sw.js` — network-first for HTML/JS/CSS; cache-first images/fonts; NEVER cache `/api/`
- AI panel (`AnalysisPanel`) is a flex sibling to `<main>` in `dashboard/layout.tsx` — NOT a fixed overlay
- Service worker files in `public/`: `sw.js`, `swe-worker-*.js`, `workbox-*.js`

---

## Out of Scope
`node_modules/` · `.next/` · `.vercel/` · `prisma/dev.db` · `aria-tester/node_modules/` · `*.env*` · `superpowers/` · `.agents/`
