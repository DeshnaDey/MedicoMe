// Ollama availability check. Accepts ?url= override so Settings can probe a
// non-default endpoint from the client.

import { NextRequest, NextResponse } from 'next/server'
import { ollamaStatus } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || 'http://localhost:11434'
  const status = await ollamaStatus(url)
  return NextResponse.json({
    active: status.available ? 'ollama' : 'none',
    ollama: { available: status.available, models: status.models },
    url,
  })
}
