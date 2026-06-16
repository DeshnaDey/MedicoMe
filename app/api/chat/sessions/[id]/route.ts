import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeSession } from '@/lib/server/serialize'
import type { ChatSession } from '@/lib/types'

type PatchBody = Partial<
  Pick<ChatSession, 'title' | 'endedAt' | 'symptoms' | 'diagnosis' | 'status'>
>

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized
  const { id } = await params

  const existing = await prisma.chatSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as PatchBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })

  const updated = await prisma.chatSession.update({
    where: { id },
    data: {
      ...(typeof body.title === 'string' ? { title: body.title } : {}),
      ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
      ...(body.symptoms ? { symptoms: body.symptoms } : {}),
      // Prisma's JSON column happily accepts null and objects
      ...('diagnosis' in body ? { diagnosis: (body.diagnosis ?? null) as any } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
    include: { messages: { orderBy: { ts: 'asc' } } },
  })
  return NextResponse.json({ session: serializeSession(updated) })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized
  const { id } = await params

  const existing = await prisma.chatSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.chatSession.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
