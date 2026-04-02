import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

type DraftValue = unknown | null

const draftState: { value: DraftValue } = { value: null }

declare global {
  // eslint-disable-next-line no-var
  var __setMockDraft: (value: DraftValue) => void
}

globalThis.__setMockDraft = (value: DraftValue) => {
  draftState.value = value
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

const loadDraftMock = vi.fn(() => draftState.value)
const saveDraftMock = vi.fn()
const clearDraftMock = vi.fn()

vi.mock('@/hooks/use-local-draft', () => ({
  useLocalDraft: () => ({
    loadDraft: loadDraftMock,
    saveDraft: saveDraftMock,
    clearDraft: clearDraftMock,
  }),
}))

vi.mock('@/actions/clinical-notes', () => ({
  createClinicalNote: vi.fn().mockResolvedValue({}),
  updateClinicalNote: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/actions/templates', () => ({
  createDocumentTemplate: vi.fn().mockResolvedValue({}),
  getDocumentTemplates: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/pdf/client', () => ({
  downloadPDFFromServer: vi.fn(),
  generatePDFBlobFromServer: vi.fn().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'test' }),
}))

vi.mock('sonner', () => {
  const toastFn = vi.fn()
  return {
    toast: Object.assign(toastFn, {
      error: vi.fn(),
      success: vi.fn(),
    }),
  }
})

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
  }

  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'doc@test.app' } } }),
      },
      from: vi.fn(() => chain),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/doc.pdf' }, error: null }),
        })),
      },
    })),
  }
})
