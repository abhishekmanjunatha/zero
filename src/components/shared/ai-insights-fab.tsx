'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { KeerthiAIIcon } from './keerthi-ai-icon'
import { AIInsightsSheet } from './ai-insights-sheet'

interface AIInsightsFabProps {
  patientId: string
  className?: string
}

export function AIInsightsFab({ patientId, className }: AIInsightsFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white shadow-[0_8px_30px_-6px_rgba(4,43,73,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(4,43,73,0.7)] active:scale-95 lg:bottom-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
          className
        )}
        aria-label="Keerthi AI"
        title="Keerthi AI"
      >
        <KeerthiAIIcon className="h-6 w-6" />
      </button>

      <AIInsightsSheet
        patientId={patientId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
