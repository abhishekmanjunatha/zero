'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  User,
  LogOut,
  Leaf,
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/appointments/new': 'Create Appointment',
  '/clinical-notes/new': 'Create Clinical Document',
  '/templates': 'Templates',
  '/profile': 'Profile & Settings',
}

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/templates', label: 'Templates', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
]

interface AppTopBarProps {
  dietitianName: string
  dietitianPhoto?: string | null
}

export function AppTopBar({ dietitianName, dietitianPhoto }: AppTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const title =
    Object.entries(PAGE_TITLES).find(([path]) => pathname === path)?.[1] ??
    (pathname.startsWith('/patients/') ? 'Patient Profile' : 'Zero')

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
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl px-4 lg:px-6">

        {/* Page title */}
        <h1 className="text-base font-semibold lg:text-lg hidden sm:block">{title}</h1>
        <div className="sm:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl clay-button-primary">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">Zero</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={dietitianPhoto ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                  {dietitianName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[min(94vw,560px)] -translate-x-1/2 items-center justify-between rounded-full border border-border/60 bg-background/85 px-3 py-2 backdrop-blur-xl shadow-[0_12px_36px_rgba(38,76,106,0.22)] lg:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-all',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
