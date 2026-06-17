import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { hashPassword } from '@/lib/server/password'
import { createSession } from '@/lib/server/session'
import { serializeAccount } from '@/lib/server/serialize'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; phone?: string; password?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const phone = (body.phone ?? '').trim()
  const password = body.password ?? ''

  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'That email looks invalid.' }, { status: 400 })
  // Phone: stay lenient about formatting (country codes, spaces, dashes, parens
  // all fine) but require at least 7 digits so it's plausibly a real number.
  if ((phone.match(/\d/g)?.length ?? 0) < 7)
    return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  if (password.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing)
    return NextResponse.json(
      { error: 'An account already exists with that email. Try signing in.' },
      { status: 409 }
    )

  const passwordHash = await hashPassword(password)

  // Wrap user + settings creation in a single transaction so we never leave a
  // dangling User row with no Settings (the client assumes Settings exists).
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, name, phone, passwordHash },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    })
    await tx.settings.create({
      data: { userId: u.id, searchRadiusKm: 5, patientName: name },
    })
    return u
  })

  await createSession(user.id)
  return NextResponse.json({ account: serializeAccount(user) })
}
