import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeEvent } from '@/lib/server/serialize'
import type { EventKind } from '@/lib/types'

const VALID_KINDS: EventKind[] = ['appointment', 'test', 'medication_end', 'reminder']

type CreateBody = {
  kind: EventKind
  title: string
  notes?: string
  dateTime: string
  location?: string
  linkedRecordId?: string
}

export async function POST(req: Request) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  if (!VALID_KINDS.includes(body.kind))
    return NextResponse.json({ error: 'Invalid event kind.' }, { status: 400 })
  if (!body.dateTime) return NextResponse.json({ error: 'dateTime is required.' }, { status: 400 })

  // If linkedRecordId is provided, make sure it belongs to the current user
  // — otherwise someone could attach events to foreign records.
  if (body.linkedRecordId) {
    const owned = await prisma.medicalRecord.findFirst({
      where: { id: body.linkedRecordId, userId: user.id },
      select: { id: true },
    })
    if (!owned)
      return NextResponse.json({ error: 'Linked record not found.' }, { status: 400 })
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      kind: body.kind,
      title: body.title.trim(),
      notes: body.notes?.trim() || null,
      dateTime: new Date(body.dateTime),
      location: body.location?.trim() || null,
      linkedRecordId: body.linkedRecordId ?? null,
    },
  })
  return NextResponse.json({ event: serializeEvent(event) })
}
