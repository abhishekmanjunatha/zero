import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-card py-16 text-muted-foreground', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-center text-xs">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
