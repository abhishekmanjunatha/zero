'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Sparkles,
  Heart,
  Lightbulb,
  Eye,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Ruler,
  CheckCircle2,
  RotateCcw,
  Download,
  MessageCircle,
  BookmarkPlus,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { createClinicalNote, updateClinicalNote } from '@/actions/clinical-notes'
import { createDocumentTemplate, getDocumentTemplates } from '@/actions/templates'
import { useLocalDraft } from '@/hooks/use-local-draft'
import type { DocumentType, DocumentBlock } from '@/types/app'
import type { Tables, Json } from '@/types/database'
import { downloadDocumentAsPDF, generateDocumentAsPDFBlob, type DietitianPDFData } from '@/lib/pdf-generator'

// ── Types ──────────────────────────────────────────────────────────────────

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
  medical_conditions: string[] | null
  food_allergies: string[] | null
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

// ── Document type labels ───────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  quick_note: 'Quick Note',
  meal_plan: 'Meal Plan',
  follow_up_recommendation: 'Follow-up Recommendation',
  custom: 'Custom Document',
}

const WHATSAPP_LINK_EXPIRY_SECONDS = 60 * 60 * 24 * 7
const WHATSAPP_MAX_UPLOAD_BYTES = 50 * 1024 * 1024

// ── Templates ────────────────────────────────────────────────────────────────

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

// ── Default blocks per document type ───────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Markdown sanitiser ───────────────────────────────────────────────────────
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
    .replace(/^[-*+]\s+/gm, '\u2022 ')        // - list  →  • bullet
    .replace(/^\d+\.\s+/gm, '')               // 1. ordered list
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
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

