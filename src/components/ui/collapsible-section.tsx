"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  count?: number
  defaultOpen?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  subtitle,
  count,
  defaultOpen = false,
  className,
  triggerClassName,
  contentClassName,
  icon,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <section className={cn("rounded-3xl border bg-card/90", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 px-5 py-3 text-left",
          triggerClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
              {typeof count === "number" && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {count}
                </span>
              )}
            </p>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div className={cn("grid transition-all duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className={cn("border-t px-5 pb-5 pt-4", contentClassName)}>{children}</div>
        </div>
      </div>
    </section>
  )
}
