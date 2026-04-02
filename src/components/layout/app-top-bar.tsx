'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  ChevronDown,
  User,
  LogOut,
  Search,
  Settings,
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsInbox } from '@/components/layout/notifications-inbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/templates', label: 'Templates', icon: ClipboardList },
]

interface AppTopBarProps {
  dietitianName: string
  dietitianPhoto?: string | null
}

function getHeaderTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/patients') return 'Patients'
  if (pathname === '/patients/new') return 'Add New Patient'
  if (/^\/patients\/[^/]+\/edit$/.test(pathname)) return 'Edit Patient'
  if (/^\/patients\/[^/]+\/lab-reports$/.test(pathname)) return 'Lab Reports'
  if (/^\/patients\/[^/]+\/lab-reports\/upload$/.test(pathname)) return 'Upload Lab Report'
  if (/^\/patients\/[^/]+\/lab-reports\/[^/]+$/.test(pathname)) return 'Lab Report Detail'
  if (/^\/patients\/[^/]+$/.test(pathname)) return 'Patient Profile'
  if (pathname === '/appointments') return 'Appointments'
  if (pathname === '/appointments/new') return 'Create Appointment'
  if (pathname === '/templates') return 'Templates'
  if (pathname === '/templates/new') return 'Create Template'
  if (/^\/templates\/[^/]+$/.test(pathname)) return 'Edit Template'
  if (pathname === '/clinical-notes') return 'Clinical Notes'
  if (pathname === '/clinical-notes/new') return 'Create Clinical Document'
  if (/^\/clinical-notes\/[^/]+$/.test(pathname)) return 'Edit Document'
  if (pathname.startsWith('/lab-reports')) return 'Lab Reports'
  if (pathname === '/profile') return 'Profile Settings'
  return 'Strive'
}

export function AppTopBar({ dietitianName, dietitianPhoto }: AppTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pageTitle = getHeaderTitle(pathname)
  const isDashboard = pathname === '/dashboard'
  const hasPageHeader = pathname === '/patients' || pathname === '/appointments'

  const initials = dietitianName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/90 bg-white/80 px-4 backdrop-blur-md lg:px-8">

        <div className="flex items-center gap-1.5 lg:hidden">
          {isDashboard ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_18px_rgba(0,77,117,0.22)]">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-primary sm:text-base">Strive</span>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container active:opacity-70 transition-colors"
                aria-label="Go back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              </button>
              <h1 className="text-base font-bold text-primary">{pageTitle}</h1>
            </>
          )}
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-between gap-5 lg:flex">
          {isDashboard ? (
            <label className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                aria-label="Search"
                placeholder="Search patients, records, or health IDs..."
                className="h-10 w-full rounded-full border-none bg-surface-container py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-outline focus:ring-2 focus:ring-primary/20"
              />
            </label>
          ) : hasPageHeader ? (
            <div />
          ) : (
            <h1 className="truncate text-lg font-semibold tracking-tight text-primary">{pageTitle}</h1>
          )}

          <div className="ml-4 flex items-center gap-4 text-on-surface-variant">
            <NotificationsInbox />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/profile')}
              className="hidden h-9 w-9 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface lg:inline-flex"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 pr-0.5 lg:ml-0 lg:pl-2 lg:pr-0">
          <div className="lg:hidden">
            <NotificationsInbox />
          </div>

          <div className="mx-2 hidden h-8 w-px bg-outline-variant lg:block" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              id="topbar-profile-menu-trigger"
              className="flex items-center gap-2 rounded-full pr-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
                <Avatar className="h-10 w-10 ring-2 ring-primary/10 transition-all">
                  <AvatarImage src={dietitianPhoto ?? undefined} />
                  <AvatarFallback className="bg-secondary-container text-xs text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block max-w-[170px] text-left">
                  <span className="block truncate text-sm font-bold text-primary">{dietitianName}</span>
                  <span className="block truncate text-[10px] font-medium text-on-surface-variant">Clinical Dietitian</span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-outline sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent id="topbar-profile-menu-content" align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{dietitianName}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isPending}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isPending ? 'Signing out…' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile bottom navigation for hybrid-ready UX */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[min(94vw,560px)] -translate-x-1/2 items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-low px-2 py-1.5 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,77,117,0.18)] lg:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all',
                isActive
                  ? 'bg-white text-primary shadow-[0_2px_6px_rgba(0,77,117,0.12)]'
                  : 'text-on-surface-variant hover:bg-white/70 hover:text-primary'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
