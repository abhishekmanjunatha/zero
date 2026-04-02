import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentComposer } from '@/components/clinical-notes/document-composer'
import { defaultBlocksForType } from '@/components/clinical-notes/composer-helpers'
import type { DocumentType } from '@/types/app'
import { createClinicalNote } from '@/actions/clinical-notes'
import { createDocumentTemplate } from '@/actions/templates'

type DraftShape = {
  docType: DocumentType
  docTitle: string
  blocks: ReturnType<typeof defaultBlocksForType>
  includePatientInfo: boolean
  visitHeight: string
  visitWeight: string
  selectedTemplateId: string | null
}

function setDraft(docType: DocumentType, title: string): void {
  const draft: DraftShape = {
    docType,
    docTitle: title,
    blocks: defaultBlocksForType(docType),
    includePatientInfo: true,
    visitHeight: '',
    visitWeight: '',
    selectedTemplateId: null,
  }
  globalThis.__setMockDraft(draft)
}

function hasHiddenAncestor(node: Element | null): boolean {
  let current: Element | null = node
  while (current) {
    if (current.classList.contains('hidden')) return true
    current = current.parentElement
  }
  return false
}

function getActiveButton(name: RegExp): HTMLButtonElement {
  const buttons = screen.queryAllByRole('button', { name })
  const button = buttons.find((btn) => !hasHiddenAncestor(btn))
  if (!button) {
    throw new Error(`Could not find active button matching: ${name}`)
  }
  return button as HTMLButtonElement
}

function getActiveHeading(name: RegExp): HTMLElement {
  const headings = screen.getAllByRole('heading', { name })
  const heading = headings.find((h) => !hasHiddenAncestor(h))
  if (!heading) {
    throw new Error(`Could not find active heading matching: ${name}`)
  }
  return heading
}

function getActiveCombobox(): HTMLElement {
  const boxes = screen.queryAllByRole('combobox')
  const box = boxes.find((el) => !hasHiddenAncestor(el))
  if (!box) {
    throw new Error('Could not find active combobox')
  }
  return box as HTMLElement
}

const initialPatient = {
  id: 'patient-1',
  full_name: 'Demo Patient',
  patient_code: 'P-001',
  phone: '9999999999',
  gender: 'female',
  date_of_birth: '1990-01-01',
  height_cm: 165,
  weight_kg: 70,
  activity_level: 'lightly_active',
  dietary_type: 'vegetarian',
  medical_conditions: ['pcos'],
  food_allergies: ['nuts'],
  primary_goal: 'weight_loss',
} as const

