'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import {
  appendMessage,
  deleteChatSession,
  newChatSession,
  patchChatSession,
  useAppState,
} from '@/lib/store'
import { findSymptom, SYMPTOMS } from '@/lib/triage'
import { directionsLink, findDoctorsForSpecialty, phoneLink } from '@/lib/doctors'
import { OLLAMA_MODEL, OLLAMA_URL } from '@/lib/ai-config'
import { useRequireAuth } from '@/lib/auth'
import type { ChatMessage, ChatSession, Diagnosis, MedicalRecord } from '@/lib/types'
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Flame,
  HeartPulse,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Send,
  Stethoscope,
  Thermometer,
  Trash2,
  Wind,
} from 'lucide-react'

type Mode =
  | { kind: 'idle' }
  | { kind: 'triage'; symptomId: string; answers: Record<string, string>; qIndex: number }

// Icon lookup for each symptom — replaces the old emoji field.
const SYMPTOM_ICON: Record<string, React.ElementType> = {
  headache: Flame,
  cough: Wind,
  stomach_ache: Pill,
  sore_throat: MessageCircle,
  chest_pain: HeartPulse,
  rash: Leaf,
  fever: Thermometer,
}

// Build a dense history blurb for the Ollama system prompt so the LLM has proper
// longitudinal context across sessions.
function buildSystemPrompt(args: {
  patientName: string
  records: MedicalRecord[]
  pastSessions: ChatSession[]
  currentSymptom?: string
  currentDiagnosis?: Diagnosis
}) {
  const { patientName, records, pastSessions, currentSymptom, currentDiagnosis } = args
  const tags = Array.from(new Set(records.flatMap((r) => r.tags)))
  const conditions = records
    .filter((r) => r.category === 'diagnosis')
    .map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`)
    .join('\n')
  const meds = records
    .filter((r) => r.category === 'prescription')
    .map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`)
    .join('\n')
  const allergies = records
    .filter((r) => r.category === 'allergy')
    .map((r) => `• ${r.title}`)
    .join('\n')
  const labs = records
    .filter((r) => r.category === 'test_result')
    .slice(0, 4)
    .map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''} (${r.date})`)
    .join('\n')

  const recentSessions = pastSessions
    .slice(0, 3)
    .map((s) => {
      const dx = s.diagnosis ? `${s.diagnosis.condition} (${s.diagnosis.severity})` : 'no diagnosis'
      return `• ${s.title} — ${dx}`
    })
    .join('\n')

  return `You are Medico Me, a personal medical triage assistant for ${patientName || 'the patient'}.
You reason carefully, are honest about uncertainty, and always remind the user you are not a substitute for a clinician.
Respond concisely (≤150 words unless the question explicitly asks for depth). No markdown headers. Plain sentences and short lists only.

PATIENT PROFILE
Tags from their records: ${tags.join(', ') || '(none)'}
Known conditions:
${conditions || '(none on file)'}
Current medications:
${meds || '(none on file)'}
Allergies:
${allergies || '(none on file)'}
Recent labs:
${labs || '(none on file)'}

RECENT CHAT SESSIONS
${recentSessions || '(no prior sessions)'}

CURRENT TRIAGE CONTEXT
${currentSymptom ? `Current symptom under discussion: ${currentSymptom}` : 'No active symptom — open question.'}
${
  currentDiagnosis
    ? `Rule-based suggestion: ${currentDiagnosis.condition} (${currentDiagnosis.severity}). Rationale: ${currentDiagnosis.rationale}`
    : ''
}

