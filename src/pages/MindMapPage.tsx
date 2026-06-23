import { Panel } from '@xyflow/react'
import { DocumentModal } from '../components/DocumentModal'
import { MindMapCanvas } from '../components/MindMapCanvas'
import { TitleSearch } from '../components/TitleSearch'
import { useAuthStore } from '../stores/authStore'
import { useMindMapStore } from '../stores/mindmapStore'

export function MindMapPage() {
  const addNode = useMindMapStore((state) => state.addNode)
  const signOut = useAuthStore((state) => state.signOut)
  const user = useAuthStore((state) => state.user)

  return (
    <main className="app-shell">
      <section className="map-workspace" aria-label="mind map workspace">
        <MindMapCanvas />
        <Panel className="floating-toolbar" position="top-left">
          <div>
            <p>Markdown Maps</p>
            <strong>{user?.email ?? 'Workspace'}</strong>
          </div>
          <button onClick={addNode} type="button">
            {'\uc0c8 \ub178\ub4dc'}
          </button>
          <button className="secondary-button" onClick={signOut} type="button">
            {'\ub85c\uadf8\uc544\uc6c3'}
          </button>
        </Panel>
        <Panel className="search-panel" position="top-right">
          <TitleSearch />
        </Panel>
      </section>
      <DocumentModal />
    </main>
  )
}
