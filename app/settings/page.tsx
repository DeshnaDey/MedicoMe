'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { logout, resetToSeed, updateAccount, updateSettings, useAppState } from '@/lib/store'
import { useRequireAuth } from '@/lib/auth'
import { AlertTriangle, LogOut, Phone, RotateCcw, User } from 'lucide-react'

export default function SettingsPage() {
  useRequireAuth()
  const router = useRouter()
  const state = useAppState()
  const [form, setForm] = useState(state.settings)
  const [phone, setPhone] = useState(state.account?.phone ?? '')
  const [toast, setToast] = useState('')

  useEffect(() => setForm(state.settings), [state.settings])
  useEffect(() => setPhone(state.account?.phone ?? ''), [state.account?.phone])

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  const save = async () => {
    updateSettings(form)
    const res = await updateAccount({ phone })
    if (!res.ok) {
      showToast(res.error)
      return
    }
    showToast('Settings saved')
  }

  const resetEverything = () => {
    if (!confirm('Reset all data? This clears records, events, and chat history and cannot be undone.')) return
    resetToSeed()
    showToast('All data cleared')
  }

  const signOut = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen page-bg">
      <NavBar />

      <main className="relative md:pt-20 pb-28 md:pb-10 px-5 md:px-10 max-w-2xl mx-auto">
        <div className="pt-8 md:pt-4 mb-6">
          <h2 className="font-display text-[32px] md:text-[36px]" style={{ color: 'var(--text)' }}>Settings</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Manage your profile and how Medico Me works.
          </p>
        </div>

        {/* Profile */}
        <section className="card rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}
            >
              <User className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>Profile</h3>
          </div>
          <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
            Your name
          </label>
          <input
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            placeholder="Your name"
            className="input-field w-full rounded-xl px-4 py-3 text-sm"
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            Used for the greeting on the dashboard and in the chat system prompt.
          </p>

          <label className="block text-[10px] uppercase tracking-[0.08em] mt-5 mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.8} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              autoComplete="tel"
              className="input-field w-full rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            The contact number on your account. Leave blank to remove it.
          </p>

          {state.account && (
            <div
              className="mt-5 pt-5 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border-2)' }}
            >
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Signed in as</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{state.account.email}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                Sign out
              </button>
            </div>
          )}
        </section>

        {/* Search radius */}
        <section className="card rounded-2xl p-6 mb-5">
          <h3 className="font-display text-[18px] mb-4" style={{ color: 'var(--text)' }}>Specialist search radius</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={form.searchRadiusKm}
              onChange={(e) => setForm({ ...form, searchRadiusKm: Number(e.target.value) })}
              className="flex-1"
            />
            <span
              className="font-display text-[22px] w-16 text-right"
              style={{ color: 'var(--teal-600)' }}
            >
              {form.searchRadiusKm} km
            </span>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
            The chatbot prefers doctors within this radius when recommending a specialist. If none are found, the closest options are shown instead.
          </p>
        </section>

        {/* Danger zone */}
        <section
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid rgba(228, 87, 79, 0.25)' }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'rgba(228, 87, 79, 0.08)', color: 'var(--danger)' }}
            >
              <AlertTriangle className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>Reset data</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
            Permanently deletes your records, events, and chat sessions from your account. This can&rsquo;t be undone.
          </p>
          <button
            type="button"
            onClick={resetEverything}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(228, 87, 79, 0.08)',
              border: '1px solid rgba(228, 87, 79, 0.25)',
              color: 'var(--danger)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            Reset all data
          </button>
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setForm(state.settings)
              setPhone(state.account?.phone ?? '')
            }}
            className="btn-secondary flex-1 py-3 rounded-xl text-sm font-medium"
          >
            Discard changes
          </button>
          <button type="button" onClick={save} className="btn-primary flex-1 py-3 rounded-xl text-sm font-medium">
            Save settings
          </button>
        </div>
      </main>

      {toast && (
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-xl z-[200] fade-in"
          style={{ background: 'var(--teal-500)', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
