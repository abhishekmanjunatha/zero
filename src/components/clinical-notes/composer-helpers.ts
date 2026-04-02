import type { DocumentBlock, DocumentType } from '@/types/app'
import type { Json } from '@/types/database'

// ── Shared types ──────────────────────────────────────────────────────────

export interface PatientContext {
  id: string
  full_name: string
  patient_code: string
  phone: string
  gender: string | null
  date_of_birth: string | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: string | null
  dietary_type: string | null
  medical_conditions: readonly string[] | string[] | null
  food_allergies: readonly string[] | string[] | null
  primary_goal: string | null
}

export interface PatientSnapshotData {
  name: string
  age: string
  gender: string
  height: string
  weight: string
  bmi: string
  ibw: string
  weightDiff: string
  primaryGoal: string
  activityLevel: string
  medicalConditions: string
  foodAllergies: string
  previousWeight: string
  weightChange: string
}

export interface DocTemplate {
  id: string
  name: string
  blocks: DocumentBlock[]
  createdAt: string
}

export interface DocumentComposerDraft {
  docType: DocumentType
  docTitle: string
  blocks: DocumentBlock[]
  includePatientInfo: boolean
  visitHeight: string
  visitWeight: string
  selectedTemplateId: string | null
}

// ── Pure helpers ──────────────────────────────────────────────────────────

export function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  const randomPart = Math.random().toString(36).slice(2)
  return `id-${Date.now()}-${randomPart}`
}

export function sanitizeContentBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks
    .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
    .map((b, index) => ({ ...b, order: index }))
}

export function normalizeTemplateBlocks(raw: Json): DocumentBlock[] {
  if (!Array.isArray(raw)) return []
  return raw.map((value, index) => {
    const block = value as Partial<DocumentBlock>
    return {
      id: typeof block.id === 'string' ? block.id : `legacy-${index}`,
      type: block.type === 'meal_section' || block.type === 'instructions' || block.type === 'custom'
        ? block.type : 'custom',
      label: typeof block.label === 'string' && block.label.trim() ? block.label : `Section ${index + 1}`,
      content: typeof block.content === 'string' ? block.content : '',
      order: index,
    } satisfies DocumentBlock
  })
}

export function defaultBlocksForType(type: DocumentType): DocumentBlock[] {
  switch (type) {
    case 'meal_plan':
      return [
        { id: 'meal-breakfast', type: 'meal_section', label: 'Breakfast', content: '', order: 0 },
        { id: 'meal-mid-morning-snack', type: 'meal_section', label: 'Mid-Morning Snack', content: '', order: 1 },
        { id: 'meal-lunch', type: 'meal_section', label: 'Lunch', content: '', order: 2 },
        { id: 'meal-evening-snack', type: 'meal_section', label: 'Evening Snack', content: '', order: 3 },
        { id: 'meal-dinner', type: 'meal_section', label: 'Dinner', content: '', order: 4 },
        { id: 'meal-instructions', type: 'instructions', label: 'Instructions', content: '', order: 5 },
      ]
    case 'follow_up_recommendation':
      return [
        { id: 'follow-up-progress-summary', type: 'custom', label: 'Progress Summary', content: '', order: 0 },
        { id: 'follow-up-recommendations', type: 'custom', label: 'Recommendations', content: '', order: 1 },
        { id: 'follow-up-next-steps', type: 'custom', label: 'Next Steps', content: '', order: 2 },
      ]
    case 'quick_note':
      return [{ id: 'quick-note-notes', type: 'custom', label: 'Notes', content: '', order: 0 }]
    case 'custom':
    default:
      return [{ id: 'custom-content', type: 'custom', label: 'Content', content: '', order: 0 }]
  }
}

export function computeAge(dob: string | null): string {
  if (!dob) return 'N/A'
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return `${age} yrs`
}

export function computeBMI(weight_kg: number | null, height_cm: number | null): string {
  if (!weight_kg || !height_cm || height_cm === 0) return 'N/A'
  const h = height_cm / 100
  return (weight_kg / (h * h)).toFixed(1)
}

export function computeIBW(height_cm: number | null, gender: string | null): string {
  if (!height_cm) return 'N/A'
  const heightInches = height_cm / 2.54
  const excess = Math.max(0, heightInches - 60)
  const ibw = gender === 'male' ? 50 + 2.3 * excess : gender === 'female' ? 45.5 + 2.3 * excess : 47.75 + 2.3 * excess
  return ibw.toFixed(1)
}

export function computeWeightDiff(weight_kg: number | null, height_cm: number | null, gender: string | null): string {
  if (!weight_kg || !height_cm) return 'N/A'
  const ibwStr = computeIBW(height_cm, gender)
  if (ibwStr === 'N/A') return 'N/A'
  const diff = weight_kg - parseFloat(ibwStr)
  return (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg'
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '\u2022 ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .trim()
}

export function buildPatientSnapshotBlock(
  patient: PatientContext,
  opts?: { visitHeight?: number; visitWeight?: number; previousWeight?: number | null }
): DocumentBlock {
  const h = (opts?.visitHeight != null && !isNaN(opts.visitHeight)) ? opts.visitHeight : patient.height_cm
  const w = (opts?.visitWeight != null && !isNaN(opts.visitWeight)) ? opts.visitWeight : patient.weight_kg
  const prevW = opts !== undefined
    ? (opts.previousWeight !== undefined ? opts.previousWeight : patient.weight_kg)
    : patient.weight_kg
  const ibwVal = computeIBW(h, patient.gender)
  const weightChangeVal =
    w != null && prevW != null && Math.abs(w - prevW) > 0.01
      ? (w >= prevW ? '+' : '') + (w - prevW).toFixed(1) + ' kg'
      : 'N/A'
  const snapshot: PatientSnapshotData = {
    name: patient.full_name,
    age: computeAge(patient.date_of_birth),
    gender: patient.gender ?? 'N/A',
    height: h ? `${h} cm` : 'N/A',
    weight: w ? `${w} kg` : 'N/A',
    bmi: computeBMI(w, h),
    ibw: ibwVal !== 'N/A' ? `${ibwVal} kg` : 'N/A',
    weightDiff: computeWeightDiff(w, h, patient.gender),
    primaryGoal: patient.primary_goal?.replace(/_/g, ' ') ?? 'N/A',
    activityLevel: patient.activity_level?.replace(/_/g, ' ') ?? 'N/A',
    medicalConditions: patient.medical_conditions?.join(', ') || 'None',
    foodAllergies: patient.food_allergies?.join(', ') || 'None',
    previousWeight: prevW != null ? `${prevW} kg` : 'N/A',
    weightChange: weightChangeVal,
  }
  return {
    id: 'patient-snapshot',
    type: 'patient_snapshot',
    label: 'Patient Information',
    content: JSON.stringify(snapshot),
    order: -1,
  }
}
