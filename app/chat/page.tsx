'use client'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import {
  appendMessage,
  deleteChatSession,
  newChatSession,
  patchChatSession,
  useAppState,
} from '@/lib/store'
import { findSymptom } from '@/lib/triage'
import { directionsLink, findDoctorsForSpecialty, phoneLink } from '@/lib/doctors'
import { useRequireAuth } from '@/lib/auth'
import { interpretTriage } from '@/lib/triage-ai'
import type { ChatMessage, ChatSession, Diagnosis, MedicalRecord } from '@/lib/types'
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  MapPin,
  Menu,
  Phone,
  Pill,
  Plus,
  Send,
  Stethoscope,
  Trash2,
} from 'lucide-react'

type Mode =
  | { kind: 'idle' }
  | { kind: 'triage'; symptomId: string; answers: Record<string, string>; qIndex: number }

// Build a dense history blurb for the Ollama system prompt so the LLM has proper
// longitudinal context across sessions.
function buildSystemPrompt(args: {
  patientName: string
  records: MedicalRecord[]
  pastSessions: ChatSession[]
  currentSymptom?: string
  currentDiagnosis?: Diagnosis
  askedCount: number
}) {
  const { patientName, records, pastSessions, currentSymptom, currentDiagnosis, askedCount } = args
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
You conduct an INTERACTIVE triage: ask focused follow-up questions ONE AT A TIME, then give a short assessment. You are honest about uncertainty and never replace a clinician.
You ONLY discuss health and medicine. Politely refuse anything unrelated — shopping, products, travel, coding, math, general trivia, etc.

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
Follow-up questions you have already asked this conversation: ${askedCount}.

RESPONSE FORMAT (follow exactly)
Reply with a SINGLE valid JSON object and NOTHING else. Use exactly one of these shapes:

1) Ask the next follow-up question — when the user is describing a symptom and you need more detail. Exactly ONE question, with 2–5 short, mutually-exclusive tappable options:
{"type":"question","question":"<one short question>","options":["<=4 words","<=4 words"]}

2) Give your assessment — once you have enough detail:
{"type":"summary","condition":"<short label>","severity":"mild|moderate|severe","rationale":"<1-2 plain sentences>","homeRemedies":["<tip>"],"otc":["<option>"],"seeDoctor":true,"specialty":"<one of: General Physician, Dermatologist, Cardiologist, Neurologist, Pulmonologist, Gastroenterologist>"}

3) Answer a HEALTH-related general question (their records, medications, conditions, or general health & wellness) — or politely decline if it is off-topic:
{"type":"reply","text":"<plain-sentence answer, or a refusal if the question isn't about health>"}

