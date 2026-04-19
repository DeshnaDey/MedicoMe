'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { addRecord, deleteRecord, useAppState } from '@/lib/store'
import type { MedicalRecord, RecordCategory } from '@/lib/types'
import {
  AlertTriangle,
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

function RecordsInner() {
  const state = useAppState()
  const params = useSearchParams()
  const [filter, setFilter] = useState<CatId>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    category: 'prescription' as RecordCategory,
    title: '',
    description: '',
    doctor: '',
    date: new Date().toISOString().slice(0, 10),
    tags: '',
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
      (r.doctor ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addRecord({
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      doctor: form.doctor.trim() || undefined,
      date: form.date,
      tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    })
    setShowModal(false)
    setForm({
      category: 'prescription',
      title: '',
      description: '',
      doctor: '',
      date: new Date().toISOString().slice(0, 10),
      tags: '',
    })
    showToast('Record saved')
  }

  const remove = (id: string) => {
    if (!confirm('Delete this record?')) return
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
            placeholder="Search title, notes, or doctor…"
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
            className="relative w-full md:w-[520px] rounded-t-3xl md:rounded-3xl p-6 md:p-7 z-10 max-h-[90vh] overflow-y-auto"
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
                  placeholder="e.g. Metformin 500 mg"
                  required
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>Details</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Dosage, result, notes…"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>
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
                  Tags <span className="normal-case" style={{ color: 'var(--text-4)' }}>(comma separated — drive article recommendations)</span>
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
