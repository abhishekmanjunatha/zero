'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn, formatLabel } from '@/lib/utils'
import { GOAL_LABELS, ACTIVITY_LABELS } from '@/lib/constants/labels'
import { createClient } from '@/lib/supabase/client'
import { createClinicalNote, updateClinicalNote } from '@/actions/clinical-notes'
import { createDocumentTemplate, getDocumentTemplates } from '@/actions/templates'
import { useLocalDraft } from '@/hooks/use-local-draft'
import type { DocumentType, DocumentBlock } from '@/types/app'
import type { Tables, Json } from '@/types/database'
import { downloadPDFFromServer, generatePDFBlobFromServer, type GeneratePDFInput } from '@/lib/pdf/client'
import type { PDFDietitianData } from '@/lib/pdf/html-template'
import { StepTypeSelection } from './steps/step-type-selection'
import { StepPatientMeasurements } from './steps/step-patient-measurements'
import { StepContentEditor } from './steps/step-content-editor'
import { StepPreview } from './steps/step-preview'

// †”€†”€ Types †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

interface PatientContext {
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

interface DocumentComposerProps {
  /** Existing note for editing (null = create mode) */
  existingNote?: Tables<'clinical_notes'> | null
  /** Pre-loaded patient context (from server component) */
  initialPatient?: PatientContext | null
}

interface DocumentComposerDraft {
  docType: DocumentType
  docTitle: string
  blocks: DocumentBlock[]
  includePatientInfo: boolean
  visitHeight: string
  visitWeight: string
  selectedTemplateId: string | null
}

// †”€†”€ Document type labels †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

const WHATSAPP_LINK_EXPIRY_SECONDS = 60 * 60 * 24 * 7
const WHATSAPP_MAX_UPLOAD_BYTES = 50 * 1024 * 1024

// †”€†”€ Templates †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

interface DocTemplate {
  id: string
  name: string
  blocks: DocumentBlock[]
  createdAt: string
}

function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2)
  return `id-${Date.now()}-${randomPart}`
}

function sanitizeContentBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks
    .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
    .map((b, index) => ({ ...b, order: index }))
}

function normalizeTemplateBlocks(raw: Json): DocumentBlock[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((value, index) => {
      const block = value as Partial<DocumentBlock>
      return {
        id: typeof block.id === 'string' ? block.id : `legacy-${index}`,
        type: block.type === 'meal_section' || block.type === 'instructions' || block.type === 'custom'
          ? block.type
          : 'custom',
        label: typeof block.label === 'string' && block.label.trim() ? block.label : `Section ${index + 1}`,
        content: typeof block.content === 'string' ? block.content : '',
        order: index,
      } satisfies DocumentBlock
    })
}

// †”€†”€ Default blocks per document type †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

function defaultBlocksForType(type: DocumentType): DocumentBlock[] {
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
      return [
        { id: 'quick-note-notes', type: 'custom', label: 'Notes', content: '', order: 0 },
      ]
    case 'custom':
    default:
      return [
        { id: 'custom-content', type: 'custom', label: 'Content', content: '', order: 0 },
      ]
  }
}

// †”€†”€ Helpers †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

function computeAge(dob: string | null): string {
  if (!dob) return 'N/A'
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--
  }
  return `${age} yrs`
}

function computeBMI(weight_kg: number | null, height_cm: number | null): string {
  if (!weight_kg || !height_cm || height_cm === 0) return 'N/A'
  const h = height_cm / 100
  return (weight_kg / (h * h)).toFixed(1)
}

function computeIBW(height_cm: number | null, gender: string | null): string {
  if (!height_cm) return 'N/A'
  const heightInches = height_cm / 2.54
  const excess = Math.max(0, heightInches - 60)
  const ibw =
    gender === 'male' ? 50 + 2.3 * excess
    : gender === 'female' ? 45.5 + 2.3 * excess
    : 47.75 + 2.3 * excess
  return ibw.toFixed(1)
}

