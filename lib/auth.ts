// Tiny localStorage-only auth helpers. Not meant to be secure against a
// determined attacker — it just avoids storing plaintext passwords in the
// browser. A real deployment should move auth behind a server.

'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppState } from './store'

// Cheap, non-cryptographic hash. We intentionally don't pull in a crypto lib
// (would bloat the bundle for a prototype). The output is stable per input+salt
// which is all we need to verify a password against what's stored.
export function hashPassword(password: string, salt: string): string {
  const input = `${salt}::${password}::medico-me-v1`
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).padStart(12, '0')
}

/**
 * Redirect unauthenticated callers to /login. Call at the top of protected
 * pages — Dashboard, Chat, Calendar, Records, Settings. The hook waits for
 * hydration so we don't flicker-redirect on first paint.
 */
export function useRequireAuth() {
  const state = useAppState()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (state.account) return
    if (pathname === '/login') return
    router.replace('/login')
  }, [state.account, pathname, router])

  return state.account
}
