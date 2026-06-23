import type { MindMapSnapshot } from '../types/mindmap'
import { GOOGLE_TOKEN_STORAGE_KEY } from '../stores/authStore'

const STORAGE_KEY = 'markdown-maps:mvp'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const HAS_REMOTE_API = API_BASE_URL.length > 0

function getStorageKey(ownerId?: string | null) {
  return ownerId ? `${STORAGE_KEY}:${ownerId}` : STORAGE_KEY
}

export function loadCachedMindMapSnapshot(ownerId?: string | null): MindMapSnapshot | null {
  const rawValue = window.localStorage.getItem(getStorageKey(ownerId))

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as MindMapSnapshot
  } catch {
    window.localStorage.removeItem(getStorageKey(ownerId))
    return null
  }
}

function loadCachedMindMapSnapshotWithFallback(ownerId?: string | null) {
  return loadCachedMindMapSnapshot(ownerId) ?? (ownerId ? loadCachedMindMapSnapshot() : null)
}

function cacheMindMapSnapshot(snapshot: MindMapSnapshot, ownerId?: string | null) {
  window.localStorage.setItem(getStorageKey(ownerId), JSON.stringify(snapshot))
}

function getRequestHeaders(ownerId?: string | null) {
  const headers: Record<string, string> = {}
  const googleIdToken = window.localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY)

  if (googleIdToken) {
    headers.Authorization = `Bearer ${googleIdToken}`
  } else if (ownerId) {
    headers['X-Mind-Map-Owner'] = ownerId
  }

  return headers
}

export async function loadMindMapSnapshot(
  ownerId?: string | null,
): Promise<MindMapSnapshot | null> {
  if (!HAS_REMOTE_API) {
    return loadCachedMindMapSnapshotWithFallback(ownerId)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/mind-map`, {
      headers: getRequestHeaders(ownerId),
    })

    if (response.status === 204) {
      return loadCachedMindMapSnapshotWithFallback(ownerId)
    }

    if (!response.ok) {
      throw new Error(`Failed to load mind map snapshot: ${response.status}`)
    }

    const snapshot = (await response.json()) as MindMapSnapshot
    cacheMindMapSnapshot(snapshot, ownerId)
    return snapshot
  } catch {
    return loadCachedMindMapSnapshotWithFallback(ownerId)
  }
}

export async function hasMindMapSnapshot(ownerId?: string | null) {
  if (!HAS_REMOTE_API) {
    return Boolean(loadCachedMindMapSnapshotWithFallback(ownerId))
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/mind-map`, {
      headers: getRequestHeaders(ownerId),
    })

    return response.ok && response.status !== 204
  } catch {
    return Boolean(loadCachedMindMapSnapshotWithFallback(ownerId))
  }
}

export async function saveMindMapSnapshot(snapshot: MindMapSnapshot, ownerId?: string | null) {
  cacheMindMapSnapshot(snapshot, ownerId)

  if (!HAS_REMOTE_API) {
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/mind-map`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getRequestHeaders(ownerId),
      },
      body: JSON.stringify(snapshot),
    })

    if (!response.ok) {
      throw new Error(`Failed to save mind map snapshot: ${response.status}`)
    }
  } catch {
    cacheMindMapSnapshot(snapshot, ownerId)
  }
}