function computeWeightDiff(
  weight_kg: number | null,
  height_cm: number | null,
  gender: string | null
): string {
  if (!weight_kg || !height_cm) return 'N/A'
  const ibwStr = computeIBW(height_cm, gender)
  if (ibwStr === 'N/A') return 'N/A'
  const diff = weight_kg - parseFloat(ibwStr)
  return (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg'
}

// †”€†”€ Markdown sanitiser †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
// Strips AI-generated markdown formatting before preview / PDF rendering.
// Kept at module level so it can be used both inside callAI (at source) and
// inside previewContent (as a fallback for existing saved content).
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')              // ## headings
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')    // ***bold-italic***
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold**
    .replace(/\*([^*]+)\*/g, '$1')             // *italic*
    .replace(/_{2}([^_]+)_{2}/g, '$1')         // __bold__
    .replace(/_([^_]+)_/g, '$1')               // _italic_
    .replace(/`{3}[\s\S]*?`{3}/g, '')          // ```code blocks```
    .replace(/`([^`]+)`/g, '$1')               // `inline code`
    .replace(/^[-*+]\s+/gm, '\u2022 ')        // - list  ††’  †€¢ bullet
    .replace(/^\d+\.\s+/gm, '')               // 1. ordered list
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) ††’ text
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1') // escaped chars
    .trim()
}

interface PatientSnapshotData {
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

function buildPatientSnapshotBlock(
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
    primaryGoal: patient.primary_goal ? (GOAL_LABELS[patient.primary_goal as keyof typeof GOAL_LABELS] ?? formatLabel(patient.primary_goal)) : 'N/A',
    activityLevel: patient.activity_level ? (ACTIVITY_LABELS[patient.activity_level as keyof typeof ACTIVITY_LABELS] ?? formatLabel(patient.activity_level)) : 'N/A',
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

// †”€†”€ Component †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€

export function DocumentComposer({
  existingNote,
  initialPatient,
}: DocumentComposerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')
  const isEditMode = !!existingNote

  const [isPending, startTransition] = useTransition()

  // Patient
  const [patient, setPatient] = useState<PatientContext | null>(initialPatient ?? null)

  // Document state
  const [docType, setDocType] = useState<DocumentType>(
    (existingNote?.document_type as DocumentType) ?? 'quick_note'
  )
  const [docTitle, setDocTitle] = useState(existingNote?.title ?? '')
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => {
    if (existingNote?.content) {
      const parsed = existingNote.content as unknown
      if (Array.isArray(parsed)) {
        // Strip legacy internal title/snapshot blocks  -  title is top-level field.
        return sanitizeContentBlocks(parsed as DocumentBlock[])
      }
    }
    return defaultBlocksForType(
      (existingNote?.document_type as DocumentType) ?? 'quick_note'
    )
  })

  // AI state
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)
  // Staged AI result  -  shown in preview only until the user explicitly applies it
  const [aiEnhancedBlocks, setAiEnhancedBlocks] = useState<DocumentBlock[] | null>(null)
  const [aiRawResult, setAiRawResult] = useState<string | null>(null)
  const [aiMeta, setAiMeta] = useState<{ isFallback: boolean; reason?: string } | null>(null)
  const [lastAiAction, setLastAiAction] = useState<'enhance' | 'patient_friendly' | 'suggest' | null>(null)

  // Preview  -  open by default
  const [showPreview, setShowPreview] = useState(true)
  const [includePatientInfo, setIncludePatientInfo] = useState(true)
  // Stable ref to the rendered preview content div  -  used for PDF capture
  const previewContentRef = useRef<HTMLDivElement>(null)

  // Visit measurements  -  stored as strings for controlled inputs
  const [visitHeight, setVisitHeight] = useState<string>('')
  const [visitWeight, setVisitWeight] = useState<string>('')
  // The weight recorded at the start of this session (reference for weight change)
  const [originalWeight, setOriginalWeight] = useState<number | null | undefined>(undefined)
  const [isSavingMeasurements, setIsSavingMeasurements] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)
  const [waPending, setWaPending] = useState(false)
  const [dietitianPDFData, setDietitianPDFData] = useState<PDFDietitianData | null>(null)
  // Templates: loaded from DB per logged-in dietitian
  const [localTemplates, setLocalTemplates] = useState<DocTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  // Wizard step state (1=TYPE  2=PATIENT  3=CONTENT  4=PREVIEW)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  // AI bottom sheet state (mobile step 3)
  const [showAISheet, setShowAISheet] = useState(false)
  const draftKey = `document-composer-draft:${existingNote?.id ?? preselectedPatientId ?? 'new'}`
  const { loadDraft, saveDraft, clearDraft } = useLocalDraft<DocumentComposerDraft>({
    storageKey: draftKey,
    debounceMs: 600,
  })

  useEffect(() => {
    const draft = loadDraft()
    if (!draft) return

    setDocType(draft.docType)
    setDocTitle(draft.docTitle)
    setBlocks(sanitizeContentBlocks(draft.blocks))
    setIncludePatientInfo(draft.includePatientInfo)
    setVisitHeight(draft.visitHeight)
    setVisitWeight(draft.visitWeight)
    setSelectedTemplateId(draft.selectedTemplateId)
  }, [loadDraft])

  useEffect(() => {
    saveDraft({
      docType,
      docTitle,
      blocks: sanitizeContentBlocks(blocks),
      includePatientInfo,
      visitHeight,
      visitWeight,
      selectedTemplateId,
    })
  }, [
    blocks,
    docTitle,
    docType,
    includePatientInfo,
    saveDraft,
    selectedTemplateId,
    visitHeight,
    visitWeight,
  ])

  // Load templates from DB
  useEffect(() => {
    let mounted = true

    const run = async () => {
      const rows = await getDocumentTemplates()
      if (!mounted) return
      setLocalTemplates(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          blocks: normalizeTemplateBlocks(row.blocks),
          createdAt: row.created_at,
        }))
      )
    }

    run()

    return () => {
      mounted = false
    }
  }, [])
  useEffect(() => {
    if (patient) return
    const pid = preselectedPatientId ?? existingNote?.patient_id
    if (!pid) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select(
          'id, full_name, patient_code, phone, gender, date_of_birth, height_cm, weight_kg, activity_level, dietary_type, medical_conditions, food_allergies, primary_goal'
        )
        .eq('id', pid)
        .single()
      if (data) setPatient(data as PatientContext)
    }
    fetchPatient()
  }, [preselectedPatientId, existingNote?.patient_id, patient])

  // †”€†”€ Initialize visit measurements once when patient becomes available †”€†”€
  useEffect(() => {
    if (!patient) return
    setVisitHeight((prev) => prev === '' ? (patient.height_cm?.toString() ?? '') : prev)
    setVisitWeight((prev) => prev === '' ? (patient.weight_kg?.toString() ?? '') : prev)
    setOriginalWeight((prev) => prev !== undefined ? prev : patient.weight_kg)
  }, [patient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // †”€†”€ Block management †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const updateBlockContent = useCallback(
    (blockId: string, content: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, content } : b))
      )
    },
    []
  )

  const updateBlockLabel = useCallback(
    (blockId: string, label: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, label } : b))
      )
    },
    []
  )

  const addBlock = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        id: createId(),
        type: 'custom',
        label: 'New Section',
        content: '',
        order: prev.length,
      },
    ])
  }, [])

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev
        .filter((b) => b.id !== blockId)
        .map((b, i) => ({ ...b, order: i }))
    )
  }, [])

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy.map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  // †”€†”€ Template management †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleSaveTemplate = () => {
    const templateName = docTitle.trim()
    if (!templateName) {
      toast.error('Enter a title first. The title is used as the template name.')
      return
    }

    const contentBlocks = sanitizeContentBlocks(blocks)
    if (contentBlocks.length === 0) {
      toast.error('Add at least one section before saving a template.')
      return
    }

    startTransition(async () => {
      const result = await createDocumentTemplate({
        name: templateName,
        blocks: contentBlocks,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      const rows = await getDocumentTemplates()
      setLocalTemplates(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          blocks: normalizeTemplateBlocks(row.blocks),
          createdAt: row.created_at,
        }))
      )
      toast.success(`Template "${templateName}" saved`)
    })
  }

  const handleLoadTemplate = (tplId: string) => {
    const tpl = localTemplates.find((t) => t.id === tplId)
    if (!tpl) return
    setDocType('custom')
    const sanitized = sanitizeContentBlocks(tpl.blocks)
    setBlocks(sanitized.map((b, i) => ({ ...b, id: createId(), order: i })))
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    setSelectedTemplateId(tplId)
    if (!docTitle.trim()) {
      setDocTitle(tpl.name)
    }
  }

  // †”€†”€ Document type change †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleDocTypeChange = (type: DocumentType) => {
    setSelectedTemplateId(null)
    setDocType(type)
    setBlocks(defaultBlocksForType(type))
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
  }

  // †”€†”€ AI Actions †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  // ── Step navigation helpers ─────────────────────────────────────────────
  // quick_note and custom skip Step 2 (patient measurements) — not needed for these types
  const SKIP_MEASUREMENTS = docType === 'quick_note' || docType === 'custom'

  const handleNextStep = useCallback(() => {
    if (step === 1 && (docType === 'quick_note' || docType === 'custom')) {
      setStep(3)
    } else {
      setStep((s) => Math.min(s + 1, 4) as 1 | 2 | 3 | 4)
    }
  }, [step, docType])

  const handlePrevStep = useCallback(() => {
    if (step === 3 && (docType === 'quick_note' || docType === 'custom')) {
      setStep(1)
    } else {
      setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3 | 4)
    }
  }, [step, docType])

  const callAI = async (action: 'enhance' | 'patient_friendly' | 'suggest') => {
    const contentText = blocks
      .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
      .map((b) => `## ${b.label}\n${b.content}`)
      .join('\n\n')

    if (!contentText.trim() && action !== 'suggest') {
      toast.error('Add some content before using AI.')
      return
    }

    setAiLoading(action)
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    setAiMeta(null)
    setLastAiAction(action)
    try {
      const res = await fetch('/api/ai/enhance-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content: contentText,
          docType,
          docTitle: docTitle.trim() || undefined,
          patientContext: patient
            ? {
                age: computeAge(patient.date_of_birth),
                gender: patient.gender,
                height_cm: (visitHeight && !isNaN(parseFloat(visitHeight))) ? parseFloat(visitHeight) : patient.height_cm,
                weight_kg: (visitWeight && !isNaN(parseFloat(visitWeight))) ? parseFloat(visitWeight) : patient.weight_kg,
                primary_goal: patient.primary_goal,
                activity_level: patient.activity_level,
                dietary_type: patient.dietary_type,
                medical_conditions: patient.medical_conditions?.join(', ') ?? 'None',
                food_allergies: patient.food_allergies?.join(', ') ?? 'None',
              }
            : undefined,
        }),
      })

      const data = (await res.json()) as { result?: string; error?: string; _meta?: { isFallback: boolean; reason?: string } }
      if (!res.ok || data.error) {
        toast.error(data.error ?? 'AI request failed. Please try again.')
        setAiLoading(null)
        return
      }

      setAiMeta(data._meta ?? null)

      if (action === 'suggest') {
        setAiSuggestions(data.result ?? null)
      } else {
        const aiResult = data.result ?? ''
        const normalizeLabel = (label: string) =>
          label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()

        const rawSections = aiResult.split(/^##\s+/m).filter(Boolean)

        // Safety: AI returned unstructured text — for single-block docs apply directly
        if (rawSections.length === 0) {
          const editableForSingle = blocks.filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
          if (editableForSingle.length === 1) {
            const singleEnhanced = blocks.map((b) => {
              if (b.type === 'title' || b.type === 'patient_snapshot') return b
              return { ...b, content: stripMarkdown(aiResult) }
            })
            setAiEnhancedBlocks(singleEnhanced)
            setStep(4)
            toast.success('AI enhancement ready — review below, then apply or discard')
            return
          }
          setAiRawResult(stripMarkdown(aiResult))
          setAiEnhancedBlocks(null)
          setShowPreview(true)
          toast.success('AI output ready — review in preview below')
          return
        }

        // Build label††’content map for label-based matching
        const sectionMap: Record<string, string> = {}
        for (const raw of rawSections) {
          const newlineIdx = raw.indexOf('\n')
          if (newlineIdx === -1) {
            const heading = normalizeLabel(raw.replace(/:$/, '').trim())
            if (heading) sectionMap[heading] = ''
          } else {
            const heading = normalizeLabel(raw.slice(0, newlineIdx).replace(/:$/, '').trim())
            const content = stripMarkdown(raw.slice(newlineIdx + 1).trim())
            if (heading) sectionMap[heading] = content
          }
        }

        const editableBlocks = blocks.filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
        const hasLabelMatches = blocks.some(
          (b) => b.type !== 'title' && normalizeLabel(b.label) in sectionMap
        )

        if (!hasLabelMatches && rawSections.length !== editableBlocks.length) {
          setAiRawResult(stripMarkdown(aiResult))
          setAiEnhancedBlocks(null)
          setShowPreview(true)
          toast.error('AI output format mismatch. Review raw output below and retry.')
          return
        }

        const enhanced = hasLabelMatches
          ? blocks.map((b) => {
              if (b.type === 'title' || b.type === 'patient_snapshot') return b
              const key = normalizeLabel(b.label)
              return key in sectionMap ? { ...b, content: sectionMap[key] } : b
            })
          : (() => {
              // Strict positional fallback only when section counts match.
              const updated = [...blocks]
              let sectionIdx = 0
              for (let i = 0; i < updated.length; i++) {
                if (updated[i].type === 'title' || updated[i].type === 'patient_snapshot') continue
                const raw = rawSections[sectionIdx]
                const newlineIdx = raw.indexOf('\n')
                const content = newlineIdx !== -1 ? raw.slice(newlineIdx + 1).trim() : raw.trim()
                updated[i] = { ...updated[i], content: stripMarkdown(content) }
                sectionIdx++
              }
              return updated
            })()

        // Navigate to Preview step so user can immediately see and review AI output
        setAiEnhancedBlocks(enhanced)
        setStep(4)
        toast.success('AI enhancement ready — review below, then apply or discard')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
      setAiMeta(null)
      setLastAiAction(null)
    } finally {
      setAiLoading(null)
    }
  }

  // †”€†”€ Apply / Discard AI enhanced result †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleApplyAIChanges = useCallback(() => {
    if (!aiEnhancedBlocks) return
    setBlocks(aiEnhancedBlocks)
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    toast.success('Changes applied')
  }, [aiEnhancedBlocks])

  const handleDiscardAIChanges = useCallback(() => {
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    setAiMeta(null)
    toast('AI changes discarded')
  }, [])

  // †”€†”€ Download PDF †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleDownloadPDF = async () => {
    if (!patient) { toast.error('No patient selected'); return }
    if (!docTitle.trim()) { toast.error('Please enter a document title'); return }

    setPdfPending(true)
    try {
      const [saveResult, dtData] = await Promise.all([performSave(), fetchDietitianData()])
      if (saveResult.error) { toast.error(saveResult.error); return }

      const previewBlks = aiEnhancedBlocks ?? blocks
      await downloadPDFFromServer({
        docTitle,
        documentType: docType,
        dietitian: dtData,
        patientSnapshot: includePatientInfo ? liveSnapshotData : null,
        blocks: previewBlks.filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot'),
      })
      clearDraft()
      toast.success('PDF downloaded successfully')
      router.push(`/patients/${patient.id}?tab=notes`)
      router.refresh()
    } catch (err) {
      console.error('[PDF] generation error:', err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfPending(false)
    }
  }

  // †”€†”€ Send via WhatsApp †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleWhatsApp = async () => {
    if (!patient) { toast.error('No patient selected'); return }
    if (!docTitle.trim()) { toast.error('Please enter a document title'); return }
    if (!patient.phone) { toast.error('No phone number on file for this patient'); return }

    setWaPending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session expired. Please sign in again.')
        return
      }

      const [saveResult, dtData] = await Promise.all([performSave(), fetchDietitianData()])
      if (saveResult.error) { toast.error(saveResult.error); return }

      const previewBlks = aiEnhancedBlocks ?? blocks
      const { blob: pdfBlob, filename: baseFilename } = await generatePDFBlobFromServer({
        docTitle,
        documentType: docType,
        dietitian: dtData,
        patientSnapshot: includePatientInfo ? liveSnapshotData : null,
        blocks: previewBlks.filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot'),
      })

      if (pdfBlob.size > WHATSAPP_MAX_UPLOAD_BYTES) {
        const currentMB = (pdfBlob.size / (1024 * 1024)).toFixed(1)
        toast.error(`Generated PDF is too large (${currentMB} MB). Please shorten the document and try again.`)
        return
      }

      const fileName = `${baseFilename}.pdf`
      const objectPath = `${user.id}/${patient.id}/${Date.now()}_${fileName}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(objectPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('[WhatsApp] document upload failed:', {
          message: uploadError.message,
          name: uploadError.name,
          objectPath,
        })
        const reason = uploadError.message?.trim()
          ? ` (${uploadError.message})`
          : ''
        toast.error(`Document upload failed. Please try again.${reason}`)
        return
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(objectPath, WHATSAPP_LINK_EXPIRY_SECONDS)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        toast.error('Unable to generate secure document link. Please try again.')
        return
      }

      const { data: documentRow, error: documentInsertError } = await supabase
        .from('documents')
        .insert({
          dietitian_id: user.id,
          patient_id: patient.id,
          file_url: objectPath,
          file_name: fileName,
          file_type: 'application/pdf',
          file_size_bytes: pdfBlob.size,
        })
        .select('id')
        .single()

      if (documentInsertError) {
        toast.error('Document metadata could not be saved. Please try again.')
        return
      }

      const { error: timelineError } = await supabase.from('timeline_events').insert({
        dietitian_id: user.id,
        patient_id: patient.id,
        event_type: 'clinical_document_created',
        event_data: {
          title: docTitle.trim(),
          file_name: fileName,
          delivery_channel: 'whatsapp',
          storage_bucket: 'documents',
          storage_path: objectPath,
          link_expires_in_days: 7,
          note: 'Clinical document sent via WhatsApp',
        } as unknown as Json,
        reference_id: documentRow.id,
      })

      if (timelineError) {
        console.error('[WhatsApp] timeline insert failed:', timelineError)
      }

      const phone = patient.phone.replace(/\D/g, '')
      const clinicDisplay = dtData.clinicName || 'our clinic'
      const docLabel = docType === 'meal_plan' ? 'diet plan'
        : docType === 'follow_up_recommendation' ? 'follow-up document'
        : docType === 'quick_note' ? 'clinical note'
        : 'document'
      const message =
        `Hello ${patient.full_name},\n\nYour ${docLabel} from ${clinicDisplay} is ready.\n\nDownload it securely here: ${signedUrlData.signedUrl}\n\nThis link expires in 7 days.\n\nGenerated by ${dtData.name}`
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer'
      )
      clearDraft()
      toast.success('Document saved, uploaded, and WhatsApp opened.')
      router.push(`/patients/${patient.id}?tab=notes`)
      router.refresh()
    } catch (err) {
      console.error('[WhatsApp] share flow failed:', err)
      toast.error('Failed to share via WhatsApp. Please try again.')
    } finally {
      setWaPending(false)
    }
  }

  // †”€†”€ Save visit measurements to patient profile †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleSaveMeasurements = async () => {
    if (!patient) return
    const h = visitHeight.trim() ? parseFloat(visitHeight) : undefined
    const w = visitWeight.trim() ? parseFloat(visitWeight) : undefined

    if (h !== undefined && (isNaN(h) || h < 50 || h > 270)) {
      toast.error('Enter a valid height between 50 and 270 cm')
      return
    }
    if (w !== undefined && (isNaN(w) || w < 20 || w > 350)) {
      toast.error('Enter a valid weight between 20 and 350 kg')
      return
    }

    const updates: { height_cm?: number; weight_kg?: number } = {}
    if (h !== undefined && h !== patient.height_cm) updates.height_cm = h
    if (w !== undefined && w !== patient.weight_kg) updates.weight_kg = w

    if (Object.keys(updates).length === 0) {
      toast('Measurements match what is already on file')
      return
    }

    setIsSavingMeasurements(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Session expired'); return }

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patient.id)
        .eq('dietitian_id', user.id)

      if (error) { toast.error('Failed to save measurements. Please try again.'); return }

      // Timeline event for weight change
      if (updates.weight_kg !== undefined) {
        const prevW = patient.weight_kg ?? 0
        const newW = updates.weight_kg
        const diff = newW - prevW
        const sign = diff >= 0 ? '+' : ''
        await supabase.from('timeline_events').insert({
          dietitian_id: user.id,
          patient_id: patient.id,
          event_type: 'weight_updated',
          event_data: {
            previous_weight_kg: prevW,
            new_weight_kg: newW,
            change: `${sign}${diff.toFixed(1)} kg`,
            note: `Weight updated: ${prevW} kg to ${newW} kg (${sign}${diff.toFixed(1)} kg)`,
          } as unknown as Json,
        })
      }

      // Reflect updates in local patient state so BMI/IBW/snapshot recalculate
      setPatient((prev) => prev ? { ...prev, ...updates } : prev)
      toast.success('Measurements saved')
    } catch {
      toast.error('Failed to save measurements. Please try again.')
    } finally {
      setIsSavingMeasurements(false)
    }
  }

  // †”€†”€ Lazy-fetch dietitian profile (for PDF header / footer) †”€†”€†”€†”€†”€†”€†”€†”€†”€
  const fetchDietitianData = async (): Promise<PDFDietitianData> => {
    if (dietitianPDFData) return dietitianPDFData
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [d, p, pr] = await Promise.all([
      supabase.from('dietitians').select('full_name, phone, email').eq('id', user!.id).single(),
      supabase.from('dietitian_professional').select('primary_qualification, registration_number').eq('dietitian_id', user!.id).single(),
      supabase.from('dietitian_practice').select('clinic_name, practice_address, city, state, logo_url').eq('dietitian_id', user!.id).single(),
    ])
    const addressParts = [pr.data?.practice_address, pr.data?.city, pr.data?.state].filter(Boolean)
    const data: PDFDietitianData = {
      name: d.data?.full_name ?? '',
      qualification: p.data?.primary_qualification ?? '',
      licenseNumber: p.data?.registration_number ?? '',
      clinicName: pr.data?.clinic_name ?? '',
      address: addressParts.join(', '),
      phone: d.data?.phone ?? '',
      email: d.data?.email ?? user?.email ?? '',
      logoUrl: pr.data?.logo_url ?? '',
    }
    setDietitianPDFData(data)
    return data
  }

  // †”€†”€ Shared: build the save payload (used by all three save actions) †”€
  const buildSavePayload = () => {
    if (!patient || !docTitle.trim()) return null
    const contentBlocks = sanitizeContentBlocks(blocks)
    const vH = visitHeight && !isNaN(parseFloat(visitHeight)) ? parseFloat(visitHeight) : undefined
    const vW = visitWeight && !isNaN(parseFloat(visitWeight)) ? parseFloat(visitWeight) : undefined
    const snapshotBlock = buildPatientSnapshotBlock(patient, {
      visitHeight: vH,
      visitWeight: vW,
      previousWeight: originalWeight !== undefined ? originalWeight : undefined,
    })
    return {
      patient_id: patient.id,
      document_type: docType,
      title: docTitle.trim(),
      blocks: includePatientInfo ? [snapshotBlock, ...contentBlocks] : contentBlocks,
    }
  }

  // †”€†”€ Perform save without navigation (shared by all three actions) †”€†”€†”€†”€
  const performSave = async (): Promise<{ error?: string }> => {
    const payload = buildSavePayload()
    if (!payload) return { error: 'Missing patient or document title' }
    return isEditMode
      ? updateClinicalNote(existingNote!.id, payload)
      : createClinicalNote(payload)
  }

  // †”€†”€ Save †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const handleSave = () => {
    if (!patient) {
      toast.error('No patient selected')
      return
    }
    if (!docTitle.trim()) {
      toast.error('Please enter a document title')
      return
    }
    startTransition(async () => {
      const result = await performSave()
      if (result.error) {
        toast.error(result.error)
        return
      }
      clearDraft()
      toast.success(isEditMode ? 'Document updated successfully' : 'Document saved successfully')
      router.push(`/patients/${patient.id}?tab=notes`)
      router.refresh()
    })
  }

  // †”€†”€ Compose content for preview †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  // When AI has a staged result, the preview shows it; the editor blocks are untouched
  const previewBlocks = aiEnhancedBlocks ?? blocks
  const previewContent = previewBlocks
    .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
    .map(
      (b) => {
        const safe = b.content ? stripMarkdown(b.content) : ''
        const display = safe || '<span class="text-muted-foreground italic">Empty</span>'
        return `<div class="pdf-section" data-pdf-block="section"><h3 class="font-semibold text-sm mt-4 mb-1">${b.label}</h3><p class="text-sm whitespace-pre-wrap">${display}</p></div>`
      }
    )
    .join('')

  // Parsed visit measurements for snapshot + preview (recomputed each render)
  const visitH = visitHeight && !isNaN(parseFloat(visitHeight)) ? parseFloat(visitHeight) : undefined
  const visitW = visitWeight && !isNaN(parseFloat(visitWeight)) ? parseFloat(visitWeight) : undefined
  const liveSnapshotData: PatientSnapshotData | null = patient
    ? (JSON.parse(buildPatientSnapshotBlock(patient, {
        visitHeight: visitH,
        visitWeight: visitW,
        previousWeight: originalWeight !== undefined ? originalWeight : undefined,
      }).content) as PatientSnapshotData)
    : null


  // †”€†”€ Step labels †”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€†”€
  const STEP_LABELS = ['TYPE', 'PATIENT', 'CONTENT', 'PREVIEW'] as const

  return (
    <div className="max-w-3xl mx-auto pb-36 lg:pb-10">

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Progress Bar †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className="mb-6 px-1">
        <div className="flex gap-1.5 mb-2">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                step > i + 1 ? 'bg-primary' : step === i + 1 ? 'bg-primary' : 'bg-primary/20'
              )}
            />
          ))}
        </div>
        <div className="flex">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <span className={cn(
                'text-[10px] font-medium tracking-wide',
                step === i + 1 ? 'text-primary font-semibold' : 'text-primary/40'
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Step 1: Document Type †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className={cn(step !== 1 && 'hidden')}>
        <StepTypeSelection
          docType={docType}
          docTitle={docTitle}
          includePatientInfo={includePatientInfo}
          selectedTemplateId={selectedTemplateId}
          localTemplates={localTemplates}
          onDocTypeChange={(v) => {
            const isTemplate = localTemplates.some((t) => t.id === v)
            if (isTemplate) handleLoadTemplate(v)
            else { setSelectedTemplateId(null); handleDocTypeChange(v as DocumentType) }
          }}
          onTitleChange={setDocTitle}
          onIncludePatientInfoChange={setIncludePatientInfo}
        />
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Step 2: Patient + Measurements †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className={cn(step !== 2 && 'hidden')}>
        <StepPatientMeasurements
          patient={patient}
          visitHeight={visitHeight}
          visitWeight={visitWeight}
          originalWeight={originalWeight}
          isSavingMeasurements={isSavingMeasurements}
          onVisitHeightChange={setVisitHeight}
          onVisitWeightChange={setVisitWeight}
          onSaveMeasurements={handleSaveMeasurements}
        />
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Step 3: Document Content †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className={cn(step !== 3 && 'hidden')}>
        <StepContentEditor
          blocks={blocks}
          onUpdateContent={updateBlockContent}
          onUpdateLabel={updateBlockLabel}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onMoveBlock={moveBlock}
          aiLoading={aiLoading}
          aiSuggestions={aiSuggestions}
          aiEnhancedBlocks={aiEnhancedBlocks}
          aiRawResult={aiRawResult}
          aiMeta={aiMeta}
          lastAiAction={lastAiAction}
          showAISheet={showAISheet}
          step={step}
          onCallAI={callAI}
          onApplyAI={handleApplyAIChanges}
          onDiscardAI={handleDiscardAIChanges}
          onSetAiSuggestions={setAiSuggestions}
          onToggleAISheet={setShowAISheet}
        />
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Step 4: Preview †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className={cn(step !== 4 && 'hidden')}>
        <StepPreview
          docTitle={docTitle}
          docType={docType}
          includePatientInfo={includePatientInfo}
          liveSnapshotData={liveSnapshotData}
          previewContent={previewContent}
          previewContentRef={previewContentRef}
          aiEnhancedBlocks={aiEnhancedBlocks}
          aiRawResult={aiRawResult}
          isPending={isPending}
          pdfPending={pdfPending}
          waPending={waPending}
          patient={patient}
          onSaveTemplate={handleSaveTemplate}
          onDownloadPDF={handleDownloadPDF}
          onWhatsApp={handleWhatsApp}
        />
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Desktop inline nav (all steps) †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className="hidden lg:flex items-center justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => step === 1 ? router.back() : handlePrevStep()}
          className="gap-2 rounded-full px-6"
        >
          {step === 1 ? 'Cancel' : (<><ArrowLeft className="h-4 w-4" /> Back</>)}
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            onClick={handleNextStep}
            className="gap-2 rounded-full px-8 bg-primary hover:bg-primary/85 text-white"
          >
            {step === 1
              ? SKIP_MEASUREMENTS ? 'Next: Content' : 'Next: Patient'
              : step === 2 ? 'Next: Content'
              : 'Next: Preview'}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isPending || pdfPending || waPending || !patient}
            onClick={handleSave}
            className="gap-2 rounded-full px-8 bg-primary hover:bg-primary/85 text-white"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Document</>}
          </Button>
        )}
      </div>

      {/* †•†•†•†•†•†•†•†•†•†•†•†•†•†• Mobile fixed bottom nav †•†•†•†•†•†•†•†•†•†•†•†•†•†• */}
      <div className="fixed inset-x-0 bottom-16 z-50 lg:hidden bg-white border-t border-outline-variant shadow-lg px-4 py-3">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => step === 1 ? router.back() : handlePrevStep()}
            className="flex-1 h-12 rounded-xl border-primary/30 text-primary font-semibold gap-2"
          >
            {step === 1 ? 'Cancel' : (<><ArrowLeft className="h-4 w-4" /> Back</>)}
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/85 text-white font-semibold"
            >
              {step === 1
                ? SKIP_MEASUREMENTS ? 'Next: Content' : 'Next: Patient'
                : step === 2 ? 'Next: Content'
                : 'Next: Preview'}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending || pdfPending || waPending || !patient}
              onClick={handleSave}
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/85 text-white font-semibold gap-2"
            >
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Document</>}
            </Button>
          )}
        </div>
      </div>

    </div>
  )
}
