import { useMemo } from 'react'
import { useMindMapStore } from '../stores/mindmapStore'
import { getMindMapBreadcrumbs } from '../utils/mindMapVisibility'

export function MapBreadcrumbs() {
  const nodes = useMindMapStore((state) => state.nodes)
  const edges = useMindMapStore((state) => state.edges)
  const mapViewNodeId = useMindMapStore((state) => state.mapViewNodeId)
  const resetMapView = useMindMapStore((state) => state.resetMapView)
  const setMapViewNode = useMindMapStore((state) => state.setMapViewNode)

  const breadcrumbs = useMemo(
    () => getMindMapBreadcrumbs(nodes, edges, mapViewNodeId),
    [edges, mapViewNodeId, nodes],
  )

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav aria-label="Mind map path" className="map-breadcrumbs">
      <button onClick={resetMapView} type="button">
        전체
      </button>
      {breadcrumbs.map((node) => (
        <button
          key={node.id}
          aria-current={node.id === mapViewNodeId ? 'page' : undefined}
          onClick={() => setMapViewNode(node.id)}
          type="button"
        >
          {node.data.title}
        </button>
      ))}
    </nav>
  )
}
