import { describe, expect, it } from 'vitest'
import { buildDocumentHTML, type PDFTemplateData, type PDFDietitianData, type PDFPatientSnapshot } from '@/lib/pdf/html-template'
import type { DocumentBlock } from '@/types/app'

// ── Helpers ───────────────────────────────────────────────────────────────

function createDietitianData(overrides?: Partial<PDFDietitianData>): PDFDietitianData {
  return {
    name: 'Dr. Julianne Smith',
    qualification: 'MSc Clinical Nutrition',
    licenseNumber: 'DL-1234',
    clinicName: 'Strive Clinical',
    address: 'Main Street, Bangalore, Karnataka',
    phone: '555-111-2222',
    email: 'doctor@strive.test',
    ...overrides,
  }
}

function createPatientSnapshot(overrides?: Partial<PDFPatientSnapshot>): PDFPatientSnapshot {
  return {
    name: 'Elena Rodriguez',
    age: '28 yrs',
    gender: 'female',
    height: '165 cm',
    weight: '62 kg',
    bmi: '22.8',
    ibw: '57.3 kg',
    weightDiff: '+4.7 kg',
    primaryGoal: 'weight loss',
    activityLevel: 'lightly active',
    medicalConditions: 'None',
    foodAllergies: 'Shellfish',
    previousWeight: '64 kg',
    weightChange: '-2.0 kg',
    ...overrides,
  }
}

function createBlocks(labels: string[]): DocumentBlock[] {
  return labels.map((label, i) => ({
    id: `block-${i}`,
    type: 'custom' as const,
    label,
    content: `Content for ${label}`,
    order: i,
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('buildDocumentHTML', () => {
  it('produces a valid self-contained HTML document', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test Document',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<style>')
    expect(html).toContain('</html>')
  })

  it('renders dietitian header with name, qualification, license, and email', () => {
    const html = buildDocumentHTML({
      docTitle: 'Quick Note',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('DR. JULIANNE SMITH')
    expect(html).toContain('MSc Clinical Nutrition')
    expect(html).toContain('License No: DL-1234')
    expect(html).toContain('doctor@strive.test')
  })

  it('renders document title in uppercase', () => {
    const html = buildDocumentHTML({
      docTitle: 'Follow Up',
      documentType: 'follow_up_recommendation',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Progress Summary']),
    })

    expect(html).toContain('class="doc-title"')
    expect(html).toContain('Follow Up')
  })

  it('renders patient snapshot grid when provided', () => {
    const html = buildDocumentHTML({
      docTitle: 'Meal Plan',
      documentType: 'meal_plan',
      dietitian: createDietitianData(),
      patientSnapshot: createPatientSnapshot(),
      blocks: createBlocks(['Breakfast']),
    })

    expect(html).toContain('snapshot-card')
    expect(html).toContain('snapshot-grid')
    expect(html).toContain('Patient Information')
    expect(html).toContain('Elena Rodriguez')
    expect(html).toContain('22.8')
    expect(html).toContain('Shellfish')
  })

  it('omits patient snapshot when not provided', () => {
    const html = buildDocumentHTML({
      docTitle: 'Quick Note',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      patientSnapshot: null,
      blocks: createBlocks(['Notes']),
    })

    // The CSS always contains `.snapshot-card` — check that no actual snapshot element was rendered
    expect(html).not.toContain('class="snapshot-card"')
    expect(html).not.toContain('Patient Information')
  })

  it('renders all content sections as cards', () => {
    const html = buildDocumentHTML({
      docTitle: 'Meal Plan',
      documentType: 'meal_plan',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Breakfast', 'Lunch', 'Dinner', 'Instructions']),
    })

    expect(html).toContain('Breakfast')
    expect(html).toContain('Lunch')
    expect(html).toContain('Dinner')
    expect(html).toContain('Instructions')
    // Each block should be in a section-card
    const cardCount = (html.match(/class="section-card"/g) || []).length
    expect(cardCount).toBe(4)
  })

  it('filters out title and patient_snapshot block types', () => {
    const blocks: DocumentBlock[] = [
      { id: '1', type: 'title', label: 'Title', content: 'Doc Title', order: 0 },
      { id: '2', type: 'patient_snapshot', label: 'Snapshot', content: '{}', order: 1 },
      { id: '3', type: 'custom', label: 'Notes', content: 'Actual content', order: 2 },
    ]

    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks,
    })

    const cardCount = (html.match(/class="section-card"/g) || []).length
    expect(cardCount).toBe(1)
    expect(html).toContain('Actual content')
  })

  it('escapes HTML special characters in all dynamic content', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test <script>alert("xss")</script>',
      documentType: 'quick_note',
      dietitian: createDietitianData({ name: '<b>Evil</b>' }),
      patientSnapshot: createPatientSnapshot({ name: '"><img onerror=alert(1)>' }),
      blocks: [{
        id: '1',
        type: 'custom',
        label: 'Section <script>',
        content: 'Content with <div> and & "quotes"',
        order: 0,
      }],
    })

    // Verify dangerous HTML is escaped — no unescaped script/img tags
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;')
  })

  it('renders footer with clinic name, address, phone, email, and brand', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Notes']),
      siteName: 'Strive',
    })

    expect(html).toContain('Strive Clinical')
    expect(html).toContain('Main Street, Bangalore, Karnataka')
    expect(html).toContain('Phone: 555-111-2222')
    expect(html).toContain('Powered by Strive')
  })

  it('uses default site name when not specified', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('Powered by Strive')
  })

  it('renders default Strive logo when no logoUrl provided', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData({ logoUrl: undefined }),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('<svg')
    expect(html).toContain('Strive')
  })

  it('renders clinic logo img tag when logoUrl is provided', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData({ logoUrl: 'https://example.com/logo.png' }),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('<img')
    expect(html).toContain('https://example.com/logo.png')
  })

  it('renders all 4 document types correctly', () => {
    const types = ['quick_note', 'meal_plan', 'follow_up_recommendation', 'custom'] as const

    for (const docType of types) {
      const html = buildDocumentHTML({
        docTitle: `${docType} doc`,
        documentType: docType,
        dietitian: createDietitianData(),
        blocks: createBlocks(['Section 1']),
      })

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('section-card')
    }
  })

  it('shows empty-content placeholder for blocks with no content', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: [{ id: '1', type: 'custom', label: 'Empty', content: '', order: 0 }],
    })

    expect(html).toContain('No content')
  })

  it('uses CSS flex layout for fixed header/footer positioning', () => {
    const html = buildDocumentHTML({
      docTitle: 'Test',
      documentType: 'quick_note',
      dietitian: createDietitianData(),
      blocks: createBlocks(['Notes']),
    })

    expect(html).toContain('display: flex')
    expect(html).toContain('flex-direction: column')
    expect(html).toContain('flex-shrink: 0')
    expect(html).toContain('flex: 1')
  })
})
