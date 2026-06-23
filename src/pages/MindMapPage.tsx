import { useEffect, useState } from 'react'
import { Panel } from '@xyflow/react'
import { DocumentModal } from '../components/DocumentModal'
import { ImportMindMapModal } from '../components/ImportMindMapModal'
import { MindMapCanvas } from '../components/MindMapCanvas'
import { TitleSearch } from '../components/TitleSearch'
import { useAuthStore } from '../stores/authStore'
import { useMindMapStore } from '../stores/mindmapStore'
import type { ThemeMode } from '../types/mindmap'

const THEME_STORAGE_KEY = 'markdown-maps:theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
    ? 'dark'
    : 'light'
}

export function MindMapPage() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const googleUser = useAuthStore((state) => state.googleUser)
  const signOut = useAuthStore((state) => state.signOut)
  const autoSaveEnabled = useMindMapStore((state) => state.autoSaveEnabled)
  const autoArrangeNodes = useMindMapStore((state) => state.autoArrangeNodes)
  const hydrateSnapshot = useMindMapStore((state) => state.hydrateSnapshot)
  const saveSnapshot = useMindMapStore((state) => state.saveSnapshot)
  const setActiveOwner = useMindMapStore((state) => state.setActiveOwner)
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    window.alert('자동으로 저장됩니다.')
    await saveSnapshot()
    await signOut()
    window.open('', '_self')
    window.close()
    window.setTimeout(() => {
      window.location.assign('/auth')
    }, 120)
  }

  useEffect(() => {
    void setActiveOwner(googleUser?.id ?? null)
  }, [googleUser?.id, setActiveOwner])

  useEffect(() => {
    void hydrateSnapshot()
  }, [googleUser?.id, hydrateSnapshot])

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!autoSaveEnabled) {
      return
    }

    const intervalId = window.setInterval(saveSnapshot, 5 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [autoSaveEnabled, saveSnapshot])

  return (
    <main className={`app-shell theme-${theme}`}>
      <section className="map-workspace" aria-label="Mind map workspace">
        <MindMapCanvas theme={theme} />
        <Panel className="floating-toolbar" position="top-left">
          <div>
            <p>Markdown Maps</p>
            <strong>{googleUser?.email ?? 'Local workspace'}</strong>
          </div>
          <button
            aria-label="Auto arrange nodes"
            className="arrange-button"
            onClick={autoArrangeNodes}
            type="button"
          >
            Auto arrange
          </button>
          <button
            aria-label={`Switch to ${nextTheme} theme`}
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            type="button"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <button className="save-button" onClick={saveSnapshot} type="button">
            Save
          </button>
          <button
            className="secondary-button"
            onClick={() => setIsImportOpen(true)}
            type="button"
          >
            Import JSON
          </button>
          <button
            className="secondary-button"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            type="button"
          >
            {isSigningOut ? 'Saving' : 'Sign out'}
          </button>
        </Panel>
        <Panel className="search-panel" position="top-right">
          <TitleSearch />
        </Panel>
      </section>
      {isImportOpen && (
        <ImportMindMapModal onClose={() => setIsImportOpen(false)} />
      )}
      <DocumentModal theme={theme} />
    </main>
  )
}
