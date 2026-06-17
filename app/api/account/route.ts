import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeAccount } from '@/lib/server/serialize'

// PATCH /api/account — update profile fields that live on the User row (as
// opposed to /api/settings, which owns the Settings row). Currently just the
// phone number; scoped to the signed-in user.
export async function PATCH(req: Request) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as { phone?: string } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })

  const data: { phone?: string | null } = {}

  if (body.phone !== undefined) {
    const phone = body.phone.trim()
    // Allow clearing (empty → null); otherwise require a plausible number.
    if (phone && (phone.match(/\d/g)?.length ?? 0) < 7)
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
    data.phone = phone || null
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  })
  return NextResponse.json({ account: serializeAccount(updated) })
}
