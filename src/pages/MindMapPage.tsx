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
      <section className="map-workspace" aria-label="마인드맵 작업공간">
        <MindMapCanvas theme={theme} />
        <Panel className="floating-toolbar" position="top-left">
          <div>
            <p>Markdown Map</p>
            <strong>마인드맵 문서 작업공간</strong>
          </div>
          <button
            aria-label="노드 자동 정렬"
            className="arrange-button"
            onClick={autoArrangeNodes}
            type="button"
          >
            자동 정렬
          </button>
          <button
            aria-label={`${nextTheme === 'dark' ? '어두운' : '밝은'} 테마로 변경`}
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            type="button"
          >
            {theme === 'light' ? '다크' : '라이트'}
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
