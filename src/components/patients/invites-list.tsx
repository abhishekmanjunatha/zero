'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ListShell, DataTable, MobileCard } from '@/components/shared/list-shell'
import { cn } from '@/lib/utils'
import { cancelInvite, resendInvite, type PatientInviteRow } from '@/actions/invites'

interface InvitesListProps {
  invites: PatientInviteRow[]
  searchQuery: string
  fetchError?: string | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Check className="h-3 w-3" />,
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-50 text-red-600 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
    icon: <XCircle className="h-3 w-3" />,
  },
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  text_message: 'Text Message',
  sms: 'SMS',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        cfg.className
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function InviteActions({ invite }: { invite: PatientInviteRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${baseUrl}/invite/${invite.invite_token}`)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendInvite(invite.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Invite resent — link copied to clipboard')
      if (result.inviteUrl) {
        try {
          await navigator.clipboard.writeText(result.inviteUrl)
        } catch {
          // Clipboard write may fail in some contexts
        }
      }
      router.refresh()
    })
  }

  const handleCancel = () => {
    if (!confirm('Cancel this invite? The link will no longer work.')) return
    startTransition(async () => {
      const result = await cancelInvite(invite.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Invite cancelled')
      router.refresh()
    })
  }

  if (invite.status === 'pending') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-xs"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy Link'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Cancel</span>
        </Button>
      </div>
    )
  }

  if (invite.status === 'expired' || invite.status === 'cancelled') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isPending}
        className="gap-1.5 text-xs"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
        Resend
      </Button>
    )
  }

  if (invite.status === 'completed' && invite.patient_id) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/patients/${invite.patient_id}`)}
        className="gap-1.5 text-xs"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View Patient
      </Button>
    )
  }

  return null
}

export function InvitesList({ invites, searchQuery, fetchError }: InvitesListProps) {
  const router = useRouter()

  return (
    <ListShell
      isEmpty={invites.length === 0}
      error={fetchError}
      onRetry={() => router.refresh()}
      emptyIcon={<Send className="h-7 w-7" />}
      emptyTitle={searchQuery ? `No invites matching "${searchQuery}"` : 'No invites yet'}
      emptyHint={!searchQuery ? 'Use the Invite Patient button to send your first invite.' : undefined}
      desktopTable={
        <DataTable
          headers={
            <>
              <th className="px-5 py-3 text-left font-semibold">Phone</th>
              <th className="px-5 py-3 text-left font-semibold">Status</th>
              <th className="px-5 py-3 text-left font-semibold">Sent Via</th>
              <th className="px-5 py-3 text-left font-semibold">Created</th>
              <th className="px-5 py-3 text-left font-semibold">Expires</th>
              <th className="px-5 py-3 text-left font-semibold">Actions</th>
            </>
          }
          footer={
            <span>Showing {invites.length} invite{invites.length !== 1 ? 's' : ''}</span>
          }
        >
          {invites.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-outline-variant/20 transition-colors hover:bg-surface-container-low"
            >
              <td className="px-5 py-4 text-sm font-semibold text-on-surface">
                {inv.country_code}{inv.phone}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">
                {inv.delivery_channel ? CHANNEL_LABELS[inv.delivery_channel] ?? inv.delivery_channel : '—'}
              </td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">
                {formatDate(inv.created_at)}
              </td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">
                {inv.status === 'pending' ? (
                  <span className="font-medium text-amber-600">{timeLeft(inv.expires_at)}</span>
                ) : (
                  formatDate(inv.expires_at)
                )}
              </td>
              <td className="px-5 py-4">
                <InviteActions invite={inv} />
              </td>
            </tr>
          ))}
        </DataTable>
      }
      mobileCards={
        <>
          {invites.map((inv) => (
            <MobileCard key={inv.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-bold text-on-surface">
                    {inv.country_code}{inv.phone}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={inv.status} />
                    {inv.delivery_channel && (
                      <span className="text-xs text-on-surface-variant">
                        via {CHANNEL_LABELS[inv.delivery_channel] ?? inv.delivery_channel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(inv.created_at)}
                    {inv.status === 'pending' && (
                      <> · <span className="font-medium text-amber-600">{timeLeft(inv.expires_at)}</span></>
                    )}
                  </p>
                </div>
                <InviteActions invite={inv} />
              </div>
            </MobileCard>
          ))}
        </>
      }
    />
  )
}
