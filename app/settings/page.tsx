'use client'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { resetToSeed, updateSettings, useAppState } from '@/lib/store'
import { AlertTriangle, CheckCircle2, Cpu, RotateCcw, User, XCircle } from 'lucide-react'

export default function SettingsPage() {
  const state = useAppState()
  const [form, setForm] = useState(state.settings)
  const [probe, setProbe] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'fail'
    models: string[]
    msg: string
  }>({ status: 'idle', models: [], msg: '' })
  const [toast, setToast] = useState('')

  useEffect(() => setForm(state.settings), [state.settings])

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  const save = () => {
    updateSettings(form)
    showToast('Settings saved')
  }

  const probeOllama = async () => {
    setProbe({ status: 'checking', models: [], msg: 'Pinging Ollama…' })
    try {
      const r = await fetch(`/api/ai/status?url=${encodeURIComponent(form.ollamaUrl)}`)
      const d = await r.json()
      if (d.ollama?.available) {
        setProbe({
          status: 'ok',
          models: d.ollama.models ?? [],
          msg: `Online · ${d.ollama.models?.length ?? 0} model(s) available`,
        })
      } else {
        setProbe({ status: 'fail', models: [], msg: 'Offline — is `ollama serve` running?' })
      }
    } catch (e) {
      setProbe({ status: 'fail', models: [], msg: String(e) })
    }
  }

  const resetEverything = () => {
    if (!confirm('Reset all data? This clears records, events, and chat history and cannot be undone.')) return
    resetToSeed()
    showToast('All data cleared')
  }

  return (
    <div className="min-h-screen page-bg">
      <NavBar />

      <main className="relative md:pt-20 pb-28 md:pb-10 px-5 md:px-10 max-w-2xl mx-auto">
        <div className="pt-8 md:pt-4 mb-6">
          <h2 className="font-display text-[32px] md:text-[36px]" style={{ color: 'var(--text)' }}>Settings</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Everything runs in your browser — nothing leaves this device except calls to your local Ollama.
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
            placeholder="Deshna"
            className="input-field w-full rounded-xl px-4 py-3 text-sm"
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            Used for the greeting on the dashboard and in the chat system prompt.
          </p>
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

        {/* Ollama */}
        <section className="card rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}
              >
                <Cpu className="w-4 h-4" strokeWidth={1.8} />
              </span>
              <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>Local AI (Ollama)</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.useOllama}
                onChange={(e) => setForm({ ...form, useOllama: e.target.checked })}
                className="w-4 h-4"
                style={{ accentColor: 'var(--teal-500)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>Enabled</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                URL
              </label>
              <input
                value={form.ollamaUrl}
                onChange={(e) => setForm({ ...form, ollamaUrl: e.target.value })}
                placeholder="http://localhost:11434"
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                Model
              </label>
              <input
                value={form.ollamaModel}
                onChange={(e) => setForm({ ...form, ollamaModel: e.target.value })}
                placeholder="llama3.2"
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={probeOllama}
              className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium"
            >
              Test connection
            </button>
            {probe.status !== 'idle' && (
              <span
                className="flex items-center gap-1.5 text-xs"
                style={{
                  color:
                    probe.status === 'ok'
                      ? 'var(--teal-600)'
                      : probe.status === 'fail'
                      ? 'var(--danger)'
                      : 'var(--text-3)',
                }}
              >
                {probe.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />}
                {probe.status === 'fail' && <XCircle className="w-3.5 h-3.5" strokeWidth={2} />}
                {probe.msg}
              </span>
            )}
          </div>

          {probe.status === 'ok' && probe.models.length > 0 && (
            <div className="mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
              Available models: <span style={{ color: 'var(--teal-700)' }}>{probe.models.join(', ')}</span>
            </div>
          )}

          <p className="text-xs mt-4" style={{ color: 'var(--text-3)' }}>
            Install Ollama from <span style={{ color: 'var(--teal-700)' }}>ollama.com</span>, then run{' '}
            <code
              className="px-1.5 py-0.5 rounded text-[11px]"
              style={{ background: 'var(--bg-2)', color: 'var(--teal-700)' }}
            >
              ollama pull llama3.2
            </code>
            . When disabled, the chatbot falls back to a rule-based decision tree only.
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
            Wipes the localStorage copy of your records, events, and chat sessions. The prototype will restart fresh.
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
            onClick={() => setForm(state.settings)}
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
