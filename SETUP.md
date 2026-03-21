# ARIA — Setup Vodič

## 1. Prerequisiti

- Node.js 20+
- PostgreSQL 15+ (lokalno ili Supabase)
- Redis (lokalno ili Upstash)
- Google Cloud Console account
- Azure App Registration (za Outlook)

---

## 2. Instalacija

```bash
cd aria-app
npm install
```

---

## 3. Environment varijable

```bash
cp .env.example .env
```

Popuni `.env`:

### PostgreSQL (Supabase preporučeno)
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### Auth
```
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

### Anthropic
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Google OAuth + Gmail API
1. Idi na https://console.cloud.google.com
2. Kreiraj novi project → "ARIA App"
3. APIs & Services → Enable: Gmail API, Google Calendar API
4. OAuth 2.0 Credentials → Web Application
5. Authorized redirect URIs: `http://localhost:3000/api/integrations/gmail/callback`
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Microsoft Azure (Outlook)
1. Idi na https://portal.azure.com
2. App Registrations → New Registration
3. Redirect URI: `http://localhost:3000/api/integrations/outlook/callback`
4. API Permissions: Mail.Read, Mail.Send, Mail.ReadWrite, Calendars.ReadWrite
```
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common
```

### Redis
```
REDIS_URL=redis://localhost:6379
# ili Upstash: rediss://...
```

### Encryption key (32 random chars)
```bash
ENCRYPTION_KEY=$(openssl rand -hex 16)
```

---

## 4. Database setup

```bash
npm run db:push    # Kreira tabele
npm run db:studio  # Otvara Prisma Studio
```

---

## 5. Pokretanje

Terminal 1 — Next.js:
```bash
npm run dev
```

Terminal 2 — BullMQ Workers:
```bash
npm run queue:worker
```

Otvori http://localhost:3000

---

## 6. Deployment (Vercel + Supabase)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add DATABASE_URL
# ... ostale varijable
```

### Redis na produkciji: Upstash
1. https://upstash.com → Kreiraj Redis database
2. Kopiraj REDIS_URL u Vercel env vars

---

## 7. Arhitektura

```
aria-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/analyze        # AI analiza emaila
│   │   │   ├── ai/briefing       # Jutarnji briefing
│   │   │   ├── ai/reply          # Slanje odgovora
│   │   │   ├── emails/           # CRUD emailovi
│   │   │   ├── tasks/            # CRUD taskovi
│   │   │   ├── integrations/     # OAuth Gmail + Outlook
│   │   │   ├── stats/            # Dashboard statistike
│   │   │   └── analytics/        # Analytics data
│   │   ├── dashboard/            # Glavni UI
│   │   └── login/                # Auth page
│   ├── agents/
│   │   ├── classificationAgent   # Email klasifikacija
│   │   ├── replyAgent            # Generisanje odgovora
│   │   ├── briefingAgent         # Jutarnji briefing
│   │   └── followUpAgent         # Follow-up emailovi
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── gmail.ts          # Gmail integration
│   │   │   └── outlook.ts        # Outlook integration
│   │   ├── anthropic.ts          # Claude API
│   │   ├── encryption.ts         # AES-256-GCM
│   │   └── queue.ts              # BullMQ
│   └── workers/
│       └── emailWorker.ts        # Background processing
├── prisma/
│   └── schema.prisma             # DB modeli
└── SETUP.md
```

---

## 8. Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| State | Zustand, React Query |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | NextAuth v5 |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Email | Gmail API, Microsoft Graph API |
| Encryption | AES-256-GCM |
| Hosting | Vercel + Supabase/Railway |

---

## 9. Monetizacija

| Plan | Cijena | Limiti |
|------|--------|--------|
| Free | €0 | 50 emailova/mj, 1 integracija |
| Pro | €29/mj | Neograničeno, 2 integracije |
| Team | €99/mj | Neograničeno, 5 integracija, tim funkcije |

---

## 10. Sigunost

- OAuth 2.0 za autentifikaciju
- OAuth tokeni enkriptovani AES-256-GCM
- Sve API pozive prema providerima ide kroz backend
- NextAuth JWT sesije
- Rate limiting preporučen (Upstash ratelimit)
- Input validacija sa Zod
