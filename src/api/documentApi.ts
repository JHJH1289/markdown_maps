import type { MindMapSnapshot } from '../types/mindmap'

const STORAGE_KEY = 'markdown-maps:mvp'

export function loadMindMapSnapshot(): MindMapSnapshot | null {
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

export function saveMindMapSnapshot(snapshot: MindMapSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}
