import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeSession } from '@/lib/server/serialize'

export async function POST(req: Request) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as { title?: string } | null
  const title = body?.title?.trim() || 'New conversation'

  const session = await prisma.chatSession.create({
    data: { userId: user.id, title, symptoms: [], status: 'open' },
    include: { messages: true },
  })
  return NextResponse.json({ session: serializeSession(session) })
}
