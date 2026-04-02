'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface ResponsiveDatePickerProps {
  value?: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  sheetTitle?: string
}

function parseDate(value?: string) {
  if (!value) return undefined
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toYmd(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function ResponsiveDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled,
  className,
  sheetTitle = 'Select Date',
}: ResponsiveDatePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const selectedDate = useMemo(() => parseDate(value), [value])
  const minDate = useMemo(() => parseDate(min), [min])
  const maxDate = useMemo(() => parseDate(max), [max])

  const disabledDays = useMemo(() => {
    if (minDate && maxDate) {
      return [{ before: minDate }, { after: maxDate }]
    }
    if (minDate) return [{ before: minDate }]
    if (maxDate) return [{ after: maxDate }]
    return undefined
  }, [maxDate, minDate])

  const triggerClassName = cn(
    'h-12 w-full justify-between rounded-lg border-none bg-surface-container-high px-4 text-sm text-left font-normal',
    !selectedDate ? 'text-on-surface-variant' : 'text-on-surface',
    className
  )

  const triggerContent = (
    <>
      <span>{selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder}</span>
      <CalendarDays className="h-4 w-4 shrink-0 text-on-surface-variant" />
    </>
  )

  const calendar = (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        if (!date) return
        onChange(toYmd(date))
        setOpen(false)
      }}
      disabled={disabledDays}
      className="mx-auto"
    />
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={triggerClassName}
          onClick={() => { if (!disabled) setOpen(true) }}
        >
          {triggerContent}
        </Button>
        <SheetContent side="bottom" className="rounded-t-2xl border-t bg-background p-0 pb-4">
          <SheetHeader className="pb-0">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="px-4">{calendar}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* render prop merges Base UI's trigger props onto the Button element,
          avoiding the invalid nested-button (<button> inside <button>) issue */}
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className={triggerClassName}
          >
            {triggerContent}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-2" align="start">
        {calendar}
      </PopoverContent>
    </Popover>
  )
}
