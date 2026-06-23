import type { MindMapSnapshot } from '../types/mindmap'
import { supabase } from './supabaseClient'

const STORAGE_KEY = 'markdown-maps:mvp'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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

function cacheMindMapSnapshot(snapshot: MindMapSnapshot, ownerId?: string | null) {
  window.localStorage.setItem(getStorageKey(ownerId), JSON.stringify(snapshot))
}

export async function loadMindMapSnapshot(
  ownerId?: string | null,
): Promise<MindMapSnapshot | null> {
  if (supabase && ownerId) {
    try {
      const { data, error } = await supabase
        .from('mind_map_snapshots')
        .select('snapshot')
        .eq('id', ownerId)
        .maybeSingle()

      if (error) {
        throw error
      }

      const snapshot = data?.snapshot as MindMapSnapshot | undefined

      if (snapshot) {
        cacheMindMapSnapshot(snapshot, ownerId)
        return snapshot
      }

      return loadCachedMindMapSnapshot(ownerId)
    } catch {
      return loadCachedMindMapSnapshot(ownerId)
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/mind-map`)

    if (response.status === 204) {
      return loadCachedMindMapSnapshot(ownerId)
    }

    if (!response.ok) {
      throw new Error(`Failed to load mind map snapshot: ${response.status}`)
    }

    const snapshot = (await response.json()) as MindMapSnapshot
    cacheMindMapSnapshot(snapshot, ownerId)
    return snapshot
  } catch {
    return loadCachedMindMapSnapshot(ownerId)
  }
}

export function saveMindMapSnapshot(snapshot: MindMapSnapshot, ownerId?: string | null) {
  cacheMindMapSnapshot(snapshot, ownerId)

  if (supabase && ownerId) {
    void supabase
      .from('mind_map_snapshots')
      .upsert({ id: ownerId, snapshot }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          cacheMindMapSnapshot(snapshot, ownerId)
        }
      })
    return
  }

  void fetch(`${API_BASE_URL}/api/mind-map`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  }).catch(() => {
    cacheMindMapSnapshot(snapshot, ownerId)
  })
}
