// Ollama-only client for the prototype. Groq path removed.
// Called from API routes that receive the Ollama URL + model from the browser
// (settings live in localStorage on the client — see lib/store.ts).

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  provider: 'ollama' | 'error'
}

const DEFAULT_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2'

export async function callOllama(
  messages: AIMessage[],
  opts: { url?: string; model?: string } = {}
): Promise<AIResponse> {
  const url = opts.url || DEFAULT_URL
  const model = opts.model || DEFAULT_MODEL
  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) {
      const txt = await response.text()
      return { content: `⚠️ Ollama error ${response.status}: ${txt.slice(0, 300)}`, provider: 'error' }
    }
    const data = await response.json()
    return { content: data.message?.content ?? '(empty response)', provider: 'ollama' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      content: `⚠️ Could not reach Ollama at ${url}. Make sure \`ollama serve\` is running and the model \`${model}\` is pulled.\n\n(${msg})`,
      provider: 'error',
    }
  }
}

export async function ollamaStatus(url: string) {
  try {
    const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) return { available: false, models: [] as string[] }
    const data = await r.json()
    return {
      available: true,
      models: (data.models ?? []).map((m: { name: string }) => m.name) as string[],
    }
  } catch {
    return { available: false, models: [] as string[] }
  }
}
