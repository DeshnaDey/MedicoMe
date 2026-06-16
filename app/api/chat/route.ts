import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/session'
import { chatCompletion, type ChatTurn } from '@/lib/server/ai'

// Server-side AI proxy. The browser used to call Ollama directly, which only
// worked if every user ran their own local Ollama with OLLAMA_ORIGINS=*. For a
// shared deployment the key + endpoint live here instead, behind auth.
//
// The conversation (system prompt with the user's medical context, prior turns,
// and the new message) is built client-side in app/chat/page.tsx from data the
// user already owns, then posted here. We only forward it to the provider — no
// extra trust is granted.

const VALID_ROLES = new Set(['system', 'user', 'assistant'])

export async function POST(req: Request) {
  const { unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null
  const messages = body?.messages
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === 'object' &&
        VALID_ROLES.has((m as ChatTurn).role) &&
        typeof (m as ChatTurn).content === 'string'
    )
  ) {
    return NextResponse.json({ error: 'Expected a non-empty `messages` array.' }, { status: 400 })
  }

  try {
    const content = await chatCompletion(messages)
    return NextResponse.json({ content })
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown error'
    // 502: we (the server) failed to get a usable answer from the upstream AI.
    return NextResponse.json({ error: `AI request failed (${reason}).` }, { status: 502 })
  }
}