// ── Component ──────────────────────────────────────────────────────────────

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
    (existingNote?.document_type as DocumentType) ?? 'meal_plan'
  )
  const [docTitle, setDocTitle] = useState(existingNote?.title ?? '')
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => {
    if (existingNote?.content) {
      const parsed = existingNote.content as unknown
      if (Array.isArray(parsed)) {
        // Strip legacy internal title/snapshot blocks — title is top-level field.
        return sanitizeContentBlocks(parsed as DocumentBlock[])
      }
    }
    return defaultBlocksForType(
      (existingNote?.document_type as DocumentType) ?? 'meal_plan'
    )
  })

  // AI state
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)
  // Staged AI result — shown in preview only until the user explicitly applies it
  const [aiEnhancedBlocks, setAiEnhancedBlocks] = useState<DocumentBlock[] | null>(null)
  const [aiRawResult, setAiRawResult] = useState<string | null>(null)
  const [aiMeta, setAiMeta] = useState<{ isFallback: boolean; reason?: string } | null>(null)
  const [lastAiAction, setLastAiAction] = useState<'enhance' | 'patient_friendly' | 'suggest' | null>(null)

  // Preview — open by default
  const [showPreview, setShowPreview] = useState(true)
  const [includePatientInfo, setIncludePatientInfo] = useState(true)
  // Stable ref to the rendered preview content div — used for PDF capture
  const previewContentRef = useRef<HTMLDivElement>(null)

  // Visit measurements — stored as strings for controlled inputs
  const [visitHeight, setVisitHeight] = useState<string>('')
  const [visitWeight, setVisitWeight] = useState<string>('')
  // The weight recorded at the start of this session (reference for weight change)
  const [originalWeight, setOriginalWeight] = useState<number | null | undefined>(undefined)
  const [isSavingMeasurements, setIsSavingMeasurements] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)
  const [waPending, setWaPending] = useState(false)
  const [dietitianPDFData, setDietitianPDFData] = useState<DietitianPDFData | null>(null)
  // Templates: loaded from DB per logged-in dietitian
  const [localTemplates, setLocalTemplates] = useState<DocTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
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

  // ── Initialize visit measurements once when patient becomes available ──
  useEffect(() => {
    if (!patient) return
    setVisitHeight((prev) => prev === '' ? (patient.height_cm?.toString() ?? '') : prev)
    setVisitWeight((prev) => prev === '' ? (patient.weight_kg?.toString() ?? '') : prev)
    setOriginalWeight((prev) => prev !== undefined ? prev : patient.weight_kg)
  }, [patient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Block management ────────────────────────────────────────────────
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

  // ── Template management ─────────────────────────────────────────────
  const handleSaveTemplate = () => {
    if (docType !== 'custom') {
      toast.error('Save as Template is available only for Custom Document type')
      return
    }

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

  // ── Document type change ────────────────────────────────────────────
  const handleDocTypeChange = (type: DocumentType) => {
    setSelectedTemplateId(null)
    setDocType(type)
    // Only reset blocks if all content is empty (fresh start)
    const hasContent = blocks.some((b) => b.content.trim())
    if (!hasContent) {
      setBlocks(defaultBlocksForType(type))
      setAiEnhancedBlocks(null)
      setAiRawResult(null)
    }
  }

  // ── AI Actions ──────────────────────────────────────────────────────
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

        // Safety: AI returned unstructured text — show raw output only, never touch blocks
        if (rawSections.length === 0) {
          setAiRawResult(stripMarkdown(aiResult))
          setAiEnhancedBlocks(null)
          setShowPreview(true)
          toast.success('AI output ready — review in preview below')
          return
        }

        // Build label→content map for label-based matching
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

        // Stage in preview — original editor blocks remain unchanged
        setAiEnhancedBlocks(enhanced)
        setShowPreview(true)
        toast.success('AI enhancement ready — review in preview, then apply')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
      setAiMeta(null)
      setLastAiAction(null)
    } finally {
      setAiLoading(null)
    }
  }

  // ── Apply / Discard AI enhanced result ──────────────────────────────
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

  // ── Download PDF ────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!patient) { toast.error('No patient selected'); return }
    if (!docTitle.trim()) { toast.error('Please enter a document title'); return }

    // Ensure the preview section is open so the DOM node is mounted
    if (!showPreview) {
      setShowPreview(true)
      // Wait one tick for React to flush the state update and mount the element
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
    }

    const previewEl = previewContentRef.current
    if (!previewEl) {
      toast.error('Preview is not available — please expand the preview section and try again.')
      return
    }

    setPdfPending(true)
    try {
      const [saveResult, dtData] = await Promise.all([performSave(), fetchDietitianData()])
      if (saveResult.error) { toast.error(saveResult.error); return }

      await downloadDocumentAsPDF({
        docTitle,
        dietitian: dtData,
        previewElement: previewEl,
      })
      clearDraft()
      toast.success('PDF downloaded successfully')
      router.push(`/patients/${patient.id}`)
      router.refresh()
    } catch (err) {
      console.error('[PDF] generation error:', err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfPending(false)
    }
  }

  // ── Send via WhatsApp ────────────────────────────────────────────────
  const handleWhatsApp = async () => {
    if (!patient) { toast.error('No patient selected'); return }
    if (!docTitle.trim()) { toast.error('Please enter a document title'); return }
    if (!patient.phone) { toast.error('No phone number on file for this patient'); return }

    // Ensure the preview section is open so the DOM node is mounted
    if (!showPreview) {
      setShowPreview(true)
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
    }

    const previewEl = previewContentRef.current
    if (!previewEl) {
      toast.error('Preview is not available — please expand the preview section and try again.')
      return
    }

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

      const { blob: pdfBlob, filename: baseFilename } = await generateDocumentAsPDFBlob({
        docTitle,
        dietitian: dtData,
        previewElement: previewEl,
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
      const message =
        `Hello ${patient.full_name},\n\nYour diet plan from ${clinicDisplay} is ready.\n\nDownload it securely here: ${signedUrlData.signedUrl}\n\nThis link expires in 7 days.\n\nGenerated by ${dtData.name}`
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer'
      )
      clearDraft()
      toast.success('Document saved, uploaded, and WhatsApp opened.')
      router.push(`/patients/${patient.id}`)
      router.refresh()
    } catch (err) {
      console.error('[WhatsApp] share flow failed:', err)
      toast.error('Failed to share via WhatsApp. Please try again.')
    } finally {
      setWaPending(false)
    }
  }

  // ── Save visit measurements to patient profile ────────────────────────
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
            note: `Weight updated: ${prevW} kg → ${newW} kg (${sign}${diff.toFixed(1)} kg)`,
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

  // ── Lazy-fetch dietitian profile (for PDF header / footer) ─────────
  const fetchDietitianData = async (): Promise<DietitianPDFData> => {
    if (dietitianPDFData) return dietitianPDFData
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [d, p, pr] = await Promise.all([
      supabase.from('dietitians').select('full_name, phone, email').eq('id', user!.id).single(),
      supabase.from('dietitian_professional').select('primary_qualification, registration_number').eq('dietitian_id', user!.id).single(),
      supabase.from('dietitian_practice').select('clinic_name, practice_address, city, state, logo_url').eq('dietitian_id', user!.id).single(),
    ])
    const addressParts = [pr.data?.practice_address, pr.data?.city, pr.data?.state].filter(Boolean)
    const data: DietitianPDFData = {
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

  // ── Shared: build the save payload (used by all three save actions) ─
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

  // ── Perform save without navigation (shared by all three actions) ────
  const performSave = async (): Promise<{ error?: string }> => {
    const payload = buildSavePayload()
    if (!payload) return { error: 'Missing patient or document title' }
    return isEditMode
      ? updateClinicalNote(existingNote!.id, payload)
      : createClinicalNote(payload)
  }

  // ── Save ─────────────────────────────────────────────────────────────
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
      router.push(`/patients/${patient.id}`)
      router.refresh()
    })
  }

  // ── Compose content for preview ─────────────────────────────────────
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

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ══════════════ Section 1: Document Type ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={selectedTemplateId ?? docType}
                onValueChange={(v) => {
                  if (!v) return
                  const isTemplate = localTemplates.some((t) => t.id === v)
                  if (isTemplate) {
                    handleLoadTemplate(v)
                  } else {
                    setSelectedTemplateId(null)
                    handleDocTypeChange(v as DocumentType)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <span className="text-sm">
                    {selectedTemplateId
                      ? (localTemplates.find((t) => t.id === selectedTemplateId)?.name ?? DOC_TYPE_LABELS[docType] ?? docType)
                      : (DOC_TYPE_LABELS[docType] ?? docType)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick_note">Quick Note</SelectItem>
                  <SelectItem value="meal_plan">Meal Plan</SelectItem>
                  <SelectItem value="follow_up_recommendation">Follow-up Recommendation</SelectItem>
                  <SelectItem value="custom">Custom Document</SelectItem>
                  {localTemplates.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        Custom Templates
                      </div>
                      {localTemplates
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                placeholder="e.g. Weight Loss Meal Plan – Week 1"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-md border bg-muted/20 p-3">
            <Checkbox
              id="include-patient-info"
              checked={includePatientInfo}
              onCheckedChange={(checked) => setIncludePatientInfo(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="include-patient-info" className="cursor-pointer">
                Include Patient Information in document print/PDF
              </Label>
              <p className="text-xs text-muted-foreground">
                Enabled by default. Uncheck for quick notes or custom documents where patient details are not needed.
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ══════════════ Section 2: Patient Context ══════════════ */}
      {patient && (
        <CollapsibleSection
          title={patient.full_name}
          subtitle={`${patient.patient_code} · ${patient.phone}`}
          icon={
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User className="h-5 w-5" />
            </div>
          }
          className="clay-card"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Age', value: computeAge(patient.date_of_birth) },
              { label: 'Gender', value: patient.gender ?? 'N/A' },
              {
                label: 'Height',
                value: patient.height_cm ? `${patient.height_cm} cm` : 'N/A',
              },
              {
                label: 'Weight',
                value: patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A',
              },
              { label: 'Primary Goal', value: patient.primary_goal ?? 'N/A' },
              {
                label: 'Activity Level',
                value: patient.activity_level?.replace(/_/g, ' ') ?? 'N/A',
              },
              { label: 'Dietary Type', value: patient.dietary_type ?? 'N/A' },
              {
                label: 'Medical Conditions',
                value: patient.medical_conditions?.join(', ') || 'None',
              },
              {
                label: 'Food Allergies',
                value: patient.food_allergies?.join(', ') || 'None',
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium capitalize">{item.value}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ══════════════ Section 2b: Visit Measurements ══════════════ */}
      {patient && (
        <CollapsibleSection
          title="Visit Measurements"
          subtitle="Record today's anthropometry and save timeline updates"
          icon={<Ruler className="h-4 w-4 text-primary" />}
          className="clay-card"
          defaultOpen={false}
          contentClassName="space-y-4"
        >
            <p className="text-xs text-muted-foreground">
              Record today&apos;s measurements. Click <strong>Save Measurements</strong> to update the patient profile and log the weight change to the timeline.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visit-height">Height (cm)</Label>
                <Input
                  id="visit-height"
                  type="number"
                  min={50}
                  max={270}
                  step={0.1}
                  placeholder={patient.height_cm?.toString() ?? 'e.g. 165'}
                  value={visitHeight}
                  onChange={(e) => setVisitHeight(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="visit-weight">Weight (kg)</Label>
                  {visitWeight && patient.weight_kg !== null &&
                    !isNaN(parseFloat(visitWeight)) &&
                    Math.abs(parseFloat(visitWeight) - (patient.weight_kg ?? 0)) > 0.01 && (
                    <span className={cn(
                      'text-xs font-medium',
                      parseFloat(visitWeight) < (patient.weight_kg ?? 0) ? 'text-primary' : 'text-amber-600'
                    )}>
                      {parseFloat(visitWeight) < (patient.weight_kg ?? 0) ? '▼' : '▲'}{' '}
                      {Math.abs(parseFloat(visitWeight) - (patient.weight_kg ?? 0)).toFixed(1)} kg
                    </span>
                  )}
                </div>
                <Input
                  id="visit-weight"
                  type="number"
                  min={20}
                  max={350}
                  step={0.1}
                  placeholder={patient.weight_kg?.toString() ?? 'e.g. 65'}
                  value={visitWeight}
                  onChange={(e) => setVisitWeight(e.target.value)}
                />
                {originalWeight !== undefined && originalWeight !== null && (
                  <p className="text-xs text-muted-foreground">Previous: {originalWeight} kg</p>
                )}
              </div>
            </div>

            {/* Live BMI / IBW preview */}
            {visitWeight && visitHeight &&
              !isNaN(parseFloat(visitWeight)) && !isNaN(parseFloat(visitHeight)) && (
              <div className="flex flex-wrap gap-4 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  BMI:{' '}
                  <strong className="text-foreground">
                    {computeBMI(parseFloat(visitWeight), parseFloat(visitHeight))}
                  </strong>
                </span>
                <span>
                  Ideal Body Weight:{' '}
                  <strong className="text-foreground">
                    {computeIBW(parseFloat(visitHeight), patient.gender) !== 'N/A'
                      ? `${computeIBW(parseFloat(visitHeight), patient.gender)} kg`
                      : 'N/A'}
                  </strong>
                </span>
                {visitWeight && originalWeight != null && !isNaN(parseFloat(visitWeight)) && (
                  <span>
                    Change from last visit:{' '}
                    <strong className={cn(
                      parseFloat(visitWeight) < originalWeight ? 'text-primary' : 'text-amber-600'
                    )}>
                      {parseFloat(visitWeight) === originalWeight
                        ? 'No change'
                        : `${parseFloat(visitWeight) > originalWeight ? '+' : ''}${(parseFloat(visitWeight) - originalWeight).toFixed(1)} kg`}
                    </strong>
                  </span>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingMeasurements}
              onClick={handleSaveMeasurements}
              className="gap-1.5"
            >
              {isSavingMeasurements ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Save Measurements</>
              )}
            </Button>
        </CollapsibleSection>
      )}

      {/* ══════════════ Section 3: Structured Document Editor ══════════════ */}
      <CollapsibleSection
        title="Document Content"
        subtitle="Build and reorder sections for this document"
        count={blocks.length}
        className="clay-card"
        defaultOpen
        contentClassName="space-y-2.5"
      >
        <div className="mb-2.5 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addBlock}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Section
          </Button>
        </div>
          {blocks.map((block, idx) => {
            return (
            <div
              key={block.id}
              className="group rounded-lg border bg-background px-3 py-2.5 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input
                  value={block.label}
                  onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                  className="h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1"
                  placeholder="Section name"
                />
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1 hover:bg-destructive/10 text-destructive"
                      title="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                placeholder={
                    block.type === 'instructions'
                      ? 'e.g. Drink 3L water daily, avoid refined sugar…'
                      : `Enter ${block.label.toLowerCase()} details…`
                }
                  rows={4}
                className="resize-none"
              />
            </div>
          )
        })}
      </CollapsibleSection>

      {/* ══════════════ Section 4: AI Assistance ══════════════ */}
      <CollapsibleSection
        title="AI Assistance"
        subtitle="Enhance, simplify, or suggest plan content"
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        className="clay-card"
        defaultOpen={false}
        contentClassName="space-y-3"
      >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('enhance')}
            >
              {aiLoading === 'enhance' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              {aiLoading === 'enhance' ? 'Enhancing…' : 'Enhance with AI'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('patient_friendly')}
            >
              {aiLoading === 'patient_friendly' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart className="h-3.5 w-3.5 text-pink-500" />
              )}
              {aiLoading === 'patient_friendly' ? 'Formatting…' : 'Format for Patient'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('suggest')}
            >
              {aiLoading === 'suggest' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              )}
              {aiLoading === 'suggest' ? 'Generating…' : 'AI Suggestions'}
            </Button>
          </div>

          {/* AI fallback warning */}
          {aiMeta?.isFallback === true && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  AI could not fully process this. Showing limited or fallback results.
                </p>
                {aiMeta.reason && ['timeout', 'parse_failed', 'invalid_structure'].includes(aiMeta.reason) && (
                  <p className="text-xs text-amber-700 mt-0.5 capitalize">
                    Reason: {aiMeta.reason.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
              {lastAiAction && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => callAI(lastAiAction)}
                  disabled={aiLoading !== null}
                >
                  {aiLoading !== null ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Retry AI
                </Button>
              )}
            </div>
          )}

          {aiSuggestions && (
            <div className="rounded-lg border bg-amber-50 p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-amber-800 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4" />
                  AI Suggestions
                </p>
                <button
                  type="button"
                  onClick={() => setAiSuggestions(null)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="whitespace-pre-wrap text-amber-900">{aiSuggestions}</div>
            </div>
          )}

          {/* AI enhancement pending — Apply or Discard */}
          {(aiEnhancedBlocks || aiRawResult) && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-primary">AI enhancement ready</p>
              </div>
              <p className="text-xs text-primary/85">
                Your original content is unchanged. Review the preview below, then decide.
              </p>
              <div className="flex items-center gap-2">
                {aiEnhancedBlocks && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyAIChanges}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Apply AI Changes
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardAIChanges}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
              </div>
            </div>
          )}
      </CollapsibleSection>

      {/* ══════════════ Section 5: Document Preview ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowPreview((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Document Preview
            </CardTitle>
            {showPreview ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div ref={previewContentRef} className="clay-card p-6 space-y-4">
              {/* AI indicator banner */}
              {(aiEnhancedBlocks || aiRawResult) && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-primary/90">
                    {aiRawResult
                      ? 'AI output (unstructured) — editor unchanged'
                      : 'AI Enhanced Preview — your editor content is unchanged'}
                  </span>
                </div>
              )}

              {/* Document title */}
              <h2 className="text-xl font-bold leading-tight">
                {docTitle || <span className="text-muted-foreground italic font-normal text-base">Untitled Document</span>}
              </h2>

              {/* Patient snapshot header */}
              {includePatientInfo && liveSnapshotData && (
                <div className="rounded-md border bg-slate-50 p-4 space-y-3" data-pdf-block="section">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Patient Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    {[
                      { label: 'Name', value: liveSnapshotData.name },
                      { label: 'Age', value: liveSnapshotData.age },
                      { label: 'Gender', value: liveSnapshotData.gender },
                      { label: 'Height', value: liveSnapshotData.height },
                      { label: 'Current Weight', value: liveSnapshotData.weight },
                      { label: 'BMI', value: liveSnapshotData.bmi },
                      { label: 'Ideal Body Weight', value: liveSnapshotData.ibw },
                      { label: 'Weight Difference', value: liveSnapshotData.weightDiff },
                      { label: 'Previous Visit Weight', value: liveSnapshotData.previousWeight },
                      { label: 'Weight Change (This Visit)', value: liveSnapshotData.weightChange },
                      { label: 'Primary Goal', value: liveSnapshotData.primaryGoal },
                      { label: 'Activity Level', value: liveSnapshotData.activityLevel },
                      { label: 'Medical Conditions', value: liveSnapshotData.medicalConditions },
                      { label: 'Food Allergies', value: liveSnapshotData.foodAllergies },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs font-bold text-slate-700">{item.label}</p>
                        <p className="text-xs font-normal capitalize mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unstructured AI output (raw fallback) */}
              {aiRawResult && (
                <div className="rounded-md border border-secondary/40 bg-secondary/20 p-4 text-sm text-secondary-foreground whitespace-pre-wrap" data-pdf-block="section">
                  {aiRawResult}
                </div>
              )}

              {/* Document sections */}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ══════════════ Actions ══════════════ */}
      <div className="flex flex-wrap items-center gap-3 pb-8">
        <Button
          type="button"
          disabled={isPending || pdfPending || waPending || !patient}
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-5"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditMode ? 'Update Document' : 'Save Document'}
        </Button>
        {docType === 'custom' && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || pdfPending || waPending}
            onClick={handleSaveTemplate}
            className="gap-2"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save as Template
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isPending || pdfPending || waPending || !patient}
          onClick={handleDownloadPDF}
          className="gap-2"
        >
          {pdfPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || pdfPending || waPending || !patient}
          onClick={handleWhatsApp}
          className="gap-2"
        >
          {waPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4 text-green-600" />
          )}
          Send via WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending || pdfPending || waPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
