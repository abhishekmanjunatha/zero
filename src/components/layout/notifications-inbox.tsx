'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  Settings,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type NotificationRow = Tables<'notifications'>

function getRelativeTimeLabel(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSeconds = Math.round((then - now) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absSeconds < 60) return rtf.format(diffSeconds, 'second')
  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffSeconds / 3600)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  const diffDays = Math.round(diffSeconds / 86400)
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day')

  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTypeIcon(type: NotificationRow['type']) {
  if (type.startsWith('appointment_')) return CalendarDays
  if (type.startsWith('lab_report_')) return FlaskConical
  if (type.startsWith('clinical_document_')) return ClipboardList
  if (type.startsWith('patient_')) return User
  if (type.startsWith('template_')) return FileText
  return Settings
}

export function NotificationsInbox() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [dietitianId, setDietitianId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const loadNotifications = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('dietitian_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('[Notifications] load error:', error.message)
        return
      }

      setNotifications((data as NotificationRow[] | null) ?? [])
    },
    [supabase]
  )

  const markRead = useCallback(
    async (id: string) => {
      const readAt = new Date().toISOString()
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read_at: readAt } : item))
      )

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', id)
        .is('read_at', null)

      if (error && dietitianId) {
        console.error('[Notifications] markRead error:', error.message)
        await loadNotifications(dietitianId)
      }
    },
    [dietitianId, loadNotifications, supabase]
  )

  const markAllRead = useCallback(async () => {
    if (!dietitianId || unreadCount === 0) return

    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })))

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('dietitian_id', dietitianId)
      .is('read_at', null)

    if (error) {
      console.error('[Notifications] markAllRead error:', error.message)
      await loadNotifications(dietitianId)
    }
  }, [dietitianId, loadNotifications, supabase, unreadCount])

  const handleOpenNotification = useCallback(
    async (notification: NotificationRow) => {
      if (!notification.read_at) {
        await markRead(notification.id)
      }

      setDesktopOpen(false)
      setMobileOpen(false)

      if (notification.action_url) {
        router.push(notification.action_url)
      }
    },
    [markRead, router]
  )

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        setLoading(false)
        return
      }

      setDietitianId(user.id)
      await loadNotifications(user.id)

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `dietitian_id=eq.${user.id}`,
          },
          () => {
            void loadNotifications(user.id)
          }
        )
        .subscribe()

      setLoading(false)
    }

    void initialize()

    return () => {
      active = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [loadNotifications, supabase])

  const bellButton = (
    <>
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          aria-live="polite"
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </>
  )

  const notificationsContent = (
    <>
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading...' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      <ScrollArea className="h-[380px]">
        {notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
            <Bell className="h-7 w-7 opacity-40" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => {
              const Icon = getTypeIcon(notification.type)
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleOpenNotification(notification)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors hover:bg-accent/20',
                      !notification.read_at && 'bg-primary/5'
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{notification.title}</span>
                        {!notification.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground/90">
                        {getRelativeTimeLabel(notification.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </>
  )

  return (
    <>
      <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DropdownMenuTrigger
          id="topbar-notifications-trigger-desktop"
          className="relative hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          aria-label="Notifications"
        >
          {bellButton}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          id="topbar-notifications-content-desktop"
          align="end"
          className="hidden w-[380px] overflow-hidden rounded-2xl p-0 ring-border/60 lg:block"
        >
          {notificationsContent}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full lg:hidden"
        aria-label="Notifications"
        onClick={() => setMobileOpen(true)}
      >
        {bellButton}
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full max-w-sm p-0">
          <SheetHeader className="pb-0">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          {notificationsContent}
        </SheetContent>
      </Sheet>
    </>
  )
}
