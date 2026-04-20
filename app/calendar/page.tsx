'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { addEvent, deleteEvent, useAppState } from '@/lib/store'
import { useRequireAuth } from '@/lib/auth'
import type { CalendarEvent, EventKind } from '@/lib/types'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Pill,
  Plus,
  Stethoscope,
  TestTube,
  Trash2,
  X,
} from 'lucide-react'

const KIND_META: {
  id: EventKind
  label: string
  Icon: React.ElementType
  color: string
}[] = [
  { id: 'appointment', label: 'Appointment', Icon: Stethoscope, color: 'var(--teal-600)' },
  { id: 'test', label: 'Test', Icon: TestTube, color: '#7C5CE0' },
  { id: 'medication_end', label: 'Med refill', Icon: Pill, color: '#E5A23A' },
  { id: 'reminder', label: 'Reminder', Icon: Bell, color: '#3FA29C' },
]
const KIND_BY_ID = Object.fromEntries(KIND_META.map((k) => [k.id, k]))

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function CalendarInner() {
  useRequireAuth()
  const state = useAppState()
  const params = useSearchParams()
  const [cursor, setCursor] = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date>(new Date())
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    kind: 'appointment' as EventKind,
    title: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    location: '',
  })

  useEffect(() => {
    if (params.get('add') === 'true') setShowModal(true)
  }, [params])

  const events = state.events

  const monthGrid = useMemo(() => {
    const firstDay = startOfMonth(cursor)
    const firstWeekday = firstDay.getDay()
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(firstDay)
      d.setDate(d.getDate() - (firstWeekday - i))
      cells.push({ date: d, inMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      const d = new Date(last)
      d.setDate(d.getDate() + 1)
      cells.push({ date: d, inMonth: false })
    }
    return cells
  }, [cursor])

  const eventsByDay = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {}
    events.forEach((e) => {
      const d = new Date(e.dateTime).toISOString().slice(0, 10)
      ;(m[d] ??= []).push(e)
    })
    return m
  }, [events])

  const selectedKey = selected.toISOString().slice(0, 10)
  const dayEvents = (eventsByDay[selectedKey] ?? []).sort((a, b) => a.dateTime.localeCompare(b.dateTime))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const dateTime = new Date(`${form.date}T${form.time}:00`).toISOString()
    addEvent({
      kind: form.kind,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      dateTime,
      location: form.location.trim() || undefined,
    })
    setShowModal(false)
    setForm({
      kind: 'appointment',
      title: '',
      notes: '',
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
      location: '',
    })
    setToast('Event added')
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="min-h-screen page-bg">
      <NavBar />

      <main className="relative md:pt-20 pb-28 md:pb-10 px-5 md:px-10 max-w-5xl mx-auto">
        <div className="pt-8 md:pt-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-[32px] md:text-[36px]" style={{ color: 'var(--text)' }}>Calendar</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              Appointments, tests, med refills and reminders.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add event
          </button>
        </div>

        {/* Month selector */}
        <div className="card rounded-2xl p-4 md:p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCursor(addMonths(cursor, -1))}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-2)' }}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <h3 className="font-display text-[22px]" style={{ color: 'var(--text)' }}>
              {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </h3>
            <button
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-2)' }}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-3)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map(({ date, inMonth }, i) => {
              const key = date.toISOString().slice(0, 10)
              const evts = eventsByDay[key] ?? []
              const isToday = sameDay(date, new Date())
              const isSel = sameDay(date, selected)
              return (
                <button
                  key={i}
                  onClick={() => setSelected(date)}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative"
                  style={{
                    color: !inMonth ? 'var(--text-4)' : isSel ? '#fff' : 'var(--text)',
                    background: isSel ? 'var(--teal-500)' : 'transparent',
                    border: isToday && !isSel ? '1px solid var(--teal-300)' : '1px solid transparent',
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  <span>{date.getDate()}</span>
                  {evts.length > 0 && (
                    <span className="flex gap-0.5 mt-0.5">
                      {evts.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className="w-1 h-1 rounded-full"
                          style={{ background: isSel ? '#fff' : KIND_BY_ID[e.kind]?.color ?? 'var(--teal-500)' }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div className="card rounded-2xl p-5 mb-5">
          <h3 className="font-display text-[18px] mb-3" style={{ color: 'var(--text)' }}>
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {dayEvents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No events this day.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: 'var(--teal-600)' }}
              >
                + Add event for this day
              </button>
            </div>
          ) : (
            dayEvents.map((e) => {
              const meta = KIND_BY_ID[e.kind]
              const Icon = meta?.Icon ?? Bell
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 py-3 border-t first:border-t-0 group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--teal-50)', color: meta?.color ?? 'var(--teal-600)' }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{e.title}</p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--teal-50)', color: 'var(--teal-700)' }}
                      >
                        {meta?.label ?? e.kind}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {new Date(e.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                    {e.notes && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this event?')) deleteEvent(e.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                    style={{ color: 'var(--text-3)' }}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Upcoming list */}
        <div className="card rounded-2xl p-5">
          <h3 className="font-display text-[18px] mb-3" style={{ color: 'var(--text)' }}>All upcoming</h3>
          {events.filter((e) => new Date(e.dateTime).getTime() >= Date.now() - 86400_000).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nothing scheduled.</p>
          ) : (
            [...events]
              .filter((e) => new Date(e.dateTime).getTime() >= Date.now() - 86400_000)
              .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
              .slice(0, 12)
              .map((e) => {
                const meta = KIND_BY_ID[e.kind]
                const Icon = meta?.Icon ?? Bell
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 py-2.5 border-t first:border-t-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                      style={{ background: 'var(--teal-50)', color: meta?.color ?? 'var(--teal-600)' }}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{e.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {new Date(e.dateTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15, 31, 44, 0.35)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowModal(false)}
          />
          <div
            className="relative w-full md:w-[500px] rounded-t-3xl md:rounded-3xl p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-[22px]" style={{ color: 'var(--text)' }}>Add event</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                  Type
                </label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                >
                  {KIND_META.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                  Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="e.g. Endocrinology follow-up"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Fortis Hospital, Bengaluru"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.08em] mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Anything to remember..."
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1 py-3 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-3 rounded-xl text-sm font-medium">
                  Save event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-xl z-[200] whitespace-nowrap fade-in"
          style={{ background: 'var(--teal-500)', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarInner />
    </Suspense>
  )
}
