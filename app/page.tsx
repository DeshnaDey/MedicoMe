'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/lib/store'

// Root landing — bounce to /dashboard or /login once the /api/state fetch
// has returned (signalled by `seeded`). Can't do this server-side because
// the session cookie check adds async work we'd rather let SWR dedupe.
export default function Home() {
  const state = useAppState()
  const router = useRouter()

  useEffect(() => {
    if (!state.seeded) return
    router.replace(state.account ? '/dashboard' : '/login')
  }, [state.seeded, state.account, router])

  return null
}