RULES
- SCOPE: Only answer health and medical questions (symptoms, conditions, medications, the user's records, general health & wellness). If the message is NOT about health — e.g. "where can I buy jeans", products/shopping, travel, coding, math, general trivia — do NOT answer it. Return exactly: {"type":"reply","text":"I'm Medico Me, your personal health assistant — I can only help with medical and health questions, like symptoms, your records, or medications. What health concern can I help you with?"}
- Exactly ONE question per "question" response — never bundle multiple questions into one.
- ${askedCount >= 3 ? 'You have already asked enough questions — you MUST return a "summary" now, not another question.' : 'Aim for 2–4 questions total, then summarize.'}
- In "summary": include homeRemedies and otc only for mild/moderate; for severe set "seeDoctor":true and choose the most relevant specialty.
- Emergencies (crushing or severe chest pain, trouble breathing, fainting, stroke signs, uncontrolled bleeding, sudden severe headache): immediately return a "summary" with "severity":"severe", "seeDoctor":true, and a rationale telling them to call emergency services right away.
- Output ONLY the JSON object — no prose, no markdown, no code fences.`
}

export default function ChatPage() {
  useRequireAuth()
  const state = useAppState()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
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
  // All store mutations now hit the server — these helpers are async and may
  // return null if a request fails (e.g. session expired). Callers bail out
  // quietly rather than throwing.
  const startSession = async (title: string): Promise<ChatSession | null> => {
    const s = await newChatSession(title)
    if (!s) return null
    setSessionId(s.id)
    await appendMessage(s.id, {
      role: 'assistant',
      content: `Hi ${state.settings.patientName?.split(' ')[0] || 'there'}! What symptom would you like help with?`,
    })
    return s
  }

  const currentSession = session
  const ensureSession = async (): Promise<ChatSession | null> =>
    currentSession ?? (await startSession('New conversation'))

  // Answer a triage question — either advance to next question or finalize.
  const answerTriage = async (answer: string) => {
    if (mode.kind !== 'triage') return
    const node = findSymptom(mode.symptomId)
    if (!node) return
    const s = await ensureSession()
    if (!s) return
    const q = node.questions[mode.qIndex]
    await appendMessage(s.id, { role: 'user', content: answer })
    const nextAnswers = { ...mode.answers, [q.key]: answer }
    const nextIndex = mode.qIndex + 1

    if (nextIndex < node.questions.length) {
      const nq = node.questions[nextIndex]
      await appendMessage(s.id, {
        role: 'assistant',
        content: nq.prompt,
        card: { type: 'question', symptom: node.label, question: nq.prompt, options: nq.options },
      })
      setMode({ ...mode, answers: nextAnswers, qIndex: nextIndex })
      return
    }

    // Final classification.
    const dx = node.classify(nextAnswers)
    await patchChatSession(s.id, {
      diagnosis: dx,
      status: dx.severity === 'severe' ? 'specialist_referred' : 'home_care',
      endedAt: new Date().toISOString(),
    })

    await appendMessage(s.id, {
      role: 'assistant',
      content: `Based on your answers: ${dx.condition} (${dx.severity}).\n${dx.rationale}`,
    })

    if (dx.severity === 'severe' && dx.specialty) {
      const doctors = findDoctorsForSpecialty(dx.specialty, state.settings.searchRadiusKm)
      await appendMessage(s.id, {
        role: 'assistant',
        content: `I'd recommend seeing a ${dx.specialty}. Here are a few options near you.`,
        card: { type: 'doctor_list', diagnosis: dx, doctors },
      })
    } else {
      await appendMessage(s.id, {
        role: 'assistant',
        content: 'Here are some home-care suggestions and OTC options.',
        card: { type: 'home_care', diagnosis: dx },
      })
      await appendMessage(s.id, {
        role: 'assistant',
        content: 'Need to pick up OTC meds? I can point you to the nearest pharmacy.',
        card: { type: 'pharmacy', mapsQuery: `pharmacy within ${state.settings.searchRadiusKm}km` },
      })
    }
    setMode({ kind: 'idle' })
  }

  // Render a structured /api/chat turn as chat cards. A typed symptom drives the
  // SAME interactive UI as the rule-based flow: one question with tappable
  // options at a time, then a diagnosis + (home-care | doctor) card. The shape
  // normalisation lives in interpretTriage() (unit-tested) because gpt-oss
  // honours the JSON schema loosely.
  const renderAiTurn = async (
    s: ChatSession,
    payload: { data?: unknown; content?: string }
  ) => {
    const result = interpretTriage(payload?.data, payload?.content)

    if (result.kind === 'question') {
      await appendMessage(s.id, {
        role: 'assistant',
        content: result.question,
        card: {
          type: 'question',
          symptom: s.symptoms[s.symptoms.length - 1] ?? 'your symptom',
          question: result.question,
          options: result.options,
          source: 'ai',
        },
      })
      return
    }

    if (result.kind === 'summary') {
      const dx: Diagnosis = {
        condition: result.condition,
        severity: result.severity,
        confidence: 'medium',
        homeRemedies: result.homeRemedies,
        otc: result.otc,
        specialty: result.specialty,
        rationale: result.rationale,
      }
      await patchChatSession(s.id, {
        diagnosis: dx,
        status: result.severity === 'severe' ? 'specialist_referred' : 'home_care',
        endedAt: new Date().toISOString(),
      })
      await appendMessage(s.id, {
        role: 'assistant',
        content: `Based on what you described: ${dx.condition} (${dx.severity}).${dx.rationale ? `\n${dx.rationale}` : ''}`,
      })
      // Severe (or model-flagged) cases get a doctor referral; default to a
      // General Physician if no specialty was named. Otherwise, home care.
      const specialty = dx.specialty ?? (result.seeDoctor ? 'General Physician' : undefined)
      if (result.seeDoctor && specialty) {
        const doctors = findDoctorsForSpecialty(specialty, state.settings.searchRadiusKm)
        await appendMessage(s.id, {
          role: 'assistant',
          content: `I'd recommend seeing a ${specialty}. Here are a few options near you.`,
          card: { type: 'doctor_list', diagnosis: { ...dx, specialty }, doctors },
        })
      } else {
        await appendMessage(s.id, {
          role: 'assistant',
          content: 'Here are some home-care suggestions and OTC options.',
          card: { type: 'home_care', diagnosis: dx },
        })
        await appendMessage(s.id, {
          role: 'assistant',
          content: 'Need to pick up OTC meds? I can point you to the nearest pharmacy.',
          card: { type: 'pharmacy', mapsQuery: `pharmacy within ${state.settings.searchRadiusKm}km` },
        })
      }
      return
    }

    // Plain reply (general question, or graceful fallback from interpretTriage).
    await appendMessage(s.id, { role: 'assistant', content: result.text })
  }

  // Free-text send — routed to the structured /api/chat triage. Returns false if
  // the message couldn't be sent (e.g. session expired) so the composer can
  // restore the user's text instead of silently dropping it.
  const sendFreeText = async (text: string): Promise<boolean> => {
    const msg = text.trim()
    if (!msg || loading) return false

    const s = await ensureSession()
    if (!s) return false
    if (!s.title || s.title === 'New conversation') {
      await patchChatSession(s.id, { title: msg.slice(0, 40) })
    }
    await appendMessage(s.id, { role: 'user', content: msg })
    scrollBottom()

    setLoading(true)
    try {
      const past = state.chatSessions.filter((cs) => cs.id !== s.id)
      // How many AI follow-ups we've already asked — the prompt uses this to
      // stop asking and summarize after a few rounds.
      const askedCount = s.messages.filter(
        (m) => m.card?.type === 'question' && m.card.source === 'ai'
      ).length
      const system = buildSystemPrompt({
        patientName: state.settings.patientName,
        records: state.records,
        pastSessions: past,
        currentSymptom: s.symptoms[s.symptoms.length - 1],
        currentDiagnosis: s.diagnosis,
        askedCount,
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

      // Hit our own server-side proxy in structured mode — it returns a JSON
      // object we render as interactive cards. The key stays server-side.
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convo, structured: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? `Server responded ${res.status}`)
      }
      const payload = await res.json()
      await renderAiTurn(s, payload)
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown error'
      await appendMessage(s.id, {
        role: 'assistant',
        content: `Sorry — I couldn't get a response just now (${reason}). Please try again in a moment.`,
      })
    } finally {
      setLoading(false)
      scrollBottom()
    }
    return true
  }

  // Route a tapped option chip. AI-generated questions continue the LLM
  // conversation (send the choice as the next message); rule-based questions
  // advance the deterministic question tree.
  const handleAnswer = (answer: string, msg: ChatMessage) => {
    if (msg.card?.type === 'question' && msg.card.source === 'ai') {
      sendFreeText(answer)
    } else {
      answerTriage(answer)
    }
  }

  const newConvo = async () => {
    const s = await newChatSession('New conversation')
    if (!s) return
    setSessionId(s.id)
    setMode({ kind: 'idle' })
    await appendMessage(s.id, {
      role: 'assistant',
      content: `Hi ${state.settings.patientName?.split(' ')[0] || 'there'}! What symptom would you like help with?`,
    })
  }

  const removeConvo = async (id: string) => {
    if (!confirm('Delete this chat session?')) return
    await deleteChatSession(id)
    if (sessionId === id) {
      // After refresh, state.chatSessions no longer contains `id`; pick the first
      // remaining session (if any) as the new selection.
      const remaining = state.chatSessions.filter((cs) => cs.id !== id)
      setSessionId(remaining[0]?.id ?? null)
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
              <MessageBubble key={m.id} msg={m} onAnswer={handleAnswer} />
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

          {/* Input */}
          <div
            className="flex-shrink-0 p-4"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)' }}
          >
            <Composer
              onSend={sendFreeText}
              loading={loading}
              placeholder={
                mode.kind === 'triage'
                  ? 'Tap an option above, or type a custom answer…'
                  : 'Ask about your symptoms, records, or medications…'
              }
            />
            <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-4)' }}>
              Not medical advice — always consult a clinician for serious concerns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composer ───────────────────────────────────────────────────────────────
