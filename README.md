# Medico Me

A personal medical assistant built with **Next.js 16 + React 19 + Tailwind 4**.
Records, events, and chat history live in **Postgres** behind email/password auth
(bcrypt + JWT cookie). The diagnostic chatbot is a **hybrid rule-based decision
tree + local Ollama LLM** — the LLM call happens in the browser so self-hosted
Ollama stays local.

## Features

1. **Diagnostic chatbot** — rule-based triage for common symptoms (headache, cough, chest pain, etc.)
   with structured cards for home remedies, OTC meds, and specialist referrals. Severe cases surface
   **in-app doctor cards** showing name, clinic, distance, "See on maps" (pre-filled Google Maps
   directions) and "Book appointment" (clinic booking URL / `tel:` fallback). Free-text questions
   fall back to Ollama, with the patient's full medical history + past sessions baked into the
   system prompt.
2. **Calendar** — month grid of appointments, tests, and medication reminders.
3. **Medical records** — tabs for prescriptions, test results, doctor opinions, diagnoses,
   allergies, vitals, and notes. **Prescriptions support multiple medicines per record**, each with
   its own dosage and optional calendar reminders (once / twice / thrice daily for N days).
4. **Dashboard** — stats, upcoming events, recent records, and article cards (Mayo Clinic,
   MedlinePlus, NHS, CDC, NIH, FDA) ranked against your record tags.

## Running locally

### 1. Prerequisites

- Node 20+
- A Postgres database. The easiest path is a free [Supabase](https://supabase.com) project:
  create one, grab `Settings → Database → Connection string → URI`, and paste it as
  `DATABASE_URL` below.
- (Optional, for LLM chat) [Ollama](https://ollama.com). Pull a model and start it with
  `OLLAMA_ORIGINS=*` so the browser can reach it:
  ```bash
  ollama pull llama3.2
  OLLAMA_ORIGINS=* ollama serve
  ```

### 2. Configure env

```bash
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET.
# Generate AUTH_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install, migrate, run

```bash
npm install
npx prisma migrate dev --name init   # create tables in your Postgres
npm run dev                          # → http://localhost:3000
```

Sign up on the login page, then start adding records. Everything lives in your Postgres —
wipe your own data any time via **Settings → Reset data** (clears records/events/chat but keeps
the account).

## Configuration

Editable from the **Settings** page (in-app):

- Patient name — used in the dashboard greeting and the chat system prompt.
- Specialist search radius (km) — the chatbot prefers doctors within this radius.
- Reset data — clears your records/events/chat.

To change the Ollama URL or model, set `NEXT_PUBLIC_OLLAMA_URL` and
`NEXT_PUBLIC_OLLAMA_MODEL` in `.env.local` (see `.env.example`).

## Project layout

```
app/
  dashboard/                 stats, upcoming events, recent records, article cards
  chat/                      hybrid-triage chatbot with doctor cards (calls Ollama from browser)
  calendar/                  month grid + add event modal
  records/                   tabbed list + add record modal (multi-medicine prescriptions)
  settings/                  profile, radius, reset, sign out
  login/                     sign in / create account
  api/
    auth/ (signup|login|logout|me)   bcrypt + JWT cookie
    state/                   aggregated read for the client SWR hook
    records/                 POST + DELETE (medicine nested create)
    events/                  POST + DELETE
    chat/sessions/           POST session, PATCH/DELETE, POST messages
    settings/                PATCH
    reset/                   POST wipes records/events/chat (keeps account)
components/NavBar.tsx
lib/
  types.ts                   AppState, MedicalRecord, PrescriptionMedicine, CalendarEvent, ChatSession, …
  store.ts                   useAppState() + SWR + async CRUD helpers (fetch the API routes)
  auth.ts                    useRequireAuth() client-side route guard
  triage.ts                  rule-based symptom decision tree
  doctors.ts                 curated specialist directory (Bengaluru)
  articles.ts                curated article catalogue + ranker
  ai-config.ts               Ollama URL + model (reads NEXT_PUBLIC_OLLAMA_* env vars)
  server/                    server-only helpers (not imported from client code)
    db.ts                    Prisma singleton
    password.ts              bcryptjs wrapper (cost 10)
    session.ts               jose-based JWT + HTTP-only cookie session
    serialize.ts             DB row → client shape helpers
    prisma-client/           generated Prisma client (committed; regen with `prisma generate`)
prisma/
  schema.prisma              User, Settings, MedicalRecord, PrescriptionMedicine, CalendarEvent,
                             ChatSession, ChatMessage
```

> Not medical advice. For any serious symptoms, call emergency services.
