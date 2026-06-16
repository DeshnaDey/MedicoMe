// Map Prisma rows → the JSON shapes the client expects.
//
// Keeping this isolated means the API routes stay thin: they query Prisma,
// hand the rows to these helpers, and return the result. If we ever change
// the DB schema without changing the client contract, this is the seam.

import type {
  CalendarEvent as DbEvent,
  ChatMessage as DbMessage,
  ChatSession as DbSession,
  MedicalRecord as DbRecord,
  PrescriptionMedicine as DbMedicine,
  Settings as DbSettings,
  User as DbUser,
} from './prisma-client'
import type {
  Account,
  CalendarEvent,
  ChatMessage,
  ChatSession,
  Diagnosis,
  MedicalRecord,
  PrescriptionMedicine,
  Settings,
} from '../types'

export function serializeAccount(u: Pick<DbUser, 'email' | 'name' | 'createdAt'>): Account {
  return {
    email: u.email,
    name: u.name,
    // The client Account shape still includes passwordHash for historical
    // reasons, but we never send it. Coerce to empty string so TS stays happy.
    passwordHash: '',
    createdAt: u.createdAt.toISOString(),
  }
}

export function serializeSettings(s: DbSettings | null): Settings {
  if (!s) return { searchRadiusKm: 5, patientName: '' }
  return { searchRadiusKm: s.searchRadiusKm, patientName: s.patientName }
}

export function serializeMedicine(m: DbMedicine): PrescriptionMedicine {
  const med: PrescriptionMedicine = { name: m.name, dosage: m.dosage }
  if (m.reminderTime && m.reminderStartDate && m.reminderDurationDays && m.reminderFrequency) {
    med.reminder = {
      time: m.reminderTime,
      startDate: m.reminderStartDate,
      durationDays: m.reminderDurationDays,
      frequency: m.reminderFrequency,
    }
  }
  return med
}

export function serializeRecord(
  r: DbRecord & { medicines?: DbMedicine[] }
): MedicalRecord {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description ?? undefined,
    doctor: r.doctor ?? undefined,
    date: r.date,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    createdAt: r.createdAt.toISOString(),
    medicines: r.medicines && r.medicines.length > 0 ? r.medicines.map(serializeMedicine) : undefined,
  }
}

export function serializeEvent(e: DbEvent): CalendarEvent {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    notes: e.notes ?? undefined,
    dateTime: e.dateTime.toISOString(),
    location: e.location ?? undefined,
    linkedRecordId: e.linkedRecordId ?? undefined,
    createdAt: e.createdAt.toISOString(),
  }
}

export function serializeMessage(m: DbMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    ts: m.ts.toISOString(),
    card: (m.card as ChatMessage['card']) ?? undefined,
  }
}

export function serializeSession(
  s: DbSession & { messages?: DbMessage[] }
): ChatSession {
  return {
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : undefined,
    title: s.title,
    messages: (s.messages ?? []).map(serializeMessage),
    symptoms: Array.isArray(s.symptoms) ? (s.symptoms as string[]) : [],
    diagnosis: (s.diagnosis as Diagnosis | null | undefined) ?? undefined,
    status: s.status,
  }
}
