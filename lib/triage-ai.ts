// Pure interpretation of the structured /api/chat triage payload.
//
// gpt-oss honours the JSON *schema* loosely: content is reliably non-empty, but
// the shape wobbles — it may wrap the object ({"summary":{…}}), omit "type", add
// markdown fences (handled in the route), or summarise the answers without
// actually naming a condition. This function normalises all of that into one of
// three tagged results the chat page can render, and degrades to a safe text
// reply rather than a dead-end error. Framework-free so it can be unit-tested.

import type { Severity } from './types'

export type TriageResult =
  | { kind: 'question'; question: string; options: string[] }
  | {
      kind: 'summary'
      condition: string
      severity: Severity
      rationale: string
      homeRemedies?: string[]
      otc?: string[]
      seeDoctor: boolean
      specialty?: string
    }
  | { kind: 'reply'; text: string }

const FRIENDLY_FALLBACK = "Sorry, I didn't quite catch that — could you try rephrasing?"
const SAFE_CLOSE =
  "Thanks for the details. I can't pinpoint a specific cause from this — please keep an eye on " +
  'how you feel and see a clinician if it persists, worsens, or you develop fever, severe or ' +
  'spreading pain, vomiting, breathing trouble, or other worrying signs.'

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []
}

export function interpretTriage(data: unknown, fallbackContent?: string): TriageResult {
  if (!data || typeof data !== 'object') {
    const t = String(fallbackContent ?? '').trim()
    return { kind: 'reply', text: t || FRIENDLY_FALLBACK }
  }

  const obj = data as Record<string, unknown>

  // Unwrap one level of common wrappers gpt-oss sometimes adds.
  let d: Record<string, unknown> = obj
  for (const k of ['summary', 'diagnosis', 'assessment', 'result']) {
    const inner = obj[k]
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      d = { ...obj, ...(inner as Record<string, unknown>) }
      break
    }
  }

  const type = typeof d.type === 'string' ? d.type : ''
  const options = asStringArray(d.options).slice(0, 5)
  const condition = typeof d.condition === 'string' ? d.condition.trim() : ''

  // 1) Follow-up question — has tappable options and isn't an explicit summary.
  if (options.length > 0 && type !== 'summary' && !condition) {
    const q =
      typeof d.question === 'string' && d.question.trim()
        ? d.question.trim()
        : 'Could you tell me a bit more?'
    return { kind: 'question', question: q, options }
  }

  // 2) Assessment — needs a concrete condition to render the diagnosis card.
  if (condition) {
    const sev = d.severity
    const severity: Severity = sev === 'mild' || sev === 'moderate' || sev === 'severe' ? sev : 'moderate'
    const homeRemedies = asStringArray(d.homeRemedies)
    const otc = asStringArray(d.otc)
    return {
      kind: 'summary',
      condition,
      severity,
      rationale: typeof d.rationale === 'string' ? d.rationale : '',
      homeRemedies: homeRemedies.length ? homeRemedies : undefined,
      otc: otc.length ? otc : undefined,
      seeDoctor: d.seeDoctor === true || severity === 'severe',
      specialty: typeof d.specialty === 'string' ? d.specialty : undefined,
    }
  }

  // 3) Plain reply, or a graceful fallback.
  const text = String(d.text ?? d.rationale ?? '').trim()
  if (text) return { kind: 'reply', text }

  // Looked like a summary attempt but no usable condition/text → safe close
  // rather than a confusing "rephrase".
  const looksSummary = type === 'summary' || 'symptoms' in d || 'duration' in d || 'severity' in d
  if (looksSummary) return { kind: 'reply', text: SAFE_CLOSE }

  const q = typeof d.question === 'string' ? d.question.trim() : ''
  return { kind: 'reply', text: q || String(fallbackContent ?? '').trim() || FRIENDLY_FALLBACK }
}
