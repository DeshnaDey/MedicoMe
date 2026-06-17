// Session handling — JWT in an HTTP-only cookie, signed with HS256.
//
// Why cookies (and not localStorage tokens)?
//   - HTTP-only cookies are invisible to JS, which makes XSS token-exfiltration
//     much harder.
//   - Cookies are auto-sent with every fetch — we don't need to add an
//     Authorization header to every client call.
//
// Why JWT (and not a DB-backed session)?
//   - One less query per request. For a prototype that's plenty; we can add a
//     revocation table later if we need force-logout-everywhere.

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'

const COOKIE_NAME = 'medico_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET env var must be set to a random string of at least 32 characters. ' +
        'Generate one with: openssl rand -base64 48'
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/**
 * Read the session cookie, verify it, and return the signed-in user (or null).
 * Call this at the top of every protected API route.
 */
export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  let userId: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    userId = String(payload.sub)
  } catch {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  })
  return user
}

/**
 * Thin wrapper for API handlers: returns the user or a 401 Response ready to
 * `return` directly from the handler.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null as null,
      unauthorized: new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }
  return { user, unauthorized: null as null }
}
