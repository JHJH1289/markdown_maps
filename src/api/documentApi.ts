import type { MindMapSnapshot } from '../types/mindmap'

const STORAGE_KEY = 'markdown-maps:mvp'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export function loadCachedMindMapSnapshot(): MindMapSnapshot | null {
  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as MindMapSnapshot
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function cacheMindMapSnapshot(snapshot: MindMapSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export async function loadMindMapSnapshot(): Promise<MindMapSnapshot | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/mind-map`)

    if (response.status === 204) {
      return loadCachedMindMapSnapshot()
    }

    if (!response.ok) {
      throw new Error(`Failed to load mind map snapshot: ${response.status}`)
    }

    const snapshot = (await response.json()) as MindMapSnapshot
    cacheMindMapSnapshot(snapshot)
    return snapshot
  } catch {
    return loadCachedMindMapSnapshot()
  }
}

export function saveMindMapSnapshot(snapshot: MindMapSnapshot) {
  cacheMindMapSnapshot(snapshot)

  void fetch(`${API_BASE_URL}/api/mind-map`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  }).catch(() => {
    cacheMindMapSnapshot(snapshot)
  })
}
