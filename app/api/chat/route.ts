import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/session'
import { chatCompletion, TRIAGE_SCHEMA, type ChatTurn } from '@/lib/server/ai'

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

  const body = (await req.json().catch(() => null)) as
    | { messages?: unknown; structured?: boolean }
    | null
  const messages = body?.messages
  const structured = body?.structured === true
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
    if (structured) {
      // The triage flow expects a JSON object it can render as cards. Use the
      // schema to constrain decoding; reasoning models occasionally still emit
      // empty/garbled output, so retry once before falling back.
      for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await chatCompletion(messages, { schema: TRIAGE_SCHEMA })
        if (raw && raw.trim()) {
          try {
            const data = JSON.parse(raw)
            if (data && typeof data === 'object' && 'type' in data) {
              return NextResponse.json({ data })
            }
          } catch {
            /* unparseable — retry, then fall through */
          }
        }
      }
      // Both attempts failed to yield usable JSON.
      return NextResponse.json({
        data: { type: 'reply', text: "Sorry, I didn't quite catch that — could you rephrase?" },
      })
    }
    const content = await chatCompletion(messages)
    return NextResponse.json({ content })
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown error'
    // 502: we (the server) failed to get a usable answer from the upstream AI.
    return NextResponse.json({ error: `AI request failed (${reason}).` }, { status: 502 })
  }
}
