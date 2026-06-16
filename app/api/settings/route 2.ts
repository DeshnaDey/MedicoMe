import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeSettings } from '@/lib/server/serialize'

export async function PATCH(req: Request) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as
    | { searchRadiusKm?: number; patientName?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })

  const updated = await prisma.settings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      searchRadiusKm: body.searchRadiusKm ?? 5,
      patientName: body.patientName ?? '',
    },
    update: {
      ...(typeof body.searchRadiusKm === 'number' ? { searchRadiusKm: body.searchRadiusKm } : {}),
      ...(typeof body.patientName === 'string' ? { patientName: body.patientName } : {}),
    },
  })
  return NextResponse.json({ settings: serializeSettings(updated) })
}
