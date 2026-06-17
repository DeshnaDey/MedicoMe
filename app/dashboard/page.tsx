'use client'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { useAppState } from '@/lib/store'
import { useRequireAuth } from '@/lib/auth'
import { rankArticles } from '@/lib/articles'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  MessageCircle,
  Microscope,
  Pill,
  Plus,
  Stethoscope,
  TestTube,
} from 'lucide-react'
import type { EventKind, RecordCategory } from '@/lib/types'

const KIND_ICONS: Record<EventKind, React.ElementType> = {
  appointment: Stethoscope,
  test: TestTube,
  medication_end: Pill,
  reminder: Bell,
}
const CAT_ICONS: Record<RecordCategory, React.ElementType> = {
  prescription: Pill,
  test_result: FlaskConical,
  doctor_opinion: FileText,
  diagnosis: Microscope,
  allergy: AlertTriangle,
  vitals: HeartPulse,
  note: ClipboardList,
}

export default function DashboardPage() {
  useRequireAuth()
  const state = useAppState()

  const tod = new Date().getHours()
  const greeting = tod < 12 ? 'morning' : tod < 17 ? 'afternoon' : 'evening'
  const firstName = state.settings.patientName?.split(' ')[0] || 'there'

  const totalRecords = state.records.length
  const byCategory = state.records.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})
  const upcoming = [...state.events]
    .filter((e) => new Date(e.dateTime).getTime() >= Date.now() - 86400_000)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(0, 3)
  const recentRecords = [...state.records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const topArticles = rankArticles(state.records).slice(0, 3)
  const chatSessions = state.chatSessions.length

  const stats = [
    { label: 'Records', val: totalRecords, sub: 'in your history', Icon: FolderIcon },
    { label: 'Prescriptions', val: byCategory.prescription ?? 0, sub: 'active + past', Icon: Pill },
    { label: 'Upcoming', val: upcoming.length, sub: 'in next 30 days', Icon: Activity },
    { label: 'Chat sessions', val: chatSessions, sub: 'triage threads', Icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen page-bg">
      <NavBar />

      <main className="relative md:pt-20 pb-24 md:pb-10 px-5 md:px-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="pt-8 md:pt-4 mb-8">
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Good {greeting}</p>
          <h1 className="font-display text-[34px] md:text-[40px] mt-1" style={{ color: 'var(--text)' }}>
            Hello, {firstName}.
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick actions + Upcoming — surfaced first so the most actionable
            things (start a check, what's coming up) sit at the top. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="card rounded-2xl p-5">
            <h3 className="font-display text-[18px] mb-4" style={{ color: 'var(--text)' }}>Quick actions</h3>
            <div className="space-y-2.5">
              <Link href="/chat" className="btn-primary flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium">
                <Stethoscope className="w-4 h-4" strokeWidth={2} /> Start symptom check
              </Link>
              <Link href="/records?add=true" className="btn-secondary flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" strokeWidth={2} /> Add medical record
              </Link>
              <Link href="/calendar?add=true" className="btn-secondary flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium">
                <Calendar className="w-4 h-4" strokeWidth={2} /> Schedule appointment
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>Upcoming</h3>
              <Link href="/calendar" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--teal-600)' }}>
                View calendar <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>Nothing scheduled</p>
                <Link href="/calendar?add=true" className="text-sm font-medium" style={{ color: 'var(--teal-600)' }}>
                  + Add an event
                </Link>
              </div>
            ) : (
              upcoming.map((e) => {
                const Icon = KIND_ICONS[e.kind]
                return (
                  <div key={e.id} className="flex items-start gap-3 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl mt-0.5" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{e.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {new Date(e.dateTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                      {e.notes && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-4)' }}>{e.notes}</p>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* At-a-glance counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, val, sub, Icon }) => (
            <div key={label} className="card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>{label}</p>
                  <p className="font-display text-[32px] mt-1.5" style={{ color: 'var(--text)' }}>{val}</p>
                </div>
                <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent records + For you */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>Recent records</h3>
              <Link href="/records" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--teal-600)' }}>
                All records <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
            {recentRecords.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No records yet.</p>
            ) : (
              recentRecords.map((r) => {
                const Icon = CAT_ICONS[r.category]
                return (
                  <div key={r.id} className="flex items-start gap-3 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl mt-0.5" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{r.title}</p>
                      {r.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-3)' }}>{r.description}</p>}
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>{r.date}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[18px]" style={{ color: 'var(--text)' }}>For you</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                Personalised
              </span>
            </div>
            {topArticles.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Add records with tags to get personalised articles.</p>
            ) : (
              <div className="space-y-2.5">
                {topArticles.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 rounded-xl no-underline transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>{a.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>{a.source}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{a.tag}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Small icons not already imported
function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
    </svg>
  )
}
function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
