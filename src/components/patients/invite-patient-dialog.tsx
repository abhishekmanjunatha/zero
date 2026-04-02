'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContactPickerButton } from '@/components/shared/contact-picker-button'
import { checkPhoneExists, createPatientInvite, getInviteMessageContext } from '@/actions/invites'

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'India' },
  { code: '+1', label: '🇺🇸 +1', country: 'US' },
  { code: '+44', label: '🇬🇧 +44', country: 'UK' },
  { code: '+61', label: '🇦🇺 +61', country: 'Australia' },
  { code: '+971', label: '🇦🇪 +971', country: 'UAE' },
  { code: '+65', label: '🇸🇬 +65', country: 'Singapore' },
  { code: '+60', label: '🇲🇾 +60', country: 'Malaysia' },
  { code: '+966', label: '🇸🇦 +966', country: 'Saudi Arabia' },
  { code: '+974', label: '🇶🇦 +974', country: 'Qatar' },
  { code: '+968', label: '🇴🇲 +968', country: 'Oman' },
]

const FALLBACK_MESSAGE =
  'Hi! I\'m inviting you to join my patient directory on Strive. Please fill in your details using the secure link below. This link expires in 48 hours.'

function buildInviteMessage(dietitianName: string, clinicName: string): string {
  if (!dietitianName) return FALLBACK_MESSAGE
  const clinic = clinicName || 'our clinic'
  return `Hi! This is ${dietitianName}, I'm inviting you to signup for ${clinic} on Strive. Please fill in your details using the secure link below. This link expires in 48 hours.`
}

type DialogState =
  | 'idle'
  | 'checking'
  | 'duplicate-warning'
  | 'ready'
  | 'sending'
  | 'sent'

interface DuplicateInfo {
  id: string
  full_name: string
  patient_code: string
}

