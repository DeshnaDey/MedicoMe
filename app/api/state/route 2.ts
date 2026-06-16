// GET /api/state — return the entire AppState for the signed-in user.
//
// The client's `useAppState()` hook expects a single blob of { account,
// settings, records, events, chatSessions }. Rather than making the client
// coordinate N separate fetches, we do one trip here. SWR dedupes and
// revalidates on mutation, so the re-fetch cost is fine.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { getCurrentUser } from '@/lib/server/session'
import {
  serializeAccount,
  serializeEvent,
  serializeRecord,
  serializeSession,
  serializeSettings,
} from '@/lib/server/serialize'
import type { AppState } from '@/lib/types'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    // Return a "logged-out" AppState rather than a 401 — the client treats
    // `account: null` as "go to login", which is what we want.
    const empty: AppState = {
      account: null,
      settings: { searchRadiusKm: 5, patientName: '' },
      records: [],
      events: [],
      chatSessions: [],
      seeded: true,
    }
    return NextResponse.json(empty)
  }

  // One roundtrip, parallel queries. Could be a single `include` tree but this
  // reads cleaner and the perf difference is negligible at prototype scale.
  const [settings, records, events, sessions] = await Promise.all([
    prisma.settings.findUnique({ where: { userId: user.id } }),
    prisma.medicalRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { medicines: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      orderBy: { dateTime: 'asc' },
    }),
    prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      include: { messages: { orderBy: { ts: 'asc' } } },
    }),
  ])

  const body: AppState = {
    account: serializeAccount(user),
    settings: serializeSettings(settings),
    records: records.map(serializeRecord),
    events: events.map(serializeEvent),
    chatSessions: sessions.map(serializeSession),
    seeded: true,
  }
  return NextResponse.json(body)
}
