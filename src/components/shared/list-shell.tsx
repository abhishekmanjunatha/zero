import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

/* ---------- List Shell ---------- */

interface ListShellProps {
  isEmpty: boolean
  error?: string | null
  onRetry?: () => void
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyHint?: string
  count?: number
  countLabel?: string
  desktopTable: React.ReactNode
  mobileCards: React.ReactNode
  className?: string
}

export function ListShell({
  isEmpty,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyHint,
  desktopTable,
  mobileCards,
  className,
}: ListShellProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16">
        <AlertTriangle className="h-8 w-8 text-destructive/60" />
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyHint} />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop table */}
      <div className="hidden lg:block">{desktopTable}</div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">{mobileCards}</div>
    </div>
  )
}

/* ---------- Table Wrapper ---------- */

interface DataTableProps {
  headers: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function DataTable({ headers, children, footer, className }: DataTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white shadow-sm', className)}>
      <table className="w-full text-sm text-on-surface">
        <thead>
          <tr className="border-b border-outline-variant/20 bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
            {headers}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {footer && (
        <div className="flex items-center justify-between border-t border-outline-variant/20 px-5 py-3 text-xs text-on-surface-variant">
          {footer}
        </div>
      )}
    </div>
  )
}

/* ---------- Mobile Card ---------- */

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <article
      className={cn('rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </article>
  )
}

/* ---------- Avatar Circle ---------- */

interface AvatarCircleProps {
  initials: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarCircle({ initials, size = 'md', className }: AvatarCircleProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-secondary-container font-bold text-primary',
        size === 'sm' && 'h-8 w-8 text-[10px]',
        size === 'md' && 'h-10 w-10 text-xs',
        size === 'lg' && 'h-12 w-12 text-sm',
        className
      )}
    >
      {initials}
    </div>
  )
}
