// Client-side store. Data lives in Postgres; this module is the thin wrapper
// that fetches it (via SWR) and exposes mutation helpers that POST/PATCH/DELETE
// to the API routes. The `useAppState()` hook keeps the same shape it had in
// the localStorage era, so pages don't need to care whether the source is
// local or server.

'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type {
  AppState,
  CalendarEvent,
  ChatMessage,
  ChatSession,
  MedicalRecord,
  PrescriptionMedicine,
  Settings,
} from './types'

const STATE_KEY = '/api/state'

// Fallback used on the server and during initial client render before SWR has
// any data. Empty but shape-compatible, so destructuring in components never
// throws.
const FALLBACK: AppState = {
  account: null,
  settings: { searchRadiusKm: 5, patientName: '' },
  records: [],
  events: [],
  chatSessions: [],
  seeded: false,
}

async function fetcher(url: string): Promise<AppState> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return (await res.json()) as AppState
}

// Public hook — the signature matches the previous localStorage version so
// pages keep working unchanged.
export function useAppState(): AppState {
  const { data } = useSWR<AppState>(STATE_KEY, fetcher, {
    revalidateOnFocus: true,
    // Don't thrash the DB: SWR will still revalidate on focus and after
    // mutations, but don't poll aimlessly on a stale tab.
    refreshInterval: 0,
  })
  return data ?? FALLBACK
}

// Revalidate the aggregated state blob. Every mutation helper calls this so
// the UI picks up the change without a full page reload.
function refresh() {
  return globalMutate(STATE_KEY)
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export type SignupResult = { ok: true } | { ok: false; error: string }
export type LoginResult = { ok: true } | { ok: false; error: string }

export async function signup(input: {
  name: string
  email: string
  password: string
}): Promise<SignupResult> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error ?? 'Something went wrong.' }
  await refresh()
  return { ok: true }
}

export async function login(input: {
  email: string
  password: string
}): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error ?? 'Something went wrong.' }
  await refresh()
  return { ok: true }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  await refresh()
}

// ─── Records ───────────────────────────────────────────────────────────────
export async function addRecord(
  input: Omit<MedicalRecord, 'id' | 'createdAt'>
): Promise<MedicalRecord | null> {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return null
  const { record } = (await res.json()) as { record: MedicalRecord }
  await refresh()
  return record
}

export async function deleteRecord(id: string) {
  await fetch(`/api/records/${id}`, { method: 'DELETE', credentials: 'include' })
  await refresh()
}

// `updateRecord` was on the old API but nothing in the UI calls it. Left as
// a TODO — if/when records become editable, add an API route and wire it here.
export async function updateRecord(_id: string, _patch: Partial<MedicalRecord>) {
  throw new Error('updateRecord is not implemented on the server yet.')
}

// ─── Events ────────────────────────────────────────────────────────────────
export async function addEvent(
  input: Omit<CalendarEvent, 'id' | 'createdAt'>
): Promise<CalendarEvent | null> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return null
  const { event } = (await res.json()) as { event: CalendarEvent }
  await refresh()
  return event
}

export async function deleteEvent(id: string) {
  await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' })
  await refresh()
}

export async function updateEvent(_id: string, _patch: Partial<CalendarEvent>) {
  throw new Error('updateEvent is not implemented on the server yet.')
}

// ─── Settings ──────────────────────────────────────────────────────────────
export async function updateSettings(patch: Partial<Settings>) {
  await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  await refresh()
}

// ─── Chat sessions ─────────────────────────────────────────────────────────
export async function newChatSession(title: string): Promise<ChatSession | null> {
  const res = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title }),
  })
  if (!res.ok) return null
  const { session } = (await res.json()) as { session: ChatSession }
  await refresh()
  return session
}

export async function appendMessage(
  sessionId: string,
  msg: Omit<ChatMessage, 'id' | 'ts'>
): Promise<ChatMessage | null> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(msg),
  })
  if (!res.ok) return null
  const { message } = (await res.json()) as { message: ChatMessage }
  await refresh()
  return message
}

export async function patchChatSession(sessionId: string, patch: Partial<ChatSession>) {
  await fetch(`/api/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  await refresh()
}

export async function deleteChatSession(sessionId: string) {
  await fetch(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await refresh()
}

// ─── Wipe ──────────────────────────────────────────────────────────────────
export async function resetToSeed() {
  await fetch('/api/reset', { method: 'POST', credentials: 'include' })
  await refresh()
}
