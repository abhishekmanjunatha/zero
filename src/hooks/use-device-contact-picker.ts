'use client'

import { Capacitor } from '@capacitor/core'
import { Contacts, type ContactPayload } from '@capacitor-community/contacts'

export interface PickedPhoneContact {
  displayName: string
  phone: string
}

function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const hasPlusPrefix = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (!digitsOnly) return ''

  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly
}

function getDisplayName(contact: ContactPayload): string {
  const display = contact.name?.display?.trim()
  if (display) return display

  const built = [
    contact.name?.given,
    contact.name?.middle,
    contact.name?.family,
  ]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim()

  return built || 'Selected Contact'
}

function getPreferredPhone(contact: ContactPayload): string {
  const phones = contact.phones ?? []

  const preferred =
    phones.find((p) => p.isPrimary && p.number?.trim()) ??
    phones.find((p) => p.number?.trim())

  if (!preferred?.number) return ''
  return normalizePhoneNumber(preferred.number)
}

function hasContactsPermission(state: string | undefined): boolean {
  return state === 'granted' || state === 'limited'
}

export function useDeviceContactPicker() {
  const isNativeSupported = Capacitor.isNativePlatform()

  const pickPhoneContact = async (): Promise<PickedPhoneContact | null> => {
    if (!isNativeSupported) {
      throw new Error('Contact picker is only available on mobile app builds.')
    }

    const permission = await Contacts.checkPermissions()
    if (!hasContactsPermission(permission.contacts)) {
      const requested = await Contacts.requestPermissions()
      if (!hasContactsPermission(requested.contacts)) {
        throw new Error('Contacts permission was denied. Please allow access in device settings.')
      }
    }

    const { contact } = await Contacts.pickContact({
      projection: {
        name: true,
        phones: true,
      },
    })

    if (!contact) {
      return null
    }

    const phone = getPreferredPhone(contact)
    if (!phone) {
      throw new Error('Selected contact does not contain a phone number.')
    }

    return {
      displayName: getDisplayName(contact),
      phone,
    }
  }

  return {
    isNativeSupported,
    pickPhoneContact,
  }
}
