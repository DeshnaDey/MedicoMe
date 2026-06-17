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

// Pull a JSON object out of the model's reply: strip ```json fences, then take
// the outermost { … }. Returns null if there's nothing parseable.
function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw || !raw.trim()) return null
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const obj = JSON.parse(s.slice(start, end + 1))
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null
  } catch {
    return null
  }
}

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
      // The triage flow expects a JSON object the client renders as cards. The
      // schema keeps content non-empty; gpt-oss still wobbles on exact shape, so
      // we extract leniently and let the client (interpretTriage) normalise it.
      // Retry once if the first attempt is empty/unparseable.
      let lastRaw = ''
      for (let attempt = 0; attempt < 2; attempt++) {
        lastRaw = await chatCompletion(messages, { schema: TRIAGE_SCHEMA })
        const data = extractJsonObject(lastRaw)
        if (data) return NextResponse.json({ data })
      }
      // Couldn't parse JSON — hand the raw text to the client as a reply.
      return NextResponse.json({ content: lastRaw })
    }
    const content = await chatCompletion(messages)
    return NextResponse.json({ content })
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown error'
    // 502: we (the server) failed to get a usable answer from the upstream AI.
    return NextResponse.json({ error: `AI request failed (${reason}).` }, { status: 502 })
  }
}
