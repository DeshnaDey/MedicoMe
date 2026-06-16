// Client-side auth helper. Passwords and sessions live on the server now
// (bcrypt + JWT cookie) — this file is just the React hook that bounces
// unauthenticated callers to /login.

'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppState } from './store'

/**
 * Redirect unauthenticated callers to /login. Call at the top of protected
 * pages — Dashboard, Chat, Calendar, Records, Settings.
 *
 * We rely on `state.seeded` flipping from false → true to know the
 * /api/state fetch has resolved. Without that guard the hook would
 * immediately redirect on first render (before SWR has answered) even for
 * users who are actually signed in.
 */
export function useRequireAuth() {
  const state = useAppState()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!state.seeded) return // still waiting on /api/state
    if (state.account) return
    if (pathname === '/login') return
    router.replace('/login')
  }, [state.seeded, state.account, pathname, router])

  return state.account
}
