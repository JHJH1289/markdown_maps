import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useMindMapStore } from '../stores/mindmapStore'

const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000

export function useWorkspaceSession() {
  const googleUser = useAuthStore((state) => state.googleUser)
  const autoSaveEnabled = useMindMapStore((state) => state.autoSaveEnabled)
  const saveSnapshot = useMindMapStore((state) => state.saveSnapshot)
  const setActiveOwner = useMindMapStore((state) => state.setActiveOwner)
  const activeOwnerId = googleUser?.id ?? null
  const [readyOwnerId, setReadyOwnerId] = useState<string | null>(null)
  const isReady = readyOwnerId === activeOwnerId

  useEffect(() => {
    let isMounted = true

    void setActiveOwner(activeOwnerId).then(() => {
      if (isMounted) {
        setReadyOwnerId(activeOwnerId)
      }
    })

    return () => {
      isMounted = false
    }
  }, [activeOwnerId, setActiveOwner])

  useEffect(() => {
    if (!autoSaveEnabled || !isReady) {
      return
    }

    const intervalId = window.setInterval(saveSnapshot, AUTO_SAVE_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [autoSaveEnabled, isReady, saveSnapshot])

  return {
    isReady,
    ownerEmail: googleUser?.email ?? 'Local workspace',
    saveSnapshot,
  }
}
