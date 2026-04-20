'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { addEvent, addRecord, deleteRecord, useAppState } from '@/lib/store'
import { useRequireAuth } from '@/lib/auth'
import type {
  MedicalRecord,
  MedicineFrequency,
  MedicineReminder,
  PrescriptionMedicine,
  RecordCategory,
} from '@/lib/types'
import {
  AlertTriangle,
  Bell,
  BellOff,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderHeart,
  HeartPulse,
  Microscope,
  Pill,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

type CatId = RecordCategory | 'all'

const CATEGORIES: { id: CatId; label: string; Icon: React.ElementType }[] = [
  { id: 'all',            label: 'All',           Icon: FolderHeart },
  { id: 'prescription',   label: 'Prescriptions', Icon: Pill },
  { id: 'test_result',    label: 'Test results',  Icon: FlaskConical },
  { id: 'doctor_opinion', label: 'Doctor notes',  Icon: FileText },
  { id: 'diagnosis',      label: 'Diagnoses',     Icon: Microscope },
  { id: 'vitals',         label: 'Vitals',        Icon: HeartPulse },
  { id: 'allergy',        label: 'Allergies',     Icon: AlertTriangle },
  { id: 'note',           label: 'Notes',         Icon: ClipboardList },
]
const CAT_ICONS: Record<RecordCategory, React.ElementType> = {
  prescription:   Pill,
  test_result:    FlaskConical,
  doctor_opinion: FileText,
  diagnosis:      Microscope,
  vitals:         HeartPulse,
  allergy:        AlertTriangle,
  note:           ClipboardList,
}

const FREQUENCY_LABEL: Record<MedicineFrequency, string> = {
  once: 'One-off',
  daily: 'Once daily',
  twice_daily: 'Twice daily',
  weekly: 'Weekly',
}

// Form-local shape for an in-progress medicine row. `reminderOn` is a UI-only
// flag that toggles the reminder sub-form; at save time we map this back to
// `PrescriptionMedicine.reminder`.
type MedicineRow = {
  name: string
  dosage: string
  reminderOn: boolean
  reminder: MedicineReminder
}

const emptyReminder = (date: string): MedicineReminder => ({
  time: '08:00',
  startDate: date,
  durationDays: 7,
  frequency: 'daily',
})

const emptyMedicine = (date: string): MedicineRow => ({
  name: '',
  dosage: '',
  reminderOn: false,
  reminder: emptyReminder(date),
})

// Expand a reminder spec into concrete CalendarEvent dateTimes. Returns an
// array of ISO strings — one per firing occurrence. For recurring reminders
// we cap at durationDays so a typo (e.g. 999 days) can't flood the calendar.
function expandReminderTimes(r: MedicineReminder): string[] {
  const [hh, mm] = r.time.split(':').map((n) => Number(n))
  const start = new Date(r.startDate)
  start.setHours(hh || 0, mm || 0, 0, 0)
  const days = Math.max(1, Math.min(90, r.durationDays))

  const out: string[] = []
  if (r.frequency === 'once') {
    out.push(start.toISOString())
    return out
  }
  for (let i = 0; i < days; i++) {
    if (r.frequency === 'weekly' && i % 7 !== 0) continue
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    out.push(d.toISOString())
    if (r.frequency === 'twice_daily') {
      const second = new Date(d)
      second.setHours(d.getHours() + 12) // naive 12-hour offset
      out.push(second.toISOString())
    }
  }
  return out
}

function RecordsInner() {
  useRequireAuth()
  const state = useAppState()
  const params = useSearchParams()
  const [filter, setFilter] = useState<CatId>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    category: 'prescription' as RecordCategory,
    title: '',
    description: '',
    doctor: '',
    date: today,
    tags: '',
    medicines: [emptyMedicine(today)] as MedicineRow[],
  })

  useEffect(() => {
    if (params.get('add') === 'true') setShowModal(true)
  }, [params])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  const records: MedicalRecord[] = state.records
  const filtered = records.filter((r) => {
    const matchCat = filter === 'all' || r.category === filter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      (r.doctor ?? '').toLowerCase().includes(q) ||
      (r.medicines ?? []).some(
        (m) => m.name.toLowerCase().includes(q) || m.dosage.toLowerCase().includes(q)
      )
    return matchCat && matchSearch
  })

  const resetForm = () => {
    const d = new Date().toISOString().slice(0, 10)
    setForm({
      category: 'prescription',
      title: '',
      description: '',
      doctor: '',
      date: d,
      tags: '',
      medicines: [emptyMedicine(d)],
    })
  }

  const updateMedicine = (idx: number, patch: Partial<MedicineRow>) => {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }))
  }
  const updateReminder = (idx: number, patch: Partial<MedicineReminder>) => {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, i) =>
        i === idx ? { ...m, reminder: { ...m.reminder, ...patch } } : m
      ),
    }))
  }
  const addMedicineRow = () => {
    setForm((f) => ({ ...f, medicines: [...f.medicines, emptyMedicine(f.date)] }))
  }
  const removeMedicineRow = (idx: number) => {
    setForm((f) => ({
      ...f,
      medicines:
        f.medicines.length > 1 ? f.medicines.filter((_, i) => i !== idx) : f.medicines,
    }))
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    // Only attach medicines to prescription records. Strip out rows the user
    // left empty (common when they added a row but didn't fill it in).
    let medicines: PrescriptionMedicine[] | undefined
    if (form.category === 'prescription') {
      medicines = form.medicines
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          reminder: m.reminderOn ? m.reminder : undefined,
        }))
      if (medicines.length === 0) medicines = undefined
    }

    const record = addRecord({
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      doctor: form.doctor.trim() || undefined,
      date: form.date,
      tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      medicines,
    })

    // For each medicine reminder, mirror into the calendar as events linked
    // back to this record. Using a separate event per occurrence keeps the
    // existing calendar rendering logic simple (no recurrence expansion).
    let reminderCount = 0
    if (medicines) {
      for (const med of medicines) {
        if (!med.reminder) continue
        const times = expandReminderTimes(med.reminder)
        for (const dt of times) {
          addEvent({
            kind: 'reminder',
            title: `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`,
            notes: `Medication reminder from prescription: ${record.title}`,
            dateTime: dt,
            linkedRecordId: record.id,
          })
          reminderCount++
        }
      }
    }

    setShowModal(false)
    resetForm()
    showToast(
      reminderCount > 0
        ? `Record saved · ${reminderCount} reminder${reminderCount === 1 ? '' : 's'} added`
        : 'Record saved'
    )
  }

  const remove = (id: string) => {
    if (!confirm('Delete this record? Any medicine reminders linked to it will still appear in the calendar — delete them there if needed.')) return
    deleteRecord(id)
    showToast('Record deleted')
  }

  return (
    <div className="min-h-screen page-bg">
      <NavBar />

      <main className="relative md:pt-20 pb-24 md:pb-10 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="pt-8 md:pt-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[32px]" style={{ color: 'var(--text)' }}>Medical records</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Prescriptions, test results, doctor opinions and more.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add record
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
          {CATEGORIES.map(({ id, label, Icon }) => {
            const active = filter === id
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${active ? 'chip chip-active' : 'chip'}`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, notes, doctor or medicine…"
            className="input-field w-full pl-10 pr-4 py-3 rounded-xl text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
              <FolderHeart className="w-5 h-5" strokeWidth={1.6} />
            </span>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No records found</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-sm font-medium" style={{ color: 'var(--teal-600)' }}>
              + Add a record
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((r) => {
              const Icon = CAT_ICONS[r.category]
              return (
                <div key={r.id} className="card rounded-2xl p-4 flex items-start gap-4 group">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 mt-0.5" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                        {r.category.replace('_', ' ')}
                      </span>
                      {r.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-2)', color: 'var(--text-3)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                    {r.description && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{r.description}</p>}

                    {r.medicines && r.medicines.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {r.medicines.map((m, i) => (
                          <li
                            key={`${m.name}-${i}`}
                            className="flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5"
                            style={{ background: 'var(--bg-2)' }}
                          >
                            <Pill className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={1.8} style={{ color: 'var(--teal-600)' }} />
                            <div className="flex-1 min-w-0">
                              <p style={{ color: 'var(--text)' }}>
                                <span className="font-medium">{m.name}</span>
                                {m.dosage && <span style={{ color: 'var(--text-3)' }}> · {m.dosage}</span>}
                              </p>
                              {m.reminder && (
                                <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--teal-700)' }}>
                                  <Bell className="w-2.5 h-2.5" strokeWidth={2} />
                                  {FREQUENCY_LABEL[m.reminder.frequency]} · {m.reminder.time}
                                  {m.reminder.frequency !== 'once' &&
                                    ` · ${m.reminder.durationDays} day${m.reminder.durationDays === 1 ? '' : 's'}`}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-4)' }}>
                      {r.doctor ? `${r.doctor} · ` : ''}
                      {r.date}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    title="Delete"
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(15,31,44,0.25)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)} />
          <div
            className="relative w-full md:w-[560px] rounded-t-3xl md:rounded-3xl p-6 md:p-7 z-10 max-h-[90vh] overflow-y-auto"
            style={{ background: '#fff', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[22px]" style={{ color: 'var(--text)' }}>Add medical record</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg btn-ghost">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as RecordCategory })}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                >
                  <option value="prescription">Prescription</option>
                  <option value="test_result">Test result</option>
                  <option value="doctor_opinion">Doctor opinion</option>
                  <option value="diagnosis">Diagnosis</option>
                  <option value="vitals">Vitals</option>
                  <option value="allergy">Allergy</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                  Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={form.category === 'prescription' ? 'e.g. Diabetes prescription – Apr 2026' : 'e.g. HbA1c test'}
                  required
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                  {form.category === 'prescription' ? 'Notes (optional)' : 'Details'}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={form.category === 'prescription' ? 2 : 3}
                  placeholder={form.category === 'prescription' ? 'Any instructions from the doctor…' : 'Dosage, result, notes…'}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>

              {form.category === 'prescription' && (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--teal-600)' }} />
                      <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Medicines</h4>
                    </div>
                    <button
                      type="button"
                      onClick={addMedicineRow}
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: 'var(--teal-600)' }}
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Add medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.medicines.map((m, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-3"
                        style={{ background: '#fff', border: '1px solid var(--border-2)' }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              value={m.name}
                              onChange={(e) => updateMedicine(idx, { name: e.target.value })}
                              placeholder="Medicine name"
                              className="input-field w-full rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                              value={m.dosage}
                              onChange={(e) => updateMedicine(idx, { dosage: e.target.value })}
                              placeholder="Dosage (e.g. 500mg, after meals)"
                              className="input-field w-full rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          {form.medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicineRow(idx)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ color: 'var(--danger)' }}
                              title="Remove medicine"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateMedicine(idx, { reminderOn: !m.reminderOn })}
                          className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: m.reminderOn ? 'var(--teal-700)' : 'var(--text-3)' }}
                        >
                          {m.reminderOn ? (
                            <Bell className="w-3.5 h-3.5" strokeWidth={2} />
                          ) : (
                            <BellOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                          )}
                          {m.reminderOn ? 'Reminder on — tap to disable' : 'Set reminder'}
                        </button>

                        {m.reminderOn && (
                          <div
                            className="mt-3 rounded-lg p-3 grid grid-cols-2 gap-2"
                            style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)' }}
                          >
                            <div>
                              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--teal-700)' }}>Time</label>
                              <input
                                type="time"
                                value={m.reminder.time}
                                onChange={(e) => updateReminder(idx, { time: e.target.value })}
                                className="input-field w-full rounded-lg px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--teal-700)' }}>Start date</label>
                              <input
                                type="date"
                                value={m.reminder.startDate}
                                onChange={(e) => updateReminder(idx, { startDate: e.target.value })}
                                className="input-field w-full rounded-lg px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--teal-700)' }}>Frequency</label>
                              <select
                                value={m.reminder.frequency}
                                onChange={(e) => updateReminder(idx, { frequency: e.target.value as MedicineFrequency })}
                                className="input-field w-full rounded-lg px-3 py-2 text-sm"
                              >
                                <option value="once">One-off</option>
                                <option value="daily">Once daily</option>
                                <option value="twice_daily">Twice daily</option>
                                <option value="weekly">Weekly</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--teal-700)' }}>Duration (days)</label>
                              <input
                                type="number"
                                min={1}
                                max={90}
                                disabled={m.reminder.frequency === 'once'}
                                value={m.reminder.durationDays}
                                onChange={(e) => updateReminder(idx, { durationDays: Number(e.target.value) || 1 })}
                                className="input-field w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-4)' }}>
                    Reminders show up in your calendar as individual events. Capped at 90 days.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>Doctor / lab</label>
                  <input
                    value={form.doctor}
                    onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                    placeholder="Dr. Rao"
                    className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
                  Tags <span className="normal-case" style={{ color: 'var(--text-4)' }}>(comma separated)</span>
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="diabetes, medication"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3 rounded-xl text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 rounded-xl text-sm font-medium">
                  Save record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-xl z-[200] fade-in"
          style={{ background: 'var(--teal-600)', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default function RecordsPage() {
  return (
    <Suspense fallback={null}>
      <RecordsInner />
    </Suspense>
  )
}
