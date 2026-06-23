import { useEffect, useState } from 'react'
import { Panel } from '@xyflow/react'
import { DocumentModal } from '../components/DocumentModal'
import { ImportMindMapModal } from '../components/ImportMindMapModal'
import { MapBreadcrumbs } from '../components/MapBreadcrumbs'
import { MindMapCanvas } from '../components/MindMapCanvas'
import { TitleSearch } from '../components/TitleSearch'
import { useWorkspaceSession } from '../hooks/useWorkspaceSession'
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
  const signOut = useAuthStore((state) => state.signOut)
  const autoArrangeNodes = useMindMapStore((state) => state.autoArrangeNodes)
  const { isReady, ownerEmail, saveSnapshot } = useWorkspaceSession()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    await saveSnapshot()
    await signOut()
    window.location.assign('/auth')
  }

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  if (!isReady) {
    return (
      <main className={`app-shell theme-${theme}`}>
        <section className="map-loading-panel">
          <p>Markdown Maps</p>
          <strong>Loading workspace</strong>
        </section>
      </main>
    )
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <section className="map-workspace" aria-label="Mind map workspace">
        <MindMapCanvas theme={theme} />
        <Panel className="top-workspace-bar" position="top-left">
          <div className="floating-toolbar">
            <div>
              <p>Markdown Maps</p>
              <strong>{ownerEmail}</strong>
            </div>
            <div className="toolbar-action-group">
              <button
                aria-label="Auto arrange nodes"
                className="arrange-button"
                onClick={autoArrangeNodes}
                type="button"
              >
                Auto arrange
              </button>
              <button
                className="secondary-button"
                onClick={() => setIsImportOpen(true)}
                type="button"
              >
                Import JSON
              </button>
            </div>
            <div className="toolbar-action-group toolbar-secondary-group">
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
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
                type="button"
              >
                {isSigningOut ? 'Saving' : 'Sign out'}
              </button>
            </div>
          </div>
          <div className="search-panel">
            <TitleSearch />
          </div>
        </Panel>
        <Panel className="breadcrumb-panel" position="bottom-center">
          <MapBreadcrumbs />
        </Panel>
      </section>
      {isImportOpen && (
        <ImportMindMapModal onClose={() => setIsImportOpen(false)} />
      )}
      <DocumentModal theme={theme} />
    </main>
  )
}
