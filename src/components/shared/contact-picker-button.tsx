'use client'

import { useState } from 'react'
import { BookUser, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDeviceContactPicker, type PickedPhoneContact } from '@/hooks/use-device-contact-picker'

interface ContactPickerButtonProps {
  onContactPicked: (contact: PickedPhoneContact) => void
  className?: string
  title?: string
  ariaLabel?: string
}

export function ContactPickerButton({
  onContactPicked,
  className,
  title = 'Pick from contacts',
  ariaLabel = 'Pick from contacts',
}: ContactPickerButtonProps) {
  const { isNativeSupported, pickPhoneContact } = useDeviceContactPicker()
  const [isPicking, setIsPicking] = useState(false)

  if (!isNativeSupported) {
    return null
  }

  const handlePick = async () => {
    setIsPicking(true)
    try {
      const contact = await pickPhoneContact()
      if (!contact) return
      onContactPicked(contact)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read contacts.'
      toast.error(message)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handlePick}
      disabled={isPicking}
      title={title}
      aria-label={ariaLabel}
    >
      {isPicking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookUser className="h-4 w-4" />}
    </Button>
  )
}