describe('DocumentComposer user journeys', () => {
  beforeEach(() => {
    globalThis.__setMockDraft(null)
    vi.clearAllMocks()
  })

  it('creates a Meal Plan document through full journey', async () => {
    const user = userEvent.setup()
    setDraft('meal_plan', 'Week 1 Meal Plan')
    render(<DocumentComposer initialPatient={initialPatient} />)

    await waitFor(() => {
      expect(getActiveButton(/Next:\s*Patient/i)).toBeInTheDocument()
    })

    await user.click(getActiveButton(/Next:\s*Patient/i))
    expect(getActiveHeading(/Visit Measurements/i)).toBeInTheDocument()

    await user.click(getActiveButton(/Next:\s*Content/i))
    const contentCard = getActiveHeading(/Document Content/i).closest('div')?.parentElement
    expect(contentCard).toBeTruthy()
    if (!contentCard) throw new Error('Content card not found')

    expect(within(contentCard).getByDisplayValue('Breakfast')).toBeInTheDocument()
    expect(within(contentCard).getByDisplayValue('Lunch')).toBeInTheDocument()
    expect(within(contentCard).getByDisplayValue('Dinner')).toBeInTheDocument()

    const textareas = contentCard.querySelectorAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    await user.type(textareas[0] as HTMLTextAreaElement, 'Oats with skim milk')

    await user.click(getActiveButton(/Next:\s*Preview/i))
    expect(getActiveHeading(/Preview/i)).toBeInTheDocument()

    await user.click(getActiveButton(/Save Document/i))
    await waitFor(() => {
      expect(createClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          document_type: 'meal_plan',
          title: 'Week 1 Meal Plan',
        })
      )
    })
  })

  it('creates a Follow-up Recommendation document through full journey', async () => {
    const user = userEvent.setup()
    setDraft('follow_up_recommendation', 'Follow-up Visit')
    render(<DocumentComposer initialPatient={initialPatient} />)

    await waitFor(() => {
      expect(getActiveButton(/Next:\s*Patient/i)).toBeInTheDocument()
    })

    await user.click(getActiveButton(/Next:\s*Patient/i))
    expect(getActiveHeading(/Visit Measurements/i)).toBeInTheDocument()

    await user.click(getActiveButton(/Next:\s*Content/i))
    const contentCard = getActiveHeading(/Document Content/i).closest('div')?.parentElement
    expect(contentCard).toBeTruthy()
    if (!contentCard) throw new Error('Content card not found')

    expect(within(contentCard).getByDisplayValue('Progress Summary')).toBeInTheDocument()
    expect(within(contentCard).getByDisplayValue('Recommendations')).toBeInTheDocument()
    expect(within(contentCard).getByDisplayValue('Next Steps')).toBeInTheDocument()
    expect(within(contentCard).queryByDisplayValue('Breakfast')).not.toBeInTheDocument()

    await user.click(getActiveButton(/Next:\s*Preview/i))
    await user.click(getActiveButton(/Save Document/i))

    await waitFor(() => {
      expect(createClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          document_type: 'follow_up_recommendation',
          title: 'Follow-up Visit',
        })
      )
    })
  })

  it('creates a Quick Note document and skips patient step', async () => {
    const user = userEvent.setup()
    setDraft('quick_note', 'Quick Note')
    render(<DocumentComposer initialPatient={initialPatient} />)

    await waitFor(() => {
      expect(getActiveButton(/Next:\s*Content/i)).toBeInTheDocument()
    })

    await user.click(getActiveButton(/Next:\s*Content/i))
    expect(getActiveHeading(/Document Content/i)).toBeInTheDocument()

    const visibleVisitHeadings = screen
      .queryAllByRole('heading', { name: /Visit Measurements/i })
      .filter((h) => !hasHiddenAncestor(h))
    expect(visibleVisitHeadings).toHaveLength(0)

    const contentCard = getActiveHeading(/Document Content/i).closest('div')?.parentElement
    expect(contentCard).toBeTruthy()
    if (!contentCard) throw new Error('Content card not found')
    expect(within(contentCard).getByDisplayValue('Notes')).toBeInTheDocument()
    expect(within(contentCard).queryByDisplayValue('Breakfast')).not.toBeInTheDocument()

    const textareas = contentCard.querySelectorAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    await user.type(textareas[0] as HTMLTextAreaElement, 'Patient tolerated diet well.')

    await user.click(getActiveButton(/Next:\s*Preview/i))
    await user.click(getActiveButton(/Save Document/i))

    await waitFor(() => {
      expect(createClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          document_type: 'quick_note',
          title: 'Quick Note',
        })
      )
    })
  })

  it('creates a Custom document, adds section, saves template and document', async () => {
    const user = userEvent.setup()
    setDraft('custom', 'Custom Protocol')
    render(<DocumentComposer initialPatient={initialPatient} />)

    await waitFor(() => {
      expect(getActiveButton(/Next:\s*Content/i)).toBeInTheDocument()
    })

    await user.click(getActiveButton(/Next:\s*Content/i))
    const contentCard = getActiveHeading(/Document Content/i).closest('div')?.parentElement
    expect(contentCard).toBeTruthy()
    if (!contentCard) throw new Error('Content card not found')

    expect(within(contentCard).getByDisplayValue('Content')).toBeInTheDocument()
    await user.click(within(contentCard).getByRole('button', { name: /Add Section/i }))
    expect(within(contentCard).getByDisplayValue('New Section')).toBeInTheDocument()

    const textareas = contentCard.querySelectorAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    await user.type(textareas[0] as HTMLTextAreaElement, 'Custom advice for next visit.')

    await user.click(getActiveButton(/Next:\s*Preview/i))
    await user.click(getActiveButton(/Save as Template/i))

    await waitFor(() => {
      expect(createDocumentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Protocol',
        })
      )
    })

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /Save Document/i }).length).toBeGreaterThan(0)
    })
    await user.click(getActiveButton(/Save Document/i))
    await waitFor(() => {
      expect(createClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          document_type: 'custom',
          title: 'Custom Protocol',
        })
      )
    })
  })

  it('resets block structure when switching type (regression guard)', async () => {
    const user = userEvent.setup()
    setDraft('meal_plan', 'Switch Test')
    render(<DocumentComposer initialPatient={initialPatient} />)

    const trigger = getActiveCombobox()
    await user.click(trigger)
    await user.click(screen.getByText('Quick Note'))

    await user.click(getActiveButton(/Next:\s*Content/i))
    const contentCard = getActiveHeading(/Document Content/i).closest('div')?.parentElement
    expect(contentCard).toBeTruthy()
    if (!contentCard) throw new Error('Content card not found')

    expect(within(contentCard).getByDisplayValue('Notes')).toBeInTheDocument()
    expect(within(contentCard).queryByDisplayValue('Breakfast')).not.toBeInTheDocument()
  })
})
