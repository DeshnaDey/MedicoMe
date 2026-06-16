import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server/session'
import { serializeAccount } from '@/lib/server/serialize'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ account: null })
  return NextResponse.json({ account: serializeAccount(user) })
}
