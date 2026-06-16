# Medico Me — agent notes

Personal medical assistant. Next.js 16 App Router + React 19 + Tailwind 4 + TypeScript strict.

## Architecture

- **Backend:** Next.js route handlers under `app/api/*` → Prisma (custom output at
  `lib/server/prisma-client`) → Postgres (Supabase).
- **Auth:** email + password. Passwords bcrypted (cost 10). Session = JWT (jose, HS256) in an
  HTTP-only cookie named `medico_session`, 30-day expiry. Helpers live in `lib/server/session.ts`.
- **Client store:** `lib/store.ts` — SWR over `/api/state` (one aggregate read). All mutations are
  async fetch wrappers that call `refresh()` (i.e. `mutate('/api/state')`) on completion. Pages
  consume state via `useAppState()`; its shape is the same as the old localStorage era
  (`account | settings | records | events | chatSessions | seeded`).
- **Auth guard:** `useRequireAuth()` in `lib/auth.ts`. Waits for `state.seeded` to flip before
  deciding whether to redirect, so freshly-loaded tabs don't bounce authenticated users to /login.
- **Chat:** rule-based triage lives entirely client-side (`lib/triage.ts`). Free-text falls
  through to a server-side proxy: the browser POSTs the conversation (system prompt + turns) to
  `/api/chat`, which is auth-guarded and calls the AI provider via `lib/server/ai.ts`. The provider
  speaks the plain Ollama API, so the same code path works against Ollama Cloud (prod, with
  `OLLAMA_API_KEY`) or a local Ollama (dev, no key). The key never reaches the browser.

## Key invariants

- Every mutation helper in `lib/store.ts` is **async and may return null on failure** (e.g. session
  expired mid-flight). Pages must handle the null case — in practice they return early and surface
  a toast.
- API routes always call `requireUser()` first and early-return its `unauthorized` response if the
  session isn't valid. Ownership checks live inline where a route accepts an id parameter.
- `/api/reset` wipes records, events, and chat sessions but **keeps the account + settings** —
  "Reset data" is not "delete account".
- Login returns the same "Invalid email or password" for both unknown-email and wrong-password
  cases. Don't split them — that would enable enumeration.

## Env vars

- `DATABASE_URL` — Postgres connection string (required)
- `AUTH_SECRET` — JWT signing secret, ≥ 32 chars (required)
- `OLLAMA_BASE_URL` — AI endpoint, default `https://api.ollama.com` (set to `http://127.0.0.1:11434` for local dev)
- `OLLAMA_API_KEY` — server-side AI key; required for Ollama Cloud, omit for local Ollama
- `OLLAMA_MODEL` — model id, default `gpt-oss:20b`

## Common ops

- Change the schema: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <label>`.
  The client regenerates into `lib/server/prisma-client` automatically.
- Typecheck: `node_modules/.bin/tsc --noEmit` (or `npm run lint` for ESLint).
- Build: `npm run build`.
