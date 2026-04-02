import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex text-xs font-medium tracking-wide text-on-surface-variant">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center">
                {i > 0 && <span className="mx-2">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-primary' : undefined}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}
        <h2 className="font-heading text-4xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-medium text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
