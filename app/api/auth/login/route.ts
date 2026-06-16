import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { verifyPassword } from '@/lib/server/password'
import { createSession } from '@/lib/server/session'
import { serializeAccount } from '@/lib/server/serialize'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  // Return the same error for "no such email" and "bad password" so attackers
  // can't enumerate registered emails by probing the login endpoint.
  const bad = NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  if (!user) return bad

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return bad

  await createSession(user.id)
  return NextResponse.json({
    account: serializeAccount({ email: user.email, name: user.name, createdAt: user.createdAt }),
  })
}
