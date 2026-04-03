import { cn, formatLabel } from '@/lib/utils'

type StatusVariant =
  | 'upcoming'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'active'
  | 'inactive'
  | 'scheduled'
  | 'walk_in'
  | 'default'

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  upcoming: 'bg-amber-100 text-amber-700 border-amber-200',
  checked_in: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  completed: 'bg-tertiary-fixed/40 text-tertiary-container border-tertiary-fixed/60',
  cancelled: 'bg-error-container text-on-error-container border-error-container',
  no_show: 'bg-orange-100 text-orange-700 border-orange-200',
  active: 'bg-tertiary-fixed/40 text-tertiary-container border-tertiary-fixed/60',
  inactive: 'bg-surface-container text-on-surface-variant border-outline-variant',
  scheduled: 'bg-secondary-container text-primary border-secondary-container',
  walk_in: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
  default: 'bg-surface-container text-on-surface-variant border-outline-variant',
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = (status in VARIANT_CLASSES ? status : 'default') as StatusVariant
  const displayLabel = label ?? formatLabel(status)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
