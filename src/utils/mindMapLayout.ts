import type { Edge, XYPosition } from '@xyflow/react'
import type { MindMapFlowEdge, MindMapFlowNode } from '../types/mindmap'

export type Direction = 'bottom' | 'left' | 'right' | 'top'
export type HorizontalDirection = 'left' | 'right'

const nodeSize = {
  height: 88,
  width: 176,
}

const layoutSpacing = {
  x: 240,
  y: 116,
}

const directionOrder: Direction[] = ['left', 'right', 'bottom', 'top']

const oppositeDirections: Record<Direction, Direction> = {
  bottom: 'top',
  left: 'right',
  right: 'left',
  top: 'bottom',
}

function getNodeCenter(node: MindMapFlowNode) {
  const width = node.measured?.width ?? node.width ?? nodeSize.width
  const height = node.measured?.height ?? node.height ?? nodeSize.height

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  }
}

function getDirection(source: MindMapFlowNode, target: MindMapFlowNode): Direction {
  const sourceCenter = getNodeCenter(source)
  const targetCenter = getNodeCenter(target)
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y

  if (Math.abs(dx) >= nodeSize.width * 0.42) {
    return dx < 0 ? 'left' : 'right'
  }

  return dy < 0 ? 'top' : 'bottom'
}

function getDirectedEdge(
  edge: MindMapFlowEdge,
  source: MindMapFlowNode,
  target: MindMapFlowNode,
): MindMapFlowEdge {
  const direction = getDirection(source, target)

  return {
    ...edge,
    sourceHandle: `source-${direction}`,
    targetHandle: `target-${oppositeDirections[direction]}`,
  }
}

function isPositionChange(
  change: { type: string },
): change is { dragging?: boolean; type: 'position' } {
  return change.type === 'position'
}

function getSortedNodes(nodes: MindMapFlowNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y
    }

    return a.position.x - b.position.x
  })
}

function getChildSorter(
  nodeById: Map<string, MindMapFlowNode>,
  parentId: string,
  direction: Direction,
) {
  const parent = nodeById.get(parentId)

  return (firstId: string, secondId: string) => {
    const first = nodeById.get(firstId)
    const second = nodeById.get(secondId)

    if (!parent || !first || !second) {
      return 0
    }

    if (direction === 'left' || direction === 'right') {
      return first.position.y - second.position.y
    }

    return first.position.x - second.position.x
  }
}

function getPerpendicularSpacing(direction: Direction) {
  return direction === 'left' || direction === 'right'
    ? layoutSpacing.y
    : layoutSpacing.x
}

export function shouldOrientEdgesAfterNodeChanges(
  changes: { type: string }[],
) {
  return changes.some(isPositionChange)
}

export function orientEdgesToNodePositions(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return edges.map((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    if (!source || !target) {
      return edge
    }

    return getDirectedEdge(edge, source, target)
  })
}

export function orientConnectionToNodePositions(
  nodes: MindMapFlowNode[],
  edge: MindMapFlowEdge | Edge,
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const source = nodeById.get(edge.source)
  const target = nodeById.get(edge.target)

  if (!source || !target) {
    return edge
  }

  return getDirectedEdge(edge as MindMapFlowEdge, source, target)
}

