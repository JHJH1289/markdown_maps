import { useEffect, useState } from 'react'
import { Panel } from '@xyflow/react'
import { DocumentModal } from '../components/DocumentModal'
import { MindMapCanvas } from '../components/MindMapCanvas'
import { TitleSearch } from '../components/TitleSearch'
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
  const autoArrangeNodes = useMindMapStore((state) => state.autoArrangeNodes)
  const hydrateSnapshot = useMindMapStore((state) => state.hydrateSnapshot)
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    void hydrateSnapshot()
  }, [hydrateSnapshot])

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return (
    <main className={`app-shell theme-${theme}`}>
      <section className="map-workspace" aria-label="Mind map workspace">
        <MindMapCanvas theme={theme} />
        <Panel className="floating-toolbar" position="top-left">
          <div>
            <p>Markdown Maps</p>
            <strong>JSON workspace</strong>
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
        </Panel>
        <Panel className="search-panel" position="top-right">
          <TitleSearch />
        </Panel>
      </section>
      <DocumentModal theme={theme} />
    </main>
  )
}