interface InvitePatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvitePatientDialog({ open, onOpenChange }: InvitePatientDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<DialogState>('idle')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(FALLBACK_MESSAGE)
  const [defaultMessage, setDefaultMessage] = useState(FALLBACK_MESSAGE)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null)

  // Fetch dietitian name + clinic name when dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getInviteMessageContext().then((ctx) => {
      if (cancelled) return
      const msg = buildInviteMessage(ctx.dietitianName, ctx.clinicName)
      setDefaultMessage(msg)
      setMessage(msg)
    }).catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [open])

  const resetState = () => {
    setState('idle')
    setPhone('')
    setMessage(defaultMessage)
    setInviteUrl('')
    setCopied(false)
    setDuplicateInfo(null)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`

  const handleCheckAndProceed = () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      toast.error('Please enter a valid phone number')
      return
    }
    setState('checking')
    startTransition(async () => {
      const result = await checkPhoneExists(fullPhone)
      if (result.exists && result.patient) {
        setDuplicateInfo(result.patient)
        setState('duplicate-warning')
      } else {
        setState('ready')
      }
    })
  }

  const handleProceedAnyway = () => {
    setDuplicateInfo(null)
    setState('ready')
  }

  const handleGoToProfile = () => {
    if (duplicateInfo) {
      router.push(`/patients/${duplicateInfo.id}`)
      handleClose(false)
    }
  }

  const handleSend = (channel: 'whatsapp' | 'text_message') => {
    setState('sending')
    startTransition(async () => {
      const result = await createPatientInvite({
        phone: fullPhone,
        countryCode,
        message,
        deliveryChannel: channel,
      })

      if (result.error) {
        toast.error(result.error)
        setState('ready')
        return
      }

      const url = result.inviteUrl!
      setInviteUrl(url)

      const fullMessage = `${message}\n\n${url}`
      const phoneDigits = fullPhone.replace(/\D/g, '')

      if (channel === 'whatsapp') {
        window.open(
          `https://wa.me/${phoneDigits}?text=${encodeURIComponent(fullMessage)}`,
          '_blank',
          'noopener,noreferrer'
        )
      } else {
        window.open(
          `sms:${phoneDigits}?body=${encodeURIComponent(fullMessage)}`,
          '_self'
        )
      }

      setState('sent')
      toast.success('Invite created successfully')
    })
  }

  const handleCopyLink = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('Invite link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Invite Patient
          </DialogTitle>
          <DialogDescription>
            Send a secure link for the patient to self-register.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* ── Phone Input ── */}
          {(state === 'idle' || state === 'checking') && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">Phone Number</Label>
                  <ContactPickerButton
                    className="h-8 px-2"
                    ariaLabel="Pick from contacts"
                    onContactPicked={({ phone: pickedPhone }) => {
                      const digits = pickedPhone.replace(/\D/g, '')
                      // If phone starts with a known country code, extract it
                      const matched = COUNTRY_CODES.find((cc) => digits.startsWith(cc.code.replace('+', '')))
                      if (matched) {
                        setCountryCode(matched.code)
                        setPhone(digits.slice(matched.code.replace('+', '').length))
                      } else {
                        setPhone(digits)
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={(v) => { if (v) setCountryCode(v) }}>
                    <SelectTrigger className="w-[110px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          {cc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleCheckAndProceed}
                disabled={isPending || !phone.trim()}
                className="w-full gap-2"
              >
                {state === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                {state === 'checking' ? 'Checking…' : 'Continue'}
              </Button>
            </>
          )}

          {/* ── Duplicate Warning ── */}
          {state === 'duplicate-warning' && duplicateInfo && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  This number belongs to an existing patient
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  <span className="font-bold">{duplicateInfo.full_name}</span>
                  <span className="mx-1.5">·</span>
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">{duplicateInfo.patient_code}</code>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleProceedAnyway} variant="outline" className="w-full">
                  Proceed Anyway
                </Button>
                <Button onClick={handleGoToProfile} variant="secondary" className="w-full">
                  Go to Profile
                </Button>
                <Button onClick={() => { resetState() }} variant="ghost" className="w-full text-muted-foreground">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Message + Send Options ── */}
          {(state === 'ready' || state === 'sending') && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Invite Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="text-sm"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {message.length}/500
                </p>
              </div>

              <div className="rounded-lg border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Sending to: <span className="font-semibold text-foreground">{fullPhone}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSend('whatsapp')}
                  disabled={isPending}
                  className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90"
                >
                  {state === 'sending' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Send via WhatsApp
                </Button>
                <Button
                  onClick={() => handleSend('text_message')}
                  disabled={isPending}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send via Text Message
                </Button>
                <Button
                  disabled
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send via SMS
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                    Coming Soon
                  </span>
                </Button>

                <div className="relative flex items-center py-1">
                  <div className="flex-1 border-t border-muted" />
                  <span className="px-3 text-[10px] font-semibold uppercase text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-muted" />
                </div>

                <Button
                  onClick={() => {
                    setState('sending')
                    startTransition(async () => {
                      const result = await createPatientInvite({
                        phone: fullPhone,
                        countryCode,
                        message,
                        deliveryChannel: 'text_message',
                      })
                      if (result.error) {
                        toast.error(result.error)
                        setState('ready')
                        return
                      }
                      const url = result.inviteUrl!
                      setInviteUrl(url)
                      try {
                        await navigator.clipboard.writeText(url)
                        toast.success('Invite link copied to clipboard')
                      } catch {
                        toast.error('Could not copy automatically — use the link below')
                      }
                      setState('sent')
                    })
                  }}
                  disabled={isPending}
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                >
                  {state === 'sending' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Copy Invite Link
                </Button>
              </div>
            </>
          )}

          {/* ── Success State ── */}
          {state === 'sent' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Invite sent!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The patient will receive a link to fill in their details. The link expires in 48 hours.
                </p>
              </div>

              {inviteUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 overflow-hidden">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{inviteUrl}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyLink}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleClose(false)}
                variant="outline"
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
