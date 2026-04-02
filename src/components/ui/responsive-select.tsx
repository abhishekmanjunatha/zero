'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-is-mobile'

type SelectOption = {
  value: string
  label: string
}

interface ResponsiveSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: SelectOption[]
  disabled?: boolean
  className?: string
  sheetTitle?: string
}

export function ResponsiveSelect({
  value,
  onValueChange,
  placeholder = 'Select option',
  options,
  disabled,
  className,
  sheetTitle = 'Select Option',
}: ResponsiveSelectProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const handleSelectChange = (nextValue: string | null) => {
    onValueChange(nextValue ?? '')
  }

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  )

  if (!isMobile) {
    return (
      <Select value={value ?? ''} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger className={cn(
          'h-12 w-full rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40 [&>svg]:text-on-surface-variant',
          className
        )}>
          <span className={cn('flex-1 text-left truncate', !selectedLabel && 'text-on-surface-variant')}>
            {selectedLabel ?? placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'h-12 w-full justify-between rounded-lg bg-surface-container-high px-4 text-sm text-left font-normal hover:bg-surface-container-high/80 focus-visible:ring-2 focus-visible:ring-primary/40',
          !selectedLabel ? 'text-on-surface-variant' : 'text-on-surface',
          className
        )}
      >
        <span>{selectedLabel ?? placeholder}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      <SheetContent side="bottom" className="rounded-t-2xl border-t bg-background p-0 pb-4">
        <SheetHeader className="pb-0">
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <div className="space-y-1">
            {options.map((option) => {
              const active = value === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary/12 text-primary'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span>{option.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
