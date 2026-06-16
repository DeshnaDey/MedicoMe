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

/**
 * Send a conversation to the configured Ollama endpoint and return the
 * assistant's reply text. Throws on transport / non-2xx so the route handler
 * can map it to a clean error response.
 */
export async function chatCompletion(messages: ChatTurn[]): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Cloud needs a bearer token; local Ollama ignores it. Only send when set.
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`AI provider responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const data = await res.json()
  return data?.message?.content ?? data?.response ?? '(no response)'
}
