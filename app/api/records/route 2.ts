import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/db'
import { requireUser } from '@/lib/server/session'
import { serializeRecord } from '@/lib/server/serialize'
import type { MedicineFrequency, PrescriptionMedicine, RecordCategory } from '@/lib/types'

type CreateBody = {
  category: RecordCategory
  title: string
  description?: string
  doctor?: string
  date: string
  tags?: string[]
  medicines?: PrescriptionMedicine[]
}

const VALID_CATEGORIES: RecordCategory[] = [
  'prescription',
  'test_result',
  'doctor_opinion',
  'diagnosis',
  'allergy',
  'vitals',
  'note',
]

const VALID_FREQUENCIES: MedicineFrequency[] = ['once', 'daily', 'twice_daily', 'weekly']

export async function POST(req: Request) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  if (!VALID_CATEGORIES.includes(body.category))
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
  if (!body.date) return NextResponse.json({ error: 'Date is required.' }, { status: 400 })

  // Filter out incomplete medicine rows (empty name) before writing.
  const medicines = (body.medicines ?? []).filter((m) => m.name?.trim())

  const record = await prisma.medicalRecord.create({
    data: {
      userId: user.id,
      category: body.category,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      doctor: body.doctor?.trim() || null,
      date: body.date,
      tags: body.tags ?? [],
      medicines: {
        create: medicines.map((m) => ({
          name: m.name.trim(),
          dosage: (m.dosage ?? '').trim(),
          reminderTime: m.reminder?.time ?? null,
          reminderStartDate: m.reminder?.startDate ?? null,
          reminderDurationDays: m.reminder?.durationDays ?? null,
          reminderFrequency:
            m.reminder && VALID_FREQUENCIES.includes(m.reminder.frequency)
              ? m.reminder.frequency
              : null,
        })),
      },
    },
    include: { medicines: true },
  })

  return NextResponse.json({ record: serializeRecord(record) })
}
