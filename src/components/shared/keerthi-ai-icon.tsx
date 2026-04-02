import { cn } from '@/lib/utils'

interface KeerthiAIIconProps {
  className?: string
}

/**
 * Custom Keerthi AI icon — stylized atom/brain motif with a "K" negative-space feel.
 * Used as the brand icon for the AI insights module.
 */
export function KeerthiAIIcon({ className }: KeerthiAIIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      {/* Outer ring — knowledge orbit */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />

      {/* Inner glow core */}
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25" />

      {/* K-shaped neural paths */}
      {/* Vertical stroke */}
      <path
        d="M9 5.5V18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Upper diagonal */}
      <path
        d="M9 12L15.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lower diagonal */}
      <path
        d="M9 12L15.5 18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* AI spark nodes at endpoints */}
      <circle cx="15.5" cy="5.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="18.5" r="1.5" fill="currentColor" />

      {/* Subtle orbiting spark */}
      <circle cx="19" cy="8" r="1" fill="currentColor" fillOpacity="0.6" />
      <circle cx="5" cy="16" r="0.8" fill="currentColor" fillOpacity="0.4" />
    </svg>
  )
}
