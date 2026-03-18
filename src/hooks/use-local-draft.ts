'use client'

import { useCallback, useEffect, useRef } from 'react'

interface UseLocalDraftOptions {
  storageKey: string
  debounceMs?: number
}

export function useLocalDraft<T>({
  storageKey,
  debounceMs = 500,
}: UseLocalDraftOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadDraft = useCallback((): T | null => {
    if (typeof window === 'undefined') return null

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }, [storageKey])

  const saveDraft = useCallback(
    (value: T) => {
      if (typeof window === 'undefined') return

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(value))
        } catch {
          // Ignore storage quota/private mode errors so editing is not interrupted.
        }
      }, debounceMs)
    },
    [storageKey, debounceMs]
  )

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    window.localStorage.removeItem(storageKey)
  }, [storageKey])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    loadDraft,
    saveDraft,
    clearDraft,
  }
}
