'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/lib/store'

// Root landing page. We can't do a server-side redirect because the account
// lives in localStorage — so bounce on the client once we've hydrated.
export default function Home() {
  const state = useAppState()
  const router = useRouter()

  useEffect(() => {
    router.replace(state.account ? '/dashboard' : '/login')
  }, [state.account, router])

  return null
}
