// Server-side AI config + the actual chat call. This module is **server-only** —
// it reads a secret API key, so it must never be imported by a client component.
// The browser talks to /api/chat instead (which calls this), so the key never
// reaches the browser and we don't depend on every user running local Ollama.
//
// The API shape is plain Ollama (`POST {base}/api/chat`), which means the same
// code path works for both:
//   - Ollama Cloud (prod):  OLLAMA_BASE_URL=https://api.ollama.com + OLLAMA_API_KEY
//   - Local Ollama (dev):   OLLAMA_BASE_URL=http://127.0.0.1:11434, no key
// Only the base URL and the optional Authorization header differ.

const BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'https://api.ollama.com').replace(/\/$/, '')
const API_KEY = process.env.OLLAMA_API_KEY
const MODEL = process.env.OLLAMA_MODEL ?? 'gpt-oss:20b'

export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string }

// JSON schema for the interactive triage reply. Passing this as Ollama's
// `format` constrains decoding to a valid object — far more reliable than
// `format: 'json'` for reasoning models like gpt-oss, which otherwise sometimes
// emit empty content (everything ends up in their hidden reasoning channel).
// One flat object with a `type` discriminator; the model fills the relevant
// fields for that type. The client (renderAiTurn) interprets it.
export const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['question', 'summary', 'reply'] },
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    condition: { type: 'string' },
    severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
    rationale: { type: 'string' },
    homeRemedies: { type: 'array', items: { type: 'string' } },
    otc: { type: 'array', items: { type: 'string' } },
    seeDoctor: { type: 'boolean' },
    specialty: { type: 'string' },
    text: { type: 'string' },
  },
  required: ['type'],
} as const

/**
 * Send a conversation to the configured Ollama endpoint and return the
 * assistant's reply text. Throws on transport / non-2xx so the route handler
 * can map it to a clean error response.
 */
export async function chatCompletion(
  messages: ChatTurn[],
  opts?: { json?: boolean; schema?: object }
): Promise<string> {
  // `format` constrains the output: a JSON schema (preferred — used by the
  // triage flow) or the looser 'json' mode. Omitted for plain chat.
  const format = opts?.schema ?? (opts?.json ? 'json' : undefined)
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Cloud needs a bearer token; local Ollama ignores it. Only send when set.
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      ...(format ? { format } : {}),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`AI provider responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const data = await res.json()
  return data?.message?.content ?? data?.response ?? '(no response)'
}