export function arrangeNodesFromCurrentPositions(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
) {
  if (nodes.length === 0) {
    return { edges, nodes }
  }

  const orderedNodes = getSortedNodes(nodes)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const validNodeIds = new Set(nodes.map((node) => node.id))
  const childrenByNodeId = new Map<string, string[]>()
  const incomingCounts = new Map<string, number>()

  for (const node of orderedNodes) {
    childrenByNodeId.set(node.id, [])
    incomingCounts.set(node.id, 0)
  }

  for (const edge of edges) {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) {
      continue
    }

    childrenByNodeId.get(edge.source)?.push(edge.target)
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1)
  }

  const roots = orderedNodes.filter(
    (node) => (incomingCounts.get(node.id) ?? 0) === 0,
  )
  const layoutRoots = roots.length > 0 ? roots : [orderedNodes[0]]
  const rootIds = new Set(layoutRoots.map((root) => root.id))
  const positions = new Map<string, XYPosition>()
  const visited = new Set<string>()
  const sizeCache = new Map<string, number>()

  const getChildrenByDirection = (nodeId: string) => {
    const parent = nodeById.get(nodeId)
    const groups = new Map<Direction, string[]>(
      directionOrder.map((direction) => [direction, []]),
    )

    if (!parent) {
      return groups
    }

    const childIds = [...(childrenByNodeId.get(nodeId) ?? [])]

    if (rootIds.has(nodeId)) {
      childIds.sort(getChildSorter(nodeById, nodeId, 'right'))

      childIds.forEach((childId, index) => {
        if (visited.has(childId)) {
          return
        }

        groups.get(index % 2 === 0 ? 'left' : 'right')?.push(childId)
      })

      return groups
    }

    for (const childId of childIds) {
      const child = nodeById.get(childId)

      if (!child || visited.has(childId)) {
        continue
      }

      groups.get(getDirection(parent, child))?.push(childId)
    }

    for (const direction of directionOrder) {
      groups.get(direction)?.sort(getChildSorter(nodeById, nodeId, direction))
    }

    return groups
  }

  const getBranchSize = (nodeId: string, ancestors = new Set<string>()): number => {
    if (sizeCache.has(nodeId)) {
      return sizeCache.get(nodeId) ?? 1
    }

    if (ancestors.has(nodeId)) {
      return 1
    }

    const nextAncestors = new Set(ancestors)
    nextAncestors.add(nodeId)
    const children = childrenByNodeId.get(nodeId) ?? []

    if (children.length === 0) {
      sizeCache.set(nodeId, 1)
      return 1
    }

    const size = Math.max(
      1,
      children.reduce(
        (total, childId) => total + getBranchSize(childId, nextAncestors),
        0,
      ),
    )
    sizeCache.set(nodeId, size)
    return size
  }

  const placeNode = (nodeId: string, position: XYPosition) => {
    if (visited.has(nodeId)) {
      return
    }

    visited.add(nodeId)
    positions.set(nodeId, position)

    const groups = getChildrenByDirection(nodeId)

    for (const direction of directionOrder) {
      const children = groups.get(direction) ?? []

      if (children.length === 0) {
        continue
      }

      const spacing = getPerpendicularSpacing(direction)
      const totalSize = children.reduce(
        (total, childId) => total + getBranchSize(childId),
        0,
      )
      let cursor = -((totalSize - 1) * spacing) / 2

      for (const childId of children) {
        const childSize = getBranchSize(childId)
        const offset = cursor + ((childSize - 1) * spacing) / 2
        cursor += childSize * spacing

        const childPosition =
          direction === 'right'
            ? { x: position.x + layoutSpacing.x, y: position.y + offset }
            : direction === 'left'
              ? { x: position.x - layoutSpacing.x, y: position.y + offset }
              : direction === 'bottom'
                ? { x: position.x + offset, y: position.y + layoutSpacing.y }
                : { x: position.x + offset, y: position.y - layoutSpacing.y }

        placeNode(childId, childPosition)
      }
    }
  }

  for (const root of layoutRoots) {
    placeNode(root.id, root.position)
  }

  for (const node of orderedNodes) {
    if (!visited.has(node.id)) {
      placeNode(node.id, node.position)
    }
  }

  const nextNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))

  return {
    nodes: nextNodes,
    edges: orientEdgesToNodePositions(nextNodes, edges),
  }
}

export function arrangeNodeBranchToDirection(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
  rootId: string,
  direction: HorizontalDirection,
) {
  const root = nodes.find((node) => node.id === rootId)

  if (!root) {
    return { edges, nodes }
  }

  const childrenByNodeId = new Map<string, string[]>()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const positions = new Map<string, XYPosition>()
  const sizeCache = new Map<string, number>()
  const visited = new Set<string>()

  for (const node of nodes) {
    childrenByNodeId.set(node.id, [])
  }

  for (const edge of edges) {
    if (nodeById.has(edge.source) && nodeById.has(edge.target)) {
      childrenByNodeId.get(edge.source)?.push(edge.target)
    }
  }

  for (const [nodeId, children] of childrenByNodeId) {
    children.sort(getChildSorter(nodeById, nodeId, direction))
  }

  const getBranchSize = (nodeId: string, ancestors = new Set<string>()): number => {
    if (sizeCache.has(nodeId)) {
      return sizeCache.get(nodeId) ?? 1
    }

    if (ancestors.has(nodeId)) {
      return 1
    }

    const nextAncestors = new Set(ancestors)
    nextAncestors.add(nodeId)
    const children = childrenByNodeId.get(nodeId) ?? []

    if (children.length === 0) {
      sizeCache.set(nodeId, 1)
      return 1
    }

    const size = Math.max(
      1,
      children.reduce(
        (total, childId) => total + getBranchSize(childId, nextAncestors),
        0,
      ),
    )
    sizeCache.set(nodeId, size)
    return size
  }

  const placeChildren = (parentId: string, parentPosition: XYPosition) => {
    if (visited.has(parentId)) {
      return
    }

    visited.add(parentId)
    const children = childrenByNodeId.get(parentId) ?? []

    if (children.length === 0) {
      return
    }

    const totalSize = children.reduce(
      (total, childId) => total + getBranchSize(childId),
      0,
    )
    let cursor = -((totalSize - 1) * layoutSpacing.y) / 2

    for (const childId of children) {
      const childSize = getBranchSize(childId)
      const offset = cursor + ((childSize - 1) * layoutSpacing.y) / 2
      cursor += childSize * layoutSpacing.y

      const childPosition = {
        x:
          direction === 'right'
            ? parentPosition.x + layoutSpacing.x
            : parentPosition.x - layoutSpacing.x,
        y: parentPosition.y + offset,
      }

      positions.set(childId, childPosition)
      placeChildren(childId, childPosition)
    }
  }

  positions.set(root.id, root.position)
  placeChildren(root.id, root.position)

  const nextNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))

  return {
    nodes: nextNodes,
    edges: orientEdgesToNodePositions(nextNodes, edges),
  }
}
