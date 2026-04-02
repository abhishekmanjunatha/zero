'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InvitePatientDialog } from '@/components/patients/invite-patient-dialog'

/** Mobile quick-action chip for the dashboard */
export function InvitePatientChip() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex min-h-32 flex-col justify-between rounded-3xl border border-outline-variant/70 bg-white p-4 shadow-[0_10px_24px_rgba(25,28,29,0.04)] transition-transform hover:-translate-y-0.5 text-left"
      >
        <div className="flex items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <Send className="h-5 w-5 text-indigo-600" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-on-surface">
            Invite Patient
          </p>
        </div>
      </button>
      <InvitePatientDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/** Desktop quick-action card for the dashboard */
export function InvitePatientCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative cursor-pointer rounded-xl border border-outline-variant/20 bg-white p-4 shadow-[0_2px_8px_rgba(25,28,29,0.06)] transition-shadow hover:shadow-md text-left"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
          <Send className="h-4.5 w-4.5 text-indigo-600" />
        </div>
        <h3 className="font-bold text-on-surface">Invite Patient</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Send secure sign-up link</p>
      </button>
      <InvitePatientDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/** Toolbar button for the patients page */
export function InvitePatientToolbarButton({ className, variant = 'desktop' }: { className?: string; variant?: 'desktop' | 'mobile' }) {
  const [open, setOpen] = useState(false)

  if (variant === 'mobile') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/20 bg-white text-indigo-600 shadow-sm',
            className
          )}
          title="Invite Patient"
        >
          <Send className="h-5 w-5" />
        </button>
        <InvitePatientDialog open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100',
          className
        )}
      >
        <Send className="h-4 w-4" />
        Invite Patient
      </button>
      <InvitePatientDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
