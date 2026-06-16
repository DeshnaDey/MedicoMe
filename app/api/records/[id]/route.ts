import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized
  const { id } = await params

  // Guard against one user deleting another user's records.
  const existing = await prisma.medicalRecord.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.medicalRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
