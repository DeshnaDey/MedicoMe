# Medico Me — prototype

A no-login, browser-only personal medical assistant built with **Next.js 16 + React 19 + Tailwind 4**.
All state (records, events, chat history, settings) lives in **localStorage** — no database, no auth.
The diagnostic chatbot is a **hybrid rule-based decision tree + local Ollama LLM**.

## Features

1. **Diagnostic chatbot** — rule-based triage for common symptoms (headache, cough, chest pain, etc.) with
   structured cards for home remedies / OTC meds / specialist referrals. Severe cases surface **in-app
   doctor cards** showing name, clinic, distance, "See on maps" (pre-filled Google Maps directions from
   your current location) and "Book appointment" (clinic booking URL / tel: call-reception fallback).
   Free-text questions fall back to Ollama, with the patient's full medical history + past sessions baked
   into the system prompt.
2. **Calendar** — month grid of appointments, tests, and medication end-dates. Manual entry.
3. **Medical records** — tabs for prescriptions, test results, doctor opinions, diagnoses, allergies,
   vitals, and notes. Tags drive article personalisation on the dashboard.
4. **Dashboard** — at-a-glance stats, upcoming events, recent records, and personalised article cards
   (Mayo Clinic, MedlinePlus, NHS, CDC, NIH, FDA, etc.) ranked against your record tags.

## Running locally

```bash
# 1. Install deps
npm install

# 2. (Optional, for AI chat) install + start Ollama
#    https://ollama.com
ollama pull llama3.2
ollama serve

# 3. Start Next.js
npm run dev
# → http://localhost:3000  (redirects to /dashboard)
```

The app starts completely empty — add your own records, events, and chat sessions. You can wipe
everything from **Settings → Reset data**.

## Configuration

Everything is controlled from the **Settings** page (in-app):

- Patient name
- Specialist search radius (km) — used when ranking the doctor directory
- Ollama URL + model + enable toggle
- Reset all data

`.env.local` only provides the *initial defaults* for Ollama URL/model. Once the app runs, the
Settings page overrides them (they're persisted in localStorage).

## Project layout

```
app/
  dashboard/     stats, upcoming, recent records, article cards
  chat/          hybrid-triage chatbot with doctor cards
  calendar/      month grid + add event modal
  records/       tabbed list + add record modal
  settings/      profile, radius, Ollama, reset
  api/
    chat/        thin Ollama proxy (bypasses browser CORS)
    ai/status/   Ollama availability probe
components/NavBar.tsx
lib/
  types.ts       MedicalRecord, CalendarEvent, ChatSession, …
  store.ts       useAppState() + CRUD, localStorage-backed
  seed.ts        empty starting state
  triage.ts      rule-based symptom decision tree
  doctors.ts     curated specialist directory (Bengaluru)
  articles.ts    curated article catalogue + ranker
  ai.ts          Ollama client
```

> Not medical advice. For any serious symptoms, call emergency services.
# MedicoMe
# MedicoMe
