import { Panel } from '@xyflow/react'
import { DocumentModal } from '../components/DocumentModal'
import { MindMapCanvas } from '../components/MindMapCanvas'
import { TitleSearch } from '../components/TitleSearch'
import { useMindMapStore } from '../stores/mindmapStore'

export function MindMapPage() {
  const addNode = useMindMapStore((state) => state.addNode)

  return (
    <main className="app-shell">
      <section className="map-workspace" aria-label="마인드맵 작업공간">
        <MindMapCanvas />
        <Panel className="floating-toolbar" position="top-left">
          <div>
            <p>마크다운 맵</p>
            <strong>마인드맵 문서 작업공간</strong>
          </div>
          <button onClick={addNode} type="button">
            새 노드
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
