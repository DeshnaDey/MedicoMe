// Thin Ollama proxy. The browser sends messages + ollamaUrl + model; we forward
// to Ollama and return the response. No auth, no DB — all history and medical
// context live in browser localStorage and are embedded into the messages
// payload by the client before calling this endpoint.

import { NextRequest, NextResponse } from 'next/server'
import { callOllama, AIMessage } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages = body.messages as AIMessage[] | undefined
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages[] required' }, { status: 400 })
    }
    const { content, provider } = await callOllama(messages, {
      url: body.ollamaUrl,
      model: body.model,
    })
    return NextResponse.json({ response: content, provider })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
