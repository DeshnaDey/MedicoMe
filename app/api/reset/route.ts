import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'

// POST /api/reset — wipe all of the current user's data (records, events,
// chat sessions) but keep the account itself and their Settings row. Cascade
// deletes handle the child tables (medicines, messages).
export async function POST() {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({ where: { userId: user.id } }),
    prisma.chatSession.deleteMany({ where: { userId: user.id } }),
    prisma.medicalRecord.deleteMany({ where: { userId: user.id } }),
  ])
  return NextResponse.json({ ok: true })
}
