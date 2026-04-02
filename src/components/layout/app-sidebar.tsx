'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Plus,
  CircleHelp,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/templates', label: 'Templates', icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low lg:flex">
      {/* Logo */}
      <div className="mb-8 px-6 pt-6 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Plus className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="block text-xl leading-tight font-bold tracking-tight text-primary">Strive</span>
            <span className="block pt-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Clinical Precision</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all',
                isActive
                  ? 'ml-4 translate-x-1 rounded-l-full bg-white text-primary shadow-sm'
                  : 'rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              )}
            >
              <Icon className={cn('h-[17px] w-[17px] shrink-0', isActive && 'text-primary')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-6 pb-4">
        <Link
          href="/patients/new"
          className="mb-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container px-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,77,117,0.24)] transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          New Patient
        </Link>

        <div className="space-y-1 border-t border-outline-variant pt-4">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            <CircleHelp className="h-4 w-4" />
            Support
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            {isPending ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  )
}
