import type {
  MarkdownDocument,
  MindMapFlowEdge,
  MindMapFlowNode,
  MindMapSnapshot,
} from '../types/mindmap'
import {
  arrangeNodesFromCurrentPositions,
  orientEdgesToNodePositions,
  type HorizontalDirection,
} from './mindMapLayout'

type SimpleMindMapNode = {
  children?: SimpleMindMapNode[]
  data?: {
    text?: unknown
  }
}

type SimpleMindMapPayload = {
  data?: unknown
  simpleMindMap?: unknown
}

const edgeStyle = { stroke: '#4f6f86', strokeWidth: 2 }
const layoutSpacing = {
  x: 240,
  y: 116,
}

function isSimpleNode(value: unknown): value is SimpleMindMapNode {
  if (!value || typeof value !== 'object') {
    return false
  }

  const node = value as SimpleMindMapNode
  return Boolean(node.data && typeof node.data === 'object')
}

function getNodeTitle(node: SimpleMindMapNode, fallbackIndex: number) {
  const rawText = node.data?.text

  if (typeof rawText !== 'string') {
    return `Untitled ${fallbackIndex}`
  }

  const title = rawText.trim()
  return title || `Untitled ${fallbackIndex}`
}

function getNodeSummary(node: SimpleMindMapNode) {
  const children = Array.isArray(node.children) ? node.children : []
  const childTitles = children
    .filter(isSimpleNode)
    .map((child, index) => getNodeTitle(child, index + 1))

  if (childTitles.length === 0) {
    return ''
  }

  return `\n\n## Children\n\n${childTitles.map((title) => `- ${title}`).join('\n')}`
}

function parsePayload(input: string | SimpleMindMapPayload) {
  const payload =
    typeof input === 'string' ? (JSON.parse(input) as SimpleMindMapPayload) : input

  if (!payload || typeof payload !== 'object') {
    throw new Error('Import data must be a JSON object.')
  }

  if (payload.simpleMindMap !== true) {
    throw new Error('JSON must include "simpleMindMap": true.')
  }

  if (!Array.isArray(payload.data)) {
    throw new Error('JSON must include a data array.')
  }

  const roots = payload.data.filter(isSimpleNode)

  if (roots.length === 0) {
    throw new Error('No mind map nodes were found in data.')
  }

  return roots
}

export function createSnapshotFromSimpleMindMap(
  input: string | SimpleMindMapPayload,
): MindMapSnapshot {
  const roots = parsePayload(input)
  const createdAt = new Date().toISOString()
  const nodes: MindMapFlowNode[] = []
  const edges: MindMapFlowEdge[] = []
  const documents: MarkdownDocument[] = []
  const childrenByNodeId = new Map<string, string[]>()
  const positions = new Map<string, { x: number; y: number }>()
  let nodeIndex = 0

  const visit = (
    simpleNode: SimpleMindMapNode,
    parentId: string | null,
  ): string => {
    nodeIndex += 1
    const index = nodeIndex
    const nodeId = `node-import-${index}`
    const documentId = `doc-import-${index}`
    const title = getNodeTitle(simpleNode, index)
    const children = Array.isArray(simpleNode.children)
      ? simpleNode.children.filter(isSimpleNode)
      : []

    if (parentId) {
      edges.push({
        id: `edge-import-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        animated: false,
        style: edgeStyle,
      })
      childrenByNodeId.get(parentId)?.push(nodeId)
    }

    childrenByNodeId.set(nodeId, [])

    documents.push({
      id: documentId,
      title,
      content: `# ${title}${getNodeSummary(simpleNode)}`,
      updatedAt: createdAt,
    })

    nodes.push({
      id: nodeId,
      type: 'mindMapNode',
      position: { x: 420, y: 160 },
      data: {
        title,
        documentId,
        status: '',
      },
    })

    children.forEach((child) => visit(child, nodeId))
    return nodeId
  }

  const rootIds = roots.map((root) => visit(root, null))

  const getBranchSize = (nodeId: string): number => {
    const childIds = childrenByNodeId.get(nodeId) ?? []

    if (childIds.length === 0) {
      return 1
    }

    return childIds.reduce((total, childId) => total + getBranchSize(childId), 0)
  }

  const placeBranch = (
    nodeId: string,
    position: { x: number; y: number },
    direction: HorizontalDirection,
  ) => {
    positions.set(nodeId, position)

    const childIds = childrenByNodeId.get(nodeId) ?? []

    if (childIds.length === 0) {
      return
    }

    const totalSize = childIds.reduce(
      (total, childId) => total + getBranchSize(childId),
      0,
    )
    let cursor = -((totalSize - 1) * layoutSpacing.y) / 2

    for (const childId of childIds) {
      const childSize = getBranchSize(childId)
      const offset = cursor + ((childSize - 1) * layoutSpacing.y) / 2
      cursor += childSize * layoutSpacing.y

      placeBranch(
        childId,
        {
          x:
            direction === 'right'
              ? position.x + layoutSpacing.x
              : position.x - layoutSpacing.x,
          y: position.y + offset,
        },
        direction,
      )
    }
  }

  rootIds.forEach((rootId, rootIndex) => {
    const rootPosition = {
      x: 420,
      y: 160 + rootIndex * layoutSpacing.y * 2,
    }
    positions.set(rootId, rootPosition)

    const childIds = childrenByNodeId.get(rootId) ?? []
    const sideGroups: Record<HorizontalDirection, string[]> = {
      left: [],
      right: [],
    }

    childIds.forEach((childId, childIndex) => {
      const direction = childIndex % 2 === 0 ? 'left' : 'right'
      sideGroups[direction].push(childId)
    })

    for (const direction of ['left', 'right'] as const) {
      const sideChildren = sideGroups[direction]
      const totalSize = sideChildren.reduce(
        (total, childId) => total + getBranchSize(childId),
        0,
      )
      let cursor = -((totalSize - 1) * layoutSpacing.y) / 2

      for (const childId of sideChildren) {
        const childSize = getBranchSize(childId)
        const offset = cursor + ((childSize - 1) * layoutSpacing.y) / 2
        cursor += childSize * layoutSpacing.y

        placeBranch(
          childId,
          {
            x:
              direction === 'right'
                ? rootPosition.x + layoutSpacing.x
                : rootPosition.x - layoutSpacing.x,
            y: rootPosition.y + offset,
          },
          direction,
        )
      }
    }
  })

  const positionedNodes = nodes.map((node, index) => {
    const position = positions.get(node.id)

    return {
      ...node,
      selected: index === 0,
      position: position ?? node.position,
    }
  })
  const arranged = arrangeNodesFromCurrentPositions(
    positionedNodes,
    orientEdgesToNodePositions(positionedNodes, edges),
  )

  return {
    nodes: arranged.nodes,
    edges: arranged.edges,
    documents,
    selectedDocumentId: documents[0]?.id ?? null,
  }
}
