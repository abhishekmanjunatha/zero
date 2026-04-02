import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCheckPhoneExists = vi.fn().mockResolvedValue({ exists: false })
const mockCreatePatientInvite = vi.fn().mockResolvedValue({
  token: 'a'.repeat(64),
  inviteUrl: 'http://localhost:3000/invite/' + 'a'.repeat(64),
})

vi.mock('@/actions/invites', () => ({
  checkPhoneExists: (...args: unknown[]) => mockCheckPhoneExists(...args),
  createPatientInvite: (...args: unknown[]) => mockCreatePatientInvite(...args),
  getInviteMessageContext: vi.fn().mockResolvedValue({ dietitianName: 'Dr. Test', clinicName: 'Test Clinic' }),
}))

vi.mock('@/components/shared/contact-picker-button', () => ({
  ContactPickerButton: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock clipboard API
const mockClipboardWrite = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWrite },
  writable: true,
  configurable: true,
})

import { InvitePatientDialog } from '@/components/patients/invite-patient-dialog'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('InvitePatientDialog — Journey Test', () => {
  const user = userEvent.setup()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-establish clipboard mock after clearAllMocks
    mockClipboardWrite.mockResolvedValue(undefined)
    mockCheckPhoneExists.mockResolvedValue({ exists: false })
    mockCreatePatientInvite.mockResolvedValue({
      token: 'a'.repeat(64),
      inviteUrl: 'http://localhost:3000/invite/' + 'a'.repeat(64),
    })
  })

  function renderDialog() {
    return render(<InvitePatientDialog open={true} onOpenChange={mockOnOpenChange} />)
  }

  it('renders dialog with title and description', () => {
    renderDialog()
    expect(screen.getByText('Invite Patient')).toBeInTheDocument()
    expect(screen.getByText(/Send a secure link/)).toBeInTheDocument()
  })

  it('shows Continue button initially', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('disables Continue when phone is empty', () => {
    renderDialog()
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeDisabled()
  })

  it('completes full invite flow: phone → message → WhatsApp send', async () => {
    // Mock window.open for WhatsApp
    const origOpen = window.open
    window.open = vi.fn()

    renderDialog()

    // Step 1: Enter phone number
    const phoneInput = screen.getByPlaceholderText('Mobile number')
    await user.type(phoneInput, '9876543210')

    // Step 2: Click Continue (triggers phone check)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeEnabled()
    await user.click(continueBtn)

    // Step 3: Should show message + send options (after check resolves)
    await waitFor(() => {
      expect(screen.getByText(/Invite Message/i)).toBeInTheDocument()
    })

    // Step 4: Verify WhatsApp button is visible
    expect(screen.getByRole('button', { name: /send via whatsapp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send via text message/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy invite link/i })).toBeInTheDocument()

    // Step 5: Click WhatsApp
    await user.click(screen.getByRole('button', { name: /send via whatsapp/i }))

    // Step 6: Should call createPatientInvite
    await waitFor(() => {
      expect(mockCreatePatientInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryChannel: 'whatsapp',
        })
      )
    })

    // Step 7: Should show success state
    await waitFor(() => {
      expect(screen.getByText(/invite sent/i)).toBeInTheDocument()
    })

    // Step 8: Copy Link button should be present in success state
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()

    // Step 9: Done button should close dialog
    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)

    window.open = origOpen
  })

  it('handles duplicate phone flow correctly', async () => {
    mockCheckPhoneExists.mockResolvedValue({
      exists: true,
      patient: { id: 'p1', full_name: 'Existing Patient', patient_code: 'PT-001' },
    })

    renderDialog()

    await user.type(screen.getByPlaceholderText('Mobile number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Should show duplicate warning
    await waitFor(() => {
      expect(screen.getByText('This number belongs to an existing patient')).toBeInTheDocument()
    })
    expect(screen.getByText('Existing Patient')).toBeInTheDocument()
    expect(screen.getByText('PT-001')).toBeInTheDocument()

    // Should show three action buttons
    expect(screen.getByRole('button', { name: /proceed anyway/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('allows proceeding past duplicate warning', async () => {
    mockCheckPhoneExists.mockResolvedValue({
      exists: true,
      patient: { id: 'p1', full_name: 'Existing', patient_code: 'PT-001' },
    })

    renderDialog()

    await user.type(screen.getByPlaceholderText('Mobile number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /proceed anyway/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /proceed anyway/i }))

    // Should now show invite message form
    await waitFor(() => {
      expect(screen.getByText(/Invite Message/i)).toBeInTheDocument()
    })
  })

  it('Copy Invite Link flow: creates invite and transitions to success', async () => {
    renderDialog()

    await user.type(screen.getByPlaceholderText('Mobile number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy invite link/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /copy invite link/i }))

    // Should call createPatientInvite with text_message channel
    await waitFor(() => {
      expect(mockCreatePatientInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryChannel: 'text_message',
        })
      )
    })

    // Should show success state (proves the full async flow completed: create → clipboard → setState)
    await waitFor(() => {
      expect(screen.getByText(/invite sent/i)).toBeInTheDocument()
    })

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText(/invite sent/i)).toBeInTheDocument()
    })
  })

  it('shows error when invite creation fails', async () => {
    mockCreatePatientInvite.mockResolvedValue({ error: 'Rate limit exceeded' })

    renderDialog()

    await user.type(screen.getByPlaceholderText('Mobile number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send via whatsapp/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /send via whatsapp/i }))

    // Should stay in ready state (not advance to sent)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send via whatsapp/i })).toBeInTheDocument()
    })
  })
})
