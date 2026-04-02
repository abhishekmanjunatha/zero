import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type MaterialSymbolProps = {
  name: string
  className?: string
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  grade?: number
  opticalSize?: number
  ariaHidden?: boolean
}

export function MaterialSymbol({
  name,
  className,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  ariaHidden = true,
}: MaterialSymbolProps) {
  const style: CSSProperties = {
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
  }

  return (
    <span
      className={cn('material-symbols-outlined inline-flex shrink-0 items-center justify-center leading-none', className)}
      style={style}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  )
}
