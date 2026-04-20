'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup, useAppState } from '@/lib/store'
import { HeartPulse, Lock, Mail, User as UserIcon } from 'lucide-react'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const state = useAppState()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If the user reloads /login while already signed in, send them to the dashboard.
  useEffect(() => {
    if (state.account) router.replace('/dashboard')
  }, [state.account, router])

  // If an account already exists on this device, default to the login tab and
  // prefill the email so the common case (returning user) is one click faster.
  useEffect(() => {
    if (state.account?.email && !email) {
      setEmail(state.account.email)
      setTab('login')
    }
  }, [state.account, email])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (tab === 'signup') {
        const result = signup({ name, email, password })
        if (!result.ok) {
          setError(result.error)
          return
        }
      } else {
        const result = login({ email, password })
        if (!result.ok) {
          setError(result.error)
          return
        }
      }
      router.replace('/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{
        backgroundColor: '#F6FBFA',
        backgroundImage:
          'radial-gradient(1000px 500px at 80% -10%, rgba(143, 212, 206, 0.35) 0%, transparent 55%), ' +
          'radial-gradient(800px 450px at -10% 110%, rgba(183, 225, 221, 0.35) 0%, transparent 55%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span
            className="flex items-center justify-center w-11 h-11 rounded-2xl"
            style={{ background: 'var(--teal-500)', color: '#fff' }}
          >
            <HeartPulse className="w-5 h-5" strokeWidth={2} />
          </span>
          <h1 className="font-display text-[26px]" style={{ color: 'var(--text)' }}>Medico Me</h1>
        </div>

        <div
          className="rounded-3xl p-7 md:p-8"
          style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(15,31,44,0.08)' }}
        >
          {/* Tabs */}
          <div
            className="flex p-1 rounded-xl mb-6"
            style={{ background: 'var(--bg-2)' }}
          >
            <button
              type="button"
              onClick={() => switchTab('login')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === 'login' ? '#fff' : 'transparent',
                color: tab === 'login' ? 'var(--teal-700)' : 'var(--text-3)',
                boxShadow: tab === 'login' ? '0 1px 3px rgba(15,31,44,0.08)' : 'none',
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === 'signup' ? '#fff' : 'transparent',
                color: tab === 'signup' ? 'var(--teal-700)' : 'var(--text-3)',
                boxShadow: tab === 'signup' ? '0 1px 3px rgba(15,31,44,0.08)' : 'none',
              }}
            >
              Create account
            </button>
          </div>

          <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>
            {tab === 'login'
              ? 'Welcome back. Sign in to access your records.'
              : 'Your data lives only on this device — no server stores your password.'}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                  Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.8} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="input-field w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.8} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.8} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'At least 6 characters' : 'Your password'}
                  className="input-field w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
              </div>
            </div>

            {error && (
              <div
                className="text-xs rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(228, 87, 79, 0.08)',
                  border: '1px solid rgba(228, 87, 79, 0.25)',
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 rounded-xl text-sm font-medium mt-2 disabled:opacity-60"
            >
              {submitting
                ? tab === 'signup'
                  ? 'Creating account…'
                  : 'Signing in…'
                : tab === 'signup'
                ? 'Create account'
                : 'Sign in'}
            </button>
          </form>

          <p className="text-[11px] text-center mt-5" style={{ color: 'var(--text-4)' }}>
            Medico Me stores your account and records only in your browser. Clearing site data will erase them.
          </p>
        </div>
      </div>
    </div>
  )
}