SAFETY
If the user describes red-flag symptoms (chest pressure radiating to arm/jaw, trouble breathing, confusion, sudden severe headache, fainting, uncontrolled bleeding) — tell them to call emergency services immediately before anything else.`
}

export default function ChatPage() {
  useRequireAuth()
  const state = useAppState()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const session = useMemo(
    () => (sessionId ? state.chatSessions.find((s) => s.id === sessionId) ?? null : null),
    [sessionId, state.chatSessions]
  )

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  // Ensure a session is selected on mount.
  useEffect(() => {
    if (sessionId) return
    if (state.chatSessions.length > 0) {
      setSessionId(state.chatSessions[0].id)
    }
  }, [sessionId, state.chatSessions])

  useEffect(scrollBottom, [session?.messages.length, scrollBottom])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const startSession = (title: string) => {
    const s = newChatSession(title)
    setSessionId(s.id)
    appendMessage(s.id, {
      role: 'assistant',
      content: `Hi ${state.settings.patientName?.split(' ')[0] || 'there'}! What symptom would you like help with? Tap one of the chips below, or describe it in your own words.`,
    })
    return s
  }

  const currentSession = session
  const ensureSession = () => currentSession ?? startSession('New conversation')

  // Begin rule-based triage flow for a given symptom.
  const startSymptom = (symptomId: string) => {
    const node = findSymptom(symptomId)
    if (!node) return
    const s = ensureSession()
    patchChatSession(s.id, {
      title: node.label,
      symptoms: Array.from(new Set([...s.symptoms, node.label])),
      status: 'open',
    })
    appendMessage(s.id, { role: 'user', content: `I have a ${node.label.toLowerCase()}.` })

    const first = node.questions[0]
    appendMessage(s.id, {
      role: 'assistant',
      content: first.prompt,
      card: { type: 'question', symptom: node.label, question: first.prompt, options: first.options },
    })
    setMode({ kind: 'triage', symptomId, answers: {}, qIndex: 0 })
    scrollBottom()
  }

  // Answer a triage question — either advance to next question or finalize.
  const answerTriage = (answer: string) => {
    if (mode.kind !== 'triage') return
    const node = findSymptom(mode.symptomId)
    if (!node) return
    const s = ensureSession()
    const q = node.questions[mode.qIndex]
    appendMessage(s.id, { role: 'user', content: answer })
    const nextAnswers = { ...mode.answers, [q.key]: answer }
    const nextIndex = mode.qIndex + 1

    if (nextIndex < node.questions.length) {
      const nq = node.questions[nextIndex]
      appendMessage(s.id, {
        role: 'assistant',
        content: nq.prompt,
        card: { type: 'question', symptom: node.label, question: nq.prompt, options: nq.options },
      })
      setMode({ ...mode, answers: nextAnswers, qIndex: nextIndex })
      return
    }

    // Final classification.
    const dx = node.classify(nextAnswers)
    patchChatSession(s.id, {
      diagnosis: dx,
      status: dx.severity === 'severe' ? 'specialist_referred' : 'home_care',
      endedAt: new Date().toISOString(),
    })

    appendMessage(s.id, {
      role: 'assistant',
      content: `Based on your answers: ${dx.condition} (${dx.severity}).\n${dx.rationale}`,
    })

    if (dx.severity === 'severe' && dx.specialty) {
      const doctors = findDoctorsForSpecialty(dx.specialty, state.settings.searchRadiusKm)
      appendMessage(s.id, {
        role: 'assistant',
        content: `I'd recommend seeing a ${dx.specialty}. Here are a few options near you.`,
        card: { type: 'doctor_list', diagnosis: dx, doctors },
      })
    } else {
      appendMessage(s.id, {
        role: 'assistant',
        content: 'Here are some home-care suggestions and OTC options.',
        card: { type: 'home_care', diagnosis: dx },
      })
      appendMessage(s.id, {
        role: 'assistant',
        content: 'Need to pick up OTC meds? I can point you to the nearest pharmacy.',
        card: { type: 'pharmacy', mapsQuery: `pharmacy within ${state.settings.searchRadiusKm}km` },
      })
    }
    setMode({ kind: 'idle' })
  }

  // Free-text send — routed to Ollama with full context baked into the system prompt.
  const sendFreeText = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const s = ensureSession()
    if (!s.title || s.title === 'New conversation') {
      patchChatSession(s.id, { title: msg.slice(0, 40) })
    }
    appendMessage(s.id, { role: 'user', content: msg })
    scrollBottom()

    if (!state.settings.useOllama) {
      appendMessage(s.id, {
        role: 'assistant',
        content:
          'Ollama is disabled in Settings — I can only answer symptom chips right now. Enable it, or pick a symptom below.',
      })
      return
    }

    setLoading(true)
    try {
      const past = state.chatSessions.filter((cs) => cs.id !== s.id)
      const system = buildSystemPrompt({
        patientName: state.settings.patientName,
        records: state.records,
        pastSessions: past,
        currentSymptom: s.symptoms[s.symptoms.length - 1],
        currentDiagnosis: s.diagnosis,
      })

      const convo: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: system },
        ...s.messages.slice(-12).map(
          (m) =>
            ({
              role: m.role === 'system' ? 'assistant' : m.role,
              content: m.content,
            } as { role: 'system' | 'user' | 'assistant'; content: string })
        ),
        { role: 'user', content: msg },
      ]

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: convo,
          ollamaUrl: state.settings.ollamaUrl,
          model: state.settings.ollamaModel,
        }),
      })
      const data = await res.json()
      appendMessage(s.id, {
        role: 'assistant',
        content: data.response ?? data.error ?? '(no response)',
      })
    } catch (e) {
      appendMessage(s.id, {
        role: 'assistant',
        content: `Couldn't reach the AI server. ${e instanceof Error ? e.message : ''}`,
      })
    } finally {
      setLoading(false)
      scrollBottom()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendFreeText()
    }
  }

  const newConvo = () => {
    const s = newChatSession('New conversation')
    setSessionId(s.id)
    setMode({ kind: 'idle' })
    appendMessage(s.id, {
      role: 'assistant',
      content: `Hi ${state.settings.patientName?.split(' ')[0] || 'there'}! What symptom would you like help with? Tap one of the chips below, or describe it in your own words.`,
    })
  }

  const removeConvo = (id: string) => {
    if (!confirm('Delete this chat session?')) return
    deleteChatSession(id)
    if (sessionId === id) {
      setSessionId(state.chatSessions[0]?.id ?? null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen chat-grid-bg">
      <NavBar />

      <div className="flex flex-1 overflow-hidden md:pt-16 pb-16 md:pb-0">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 flex-shrink-0 p-4 overflow-y-auto`}
          style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', borderRight: '1px solid var(--border)' }}
        >
          <button
            onClick={newConvo}
            className="btn-primary flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium mb-5"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            New chat
          </button>

          <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-3)' }}>Symptoms</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {SYMPTOMS.map((s) => {
              const Icon = SYMPTOM_ICON[s.id] ?? Stethoscope
              return (
                <button
                  key={s.id}
                  onClick={() => startSymptom(s.id)}
                  className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-all text-left"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text-2)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} style={{ color: 'var(--teal-600)' }} />
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </div>

          <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-3)' }}>Past sessions</p>
          <div className="space-y-1.5 flex-1">
            {state.chatSessions.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>No past sessions.</p>
            )}
            {state.chatSessions.map((s) => {
              const active = s.id === sessionId
              return (
                <div
                  key={s.id}
                  className="group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: active ? 'var(--teal-50)' : 'transparent',
                    border: active ? '1px solid var(--teal-200)' : '1px solid transparent',
                  }}
                  onClick={() => {
                    setSessionId(s.id)
                    setMode({ kind: 'idle' })
                    setSidebarOpen(false)
                  }}
                >
                  <span
                    className="text-xs flex-1 truncate"
                    style={{ color: active ? 'var(--teal-700)' : 'var(--text-2)' }}
                  >
                    {s.title}
                  </span>
                  {s.status === 'specialist_referred' && (
                    <AlertTriangle className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--danger)' }} />
                  )}
                  {s.status === 'home_care' && (
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--teal-600)' }} />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeConvo(s.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-3)' }}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                  </button>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile top bar */}
          <div
            className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid var(--border)' }}
          >
            <button onClick={() => setSidebarOpen((x) => !x)} aria-label="Menu" style={{ color: 'var(--text-2)' }}>
              <Menu className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <p className="text-sm font-medium truncate max-w-[60%]" style={{ color: 'var(--text)' }}>
              {session?.title ?? 'Medico Me'}
            </p>
            <button onClick={newConvo} className="flex items-center gap-1 text-sm" style={{ color: 'var(--teal-600)' }}>
              <Plus className="w-4 h-4" strokeWidth={2.2} /> New
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
            {!session && (
              <div className="text-center py-16">
                <div
                  className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}
                >
                  <Stethoscope className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                  Start a symptom check to begin.
                </p>
                <button onClick={newConvo} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium">
                  Start new chat
                </button>
              </div>
            )}

            {session?.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} onAnswer={answerTriage} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bubble-ai flex items-center gap-1.5 py-3">
                  <div className="typing-dot" /> <div className="typing-dot" /> <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chip rail when idle */}
          {session && mode.kind === 'idle' && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 flex-shrink-0">
              {SYMPTOMS.map((s) => {
                const Icon = SYMPTOM_ICON[s.id] ?? Stethoscope
                return (
                  <button
                    key={s.id}
                    onClick={() => startSymptom(s.id)}
                    className="chip whitespace-nowrap text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Icon className="w-3 h-3" strokeWidth={1.8} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Input */}
          <div
            className="flex-shrink-0 p-4"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-end gap-3 max-w-3xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                onKeyDown={onKeyDown}
                placeholder={
                  mode.kind === 'triage'
                    ? 'Tap an option above, or type a custom answer…'
                    : 'Ask about your symptoms, records, or medications…'
                }
                className="input-field flex-1 rounded-2xl px-4 py-3 text-sm resize-none"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={() => sendFreeText()}
                disabled={loading || !input.trim()}
                className="btn-primary w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-4)' }}>
              Not medical advice — always consult a clinician for serious concerns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Message rendering ──────────────────────────────────────────────────────
function MessageBubble({ msg, onAnswer }: { msg: ChatMessage; onAnswer: (a: string) => void }) {
  const isUser = msg.role === 'user'
  const alignment = isUser ? 'justify-end' : 'justify-start'

  if (msg.card?.type === 'question') {
    return (
      <div className={`flex ${alignment} fade-in`}>
        <div className="bubble-ai" style={{ maxWidth: '85%' }}>
          <p className="mb-3">{msg.card.question}</p>
          <div className="flex flex-wrap gap-2">
            {msg.card.options.map((o) => (
              <button
                key={o}
                onClick={() => onAnswer(o)}
                className="chip text-xs px-3 py-1.5 rounded-full"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (msg.card?.type === 'home_care') {
    const d = msg.card.diagnosis
    return (
      <div className={`flex ${alignment} fade-in`}>
        <div
          className="rounded-2xl p-4 max-w-[85%]"
          style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Check className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: 'var(--teal-600)' }} />
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold" style={{ color: 'var(--teal-700)' }}>
              Home care · {d.severity}
            </p>
          </div>
          <p className="font-medium text-sm mb-2" style={{ color: 'var(--text)' }}>{d.condition}</p>
          {d.homeRemedies && (
            <>
              <p className="text-xs font-medium mt-3 mb-1" style={{ color: 'var(--text-2)' }}>Try these:</p>
              <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                {d.homeRemedies.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </>
          )}
          {d.otc && (
            <>
              <p className="text-xs font-medium mt-3 mb-1" style={{ color: 'var(--text-2)' }}>OTC options:</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{d.otc.join(' · ')}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (msg.card?.type === 'doctor_list') {
    const d = msg.card.diagnosis
    const doctors = msg.card.doctors
    return (
      <div className={`flex ${alignment} fade-in`}>
        <div className="max-w-[95%] md:max-w-[85%] w-full space-y-3">
          {/* Diagnosis banner */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(228, 87, 79, 0.06)', border: '1px solid rgba(228, 87, 79, 0.25)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: 'var(--danger)' }} />
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold" style={{ color: 'var(--danger)' }}>
                Specialist referral · {d.severity}
              </p>
            </div>
            <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{d.condition}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>See a {d.specialty} near you.</p>
          </div>

          {/* Doctor cards */}
          {doctors.length === 0 ? (
            <div className="card rounded-2xl p-4 text-sm" style={{ color: 'var(--text-3)' }}>
              No doctors in your area — try widening the search radius in Settings.
            </div>
          ) : (
            doctors.map((doc) => (
              <div key={doc.id} className="card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                      style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}
                    >
                      <Stethoscope className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{doc.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{doc.clinic}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0"
                    style={{ background: 'var(--teal-50)', color: 'var(--teal-700)' }}
                  >
                    <MapPin className="w-2.5 h-2.5" strokeWidth={2} />
                    {doc.distanceKm} km
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <a
                    href={directionsLink(doc.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium no-underline flex-1"
                  >
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
                    See on maps
                  </a>
                  {doc.bookingUrl ? (
                    <a
                      href={doc.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium no-underline flex-1"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" strokeWidth={2} />
                      Book appointment
                    </a>
                  ) : (
                    <a
                      href={phoneLink(doc.phone)}
                      className="btn-primary flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium no-underline flex-1"
                    >
                      <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                      Call reception
                    </a>
                  )}
                  <a
                    href={phoneLink(doc.phone)}
                    className="btn-ghost flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium no-underline"
                    aria-label="Call"
                    style={{ border: '1px solid var(--border-2)' }}
                  >
                    <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (msg.card?.type === 'pharmacy') {
    return (
      <div className={`flex ${alignment} fade-in`}>
        <div
          className="rounded-2xl p-4 max-w-[85%]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Pill className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: 'var(--teal-600)' }} />
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold" style={{ color: 'var(--teal-700)' }}>
              Pharmacy
            </p>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>
            Need to pick up the OTC meds above?
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(msg.card.mapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium no-underline"
          >
            <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
            Find nearest pharmacy
          </a>
        </div>
      </div>
    )
  }

  // Plain text
  return (
    <div className={`flex ${alignment} fade-in`}>
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}>{msg.content}</div>
    </div>
  )
}

