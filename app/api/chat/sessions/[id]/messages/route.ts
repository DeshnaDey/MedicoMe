import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeMessage } from '@/lib/server/serialize'
import type { ChatMessage, ChatRole } from '@/lib/types'

const VALID_ROLES: ChatRole[] = ['user', 'assistant', 'system']

type CreateBody = {
  role: ChatRole
  content: string
  card?: ChatMessage['card']
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized
  const { id } = await params

  // Scope check — confirm the session belongs to the current user before
  // letting them append a message to it.
  const session = await prisma.chatSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  if (!VALID_ROLES.includes(body.role))
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })

  const message = await prisma.chatMessage.create({
    data: {
      sessionId: id,
      role: body.role,
      content: body.content ?? '',
      // Prisma's JSON column — we store cards as-is.
      card: (body.card ?? null) as any,
    },
  })
  return NextResponse.json({ message: serializeMessage(message) })
}
