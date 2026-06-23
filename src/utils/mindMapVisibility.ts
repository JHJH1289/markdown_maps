import type { MindMapFlowEdge, MindMapFlowNode } from '../types/mindmap'
import { arrangeNodesFromCurrentPositions } from './mindMapLayout'

function buildGraph(nodes: MindMapFlowNode[], edges: MindMapFlowEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const childrenByNodeId = new Map<string, string[]>()
  const parentByNodeId = new Map<string, string>()
  const incomingCounts = new Map<string, number>()

  for (const node of nodes) {
    childrenByNodeId.set(node.id, [])
    incomingCounts.set(node.id, 0)
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue
    }

    childrenByNodeId.get(edge.source)?.push(edge.target)
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1)

    if (!parentByNodeId.has(edge.target)) {
      parentByNodeId.set(edge.target, edge.source)
    }
  }

  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y
      }

      return a.position.x - b.position.x
    })

  return { childrenByNodeId, parentByNodeId, roots }
}

export function getAncestorIds(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
  nodeId: string | null,
) {
  if (!nodeId) {
    return []
  }

  const { parentByNodeId } = buildGraph(nodes, edges)
  const ancestors: string[] = []
  let currentId = nodeId

  while (parentByNodeId.has(currentId)) {
    const parentId = parentByNodeId.get(currentId)

    if (!parentId || ancestors.includes(parentId)) {
      break
    }

    ancestors.unshift(parentId)
    currentId = parentId
  }

  return ancestors
}

export function getVisibleMindMap(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
  viewNodeId: string | null,
  expandedNodeIds: string[] = [],
) {
  if (nodes.length === 0) {
    return { edges, nodeIds: new Set<string>(), nodes }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const { childrenByNodeId, roots } = buildGraph(nodes, edges)
  const rootIds = roots.length > 0 ? roots.map((node) => node.id) : [nodes[0].id]
  const rootIdSet = new Set(rootIds)
  const activeNodeId =
    viewNodeId && nodeById.has(viewNodeId) ? viewNodeId : rootIds[0]
  const ancestorIds = getAncestorIds(nodes, edges, activeNodeId)
  const expandedIds = expandedNodeIds.filter((nodeId) => nodeById.has(nodeId))
  const visibleIds = new Set<string>(rootIds)

  for (const rootId of rootIds) {
    for (const childId of childrenByNodeId.get(rootId) ?? []) {
      visibleIds.add(childId)
    }
  }

  for (const ancestorId of ancestorIds) {
    visibleIds.add(ancestorId)
  }

  visibleIds.add(activeNodeId)
  expandedIds.forEach((nodeId) => {
    visibleIds.add(nodeId)

    for (const ancestorId of getAncestorIds(nodes, edges, nodeId)) {
      visibleIds.add(ancestorId)
    }
  })

  for (const expandedId of expandedIds) {
    if (rootIdSet.has(expandedId)) {
      continue
    }

    for (const childId of childrenByNodeId.get(expandedId) ?? []) {
      visibleIds.add(childId)
    }
  }

  const visibleNodes = nodes.filter((node) => visibleIds.has(node.id))
  const visibleEdges = edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
  )
  const arrangedVisible = arrangeNodesFromCurrentPositions(
    visibleNodes.map((node) => ({ ...node })),
    visibleEdges,
  )

  return {
    edges: arrangedVisible.edges,
    nodeIds: visibleIds,
    nodes: arrangedVisible.nodes,
  }
}

export function getMindMapBreadcrumbs(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
  viewNodeId: string | null,
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  if (!viewNodeId || !nodeById.has(viewNodeId)) {
    const { roots } = buildGraph(nodes, edges)
    const root = roots[0] ?? nodes[0]
    return root ? [root] : []
  }

  return [...getAncestorIds(nodes, edges, viewNodeId), viewNodeId]
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is MindMapFlowNode => Boolean(node))
}
