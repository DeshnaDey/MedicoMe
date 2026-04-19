// Client-side localStorage store. All persistence for the prototype lives here.
// Provides: getState(), setState(), a small pub-sub for components, and helpers
// for the common CRUD operations on records / events / chat sessions / settings.

'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type {
  Account,
  AppState,
  MedicalRecord,
  CalendarEvent,
  ChatSession,
  ChatMessage,
  Settings,
} from './types'
import { buildSeed } from './seed'
import { hashPassword } from './auth'

const KEY = 'medico_me_state_v1'

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function loadRaw(): AppState {
  if (typeof window === 'undefined') return buildSeed()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const seeded = buildSeed()
      window.localStorage.setItem(KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw) as AppState
    // Defensive: fill missing keys if schema evolved
    return {
      ...buildSeed(),
      ...parsed,
      settings: { ...buildSeed().settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return buildSeed()
  }
}

function saveRaw(state: AppState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(state))
  // Same-tab storage event for cross-component reactivity
  window.dispatchEvent(new Event('medicome:state'))
}

// ─── Subscription plumbing for useSyncExternalStore ─────────────────────────
function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = () => listener()
  window.addEventListener('storage', onStorage)
  window.addEventListener('medicome:state', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('medicome:state', onStorage)
  }
}

// Cached snapshot so getSnapshot is referentially stable until something changes.
let cachedSnapshot: AppState | null = null
let cachedRaw: string | null = null
function getSnapshot(): AppState {
  if (typeof window === 'undefined') {
    if (!cachedSnapshot) cachedSnapshot = buildSeed()
    return cachedSnapshot
  }
  const raw = window.localStorage.getItem(KEY)
  if (raw === cachedRaw && cachedSnapshot) return cachedSnapshot
  cachedSnapshot = loadRaw()
  cachedRaw = JSON.stringify(cachedSnapshot)
  return cachedSnapshot
}
function getServerSnapshot(): AppState {
  if (!cachedSnapshot) cachedSnapshot = buildSeed()
  return cachedSnapshot
}

export function useAppState(): AppState {
  // Hydrate-safely: start with seed on server/initial, update to real after mount.
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated ? snap : getServerSnapshot()
}

// ─── Mutations ─────────────────────────────────────────────────────────────
function update(mut: (s: AppState) => AppState) {
  const current = loadRaw()
  const next = mut(current)
  saveRaw(next)
  // Invalidate cached snapshot so next read picks up changes.
  cachedSnapshot = next
  cachedRaw = JSON.stringify(next)
}

// Records --------------------------------------------------------------------
export function addRecord(input: Omit<MedicalRecord, 'id' | 'createdAt'>): MedicalRecord {
  const record: MedicalRecord = { ...input, id: genId('rec'), createdAt: new Date().toISOString() }
  update((s) => ({ ...s, records: [record, ...s.records] }))
  return record
}
export function updateRecord(id: string, patch: Partial<MedicalRecord>) {
  update((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
}
export function deleteRecord(id: string) {
  update((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }))
}

// Events ---------------------------------------------------------------------
export function addEvent(input: Omit<CalendarEvent, 'id' | 'createdAt'>): CalendarEvent {
  const event: CalendarEvent = { ...input, id: genId('evt'), createdAt: new Date().toISOString() }
  update((s) => ({ ...s, events: [...s.events, event].sort((a, b) => a.dateTime.localeCompare(b.dateTime)) }))
  return event
}
export function updateEvent(id: string, patch: Partial<CalendarEvent>) {
  update((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
}
export function deleteEvent(id: string) {
  update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))
}

// Settings -------------------------------------------------------------------
export function updateSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
}

// Chat sessions --------------------------------------------------------------
export function newChatSession(title: string): ChatSession {
  const session: ChatSession = {
    id: genId('cs'),
    startedAt: new Date().toISOString(),
    title,
    messages: [],
    symptoms: [],
    status: 'open',
  }
  update((s) => ({ ...s, chatSessions: [session, ...s.chatSessions] }))
  return session
}
export function appendMessage(sessionId: string, msg: Omit<ChatMessage, 'id' | 'ts'>) {
  const full: ChatMessage = { ...msg, id: genId('m'), ts: new Date().toISOString() }
  update((s) => ({
    ...s,
    chatSessions: s.chatSessions.map((cs) =>
      cs.id === sessionId ? { ...cs, messages: [...cs.messages, full] } : cs
    ),
  }))
  return full
}
export function patchChatSession(sessionId: string, patch: Partial<ChatSession>) {
  update((s) => ({
    ...s,
    chatSessions: s.chatSessions.map((cs) => (cs.id === sessionId ? { ...cs, ...patch } : cs)),
  }))
}
export function deleteChatSession(sessionId: string) {
  update((s) => ({ ...s, chatSessions: s.chatSessions.filter((cs) => cs.id !== sessionId) }))
}

// Account / auth -------------------------------------------------------------
// localStorage-only auth: we store a hashed password with the account so the
// password itself never sits in plaintext. The "login" check recomputes the
// hash with the same salt and compares — no server involved.

export type SignupResult = { ok: true } | { ok: false; error: string }
export type LoginResult = { ok: true } | { ok: false; error: string }

export function signup(input: { name: string; email: string; password: string }): SignupResult {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email looks invalid.' }
  if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

  const current = loadRaw()
  if (current.account) {
    return { ok: false, error: 'An account already exists on this device. Sign out first to make a new one.' }
  }
  const account: Account = {
    email,
    name,
    passwordHash: hashPassword(input.password, email),
    createdAt: new Date().toISOString(),
  }
  update((s) => ({
    ...s,
    account,
    // Seed the patient name so the dashboard greets them by first name.
    settings: { ...s.settings, patientName: s.settings.patientName || name },
  }))
  return { ok: true }
}

export function login(input: { email: string; password: string }): LoginResult {
  const email = input.email.trim().toLowerCase()
  const state = loadRaw()
  if (!state.account) return { ok: false, error: 'No account found on this device. Create one first.' }
  if (state.account.email !== email) return { ok: false, error: 'No account with that email.' }
  const expected = hashPassword(input.password, email)
  if (expected !== state.account.passwordHash) return { ok: false, error: 'Incorrect password.' }
  // Explicitly re-save to notify subscribers even though nothing changed.
  update((s) => ({ ...s, account: s.account }))
  return { ok: true }
}

export function logout() {
  // Logging out clears the account pointer but keeps records/events intact, so
  // a returning user can sign back in and see their data again.
  update((s) => ({ ...s, account: null }))
}

// Wipe --------------------------------------------------------------
export function resetToSeed() {
  const fresh = buildSeed()
  saveRaw(fresh)
  cachedSnapshot = fresh
  cachedRaw = JSON.stringify(fresh)
}