// The message input lives in its own component so that typing only re-renders
// this small box — not the whole chat tree (navbar, sidebar, every message
// bubble). Keeping the text in the parent made each keystroke re-render the
// entire conversation, which on long chats / slower devices caused visible lag
// and dropped characters. `memo` also shields it from parent re-renders (e.g.
// when an assistant message streams in).
const Composer = memo(function Composer({
  onSend,
  loading,
  placeholder,
}: {
  onSend: (text: string) => Promise<boolean>
  loading: boolean
  placeholder: string
}) {
  const [text, setText] = useState('')

  const submit = async () => {
    const t = text.trim()
    if (!t || loading) return
    setText('') // optimistic clear — feels responsive
    const ok = await onSend(t)
    if (!ok) setText(t) // restore if the send couldn't go through
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-end gap-3 max-w-3xl mx-auto">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="input-field flex-1 rounded-2xl px-4 py-3 text-sm resize-none"
        style={{ maxHeight: '120px' }}
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="btn-primary w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        aria-label="Send"
      >
        <Send className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  )
})

// ── Message rendering ──────────────────────────────────────────────────────
function MessageBubble({ msg, onAnswer }: { msg: ChatMessage; onAnswer: (a: string, msg: ChatMessage) => void }) {
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
                onClick={() => onAnswer(o, msg)}
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

