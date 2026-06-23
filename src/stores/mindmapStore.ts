import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { create } from 'zustand'
import {
  loadCachedMindMapSnapshot,
  loadMindMapSnapshot,
  saveMindMapSnapshot,
} from '../api/documentApi'
import type {
  DocumentId,
  MarkdownDocument,
  MindMapFlowEdge,
  MindMapFlowNode,
  MindMapNodeStatus,
  MindMapSnapshot,
} from '../types/mindmap'

const now = () => new Date().toISOString()
const edgeStyle = { stroke: '#4f6f86', strokeWidth: 2 }
const layoutSpacing = {
  x: 300,
  y: 132,
}

const text = {
  copiedSuffix: '\ubcf5\uc0ac\ubcf8',
  documentFallback: '\ubb38\uc11c',
  newNode: '\uc0c8 \ub178\ub4dc',
  newNodeBody: '\uc5ec\uae30\uc5d0 \ub0b4\uc6a9\uc744 \uc791\uc131\ud558\uc138\uc694.',
}

const legacyTitles: Record<string, string> = {
  'React Frontend': '\ub9ac\uc561\ud2b8 \ud504\ub860\ud2b8\uc5d4\ub4dc',
  'Document API': '\ubb38\uc11c API',
  'Markdown Storage': '\ub9c8\ud06c\ub2e4\uc6b4 \uc800\uc7a5\uc18c',
}

const initialSnapshot: MindMapSnapshot = {
  selectedDocumentId: 'doc-default',
  nodes: [
    {
      id: 'node-default',
      type: 'mindMapNode',
      position: { x: 160, y: 140 },
      data: {
        title: `${text.newNode} 1`,
        documentId: 'doc-default',
        status: '',
      },
    },
  ],
  edges: [],
  documents: [
    {
      id: 'doc-default',
      title: `${text.newNode} 1`,
      content: `# ${text.newNode} 1\n\n${text.newNodeBody}`,
      updatedAt: now(),
    },
  ],
}

type MindMapState = MindMapSnapshot & {
  autoSaveEnabled: boolean
  copiedNodeIds: string[]
  focusedNodeId: string | null
  hydrateSnapshot: () => Promise<void>
  isDocumentModalOpen: boolean
  selectedDocument: MarkdownDocument | null
  ownerId: string | null
  addNode: () => void
  addNodeAtPosition: (position: XYPosition) => void
  autoArrangeNodes: () => void
  clearFocusedNode: () => void
  closeDocument: () => void
  copySelectedNodes: () => void
  deleteEdge: (edgeId: string) => void
  deleteNode: (nodeId: string) => void
  deleteSelectedElements: () => void
  focusDocumentNode: (documentId: DocumentId) => void
  onConnect: (connection: Connection) => void
  onEdgesChange: (changes: EdgeChange<MindMapFlowEdge>[]) => void
  onNodesChange: (changes: NodeChange<MindMapFlowNode>[]) => void
  pasteCopiedNodes: () => void
  saveSnapshot: () => Promise<void>
  selectDocument: (documentId: DocumentId) => void
  selectNodesInRect: (rect: {
    maxX: number
    maxY: number
    minX: number
    minY: number
  }) => void
  setActiveOwner: (ownerId: string | null) => Promise<void>
  toggleAutoSave: () => void
  updateDocumentContent: (documentId: DocumentId, content: string) => void
  updateDocumentStatus: (
    documentId: DocumentId,
    status: MindMapNodeStatus,
  ) => void
  updateDocumentTitle: (documentId: DocumentId, title: string) => void
}

function persist(snapshot: MindMapSnapshot, ownerId: string | null) {
  saveMindMapSnapshot(snapshot, ownerId)
  return snapshot
}

function withSelectedDocument(snapshot: MindMapSnapshot) {
  return {
    ...snapshot,
    selectedDocument:
      snapshot.documents.find((doc) => doc.id === snapshot.selectedDocumentId) ?? null,
  }
}

function normalizeSnapshot(snapshot: MindMapSnapshot): MindMapSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        title: legacyTitles[node.data.title] ?? node.data.title,
        status: typeof node.data.status === 'string' ? node.data.status : '',
      },
    })),
    edges: snapshot.edges.map((edge) => ({
      ...edge,
      animated: false,
      style: edgeStyle,
    })),
    documents: snapshot.documents.map((document) => ({
      ...document,
      title: legacyTitles[document.title] ?? document.title,
    })),
  }
}

const bootSnapshot = normalizeSnapshot(loadCachedMindMapSnapshot() ?? initialSnapshot)

export const useMindMapStore = create<MindMapState>((set, get) => ({
  ...withSelectedDocument(bootSnapshot),
  autoSaveEnabled: true,
  copiedNodeIds: [],
  focusedNodeId: null,
  isDocumentModalOpen: false,
  ownerId: null,

  hydrateSnapshot: async () => {
    const ownerId = get().ownerId
    const snapshot = await loadMindMapSnapshot(ownerId)

    if (snapshot) {
      set((state) => ({
        ...state,
        ...withSelectedDocument(normalizeSnapshot(snapshot)),
      }))
    }
  },

  addNode: () => {
    const index = get().nodes.length + 1
    get().addNodeAtPosition({ x: 140 + index * 28, y: 120 + index * 22 })
  },

  addNodeAtPosition: (position) => {
    const createdAt = now()

    set((state) => {
      const index = state.nodes.length + 1
      const documentId = `doc-${Date.now()}`
      const nodeId = `node-${Date.now()}`
      const title = `${text.newNode} ${index}`
      const nextNodes: MindMapFlowNode[] = [
        ...state.nodes.map((node) => ({ ...node, selected: false })),
        {
          id: nodeId,
          type: 'mindMapNode',
          selected: true,
          position,
          data: { title, documentId, status: '' },
        },
      ]

      return {
        ...withSelectedDocument(
          persist({
            nodes: nextNodes,
            edges: state.edges,
            documents: [
              ...state.documents,
              {
                id: documentId,
                title,
                content: `# ${title}\n\n${text.newNodeBody}`,
                updatedAt: createdAt,
              },
            ],
            selectedDocumentId: documentId,
          },
          state.ownerId,
          ),
        ),
        isDocumentModalOpen: false,
      }
    })
  },

  autoArrangeNodes: () => {
    set((state) => {
      if (state.nodes.length === 0) {
        return state
      }

      const nodeIds = new Set(state.nodes.map((node) => node.id))
      const orderedNodes = [...state.nodes].sort((a, b) => {
        if (a.position.y !== b.position.y) {
          return a.position.y - b.position.y
        }

        return a.position.x - b.position.x
      })
      const origin = orderedNodes.reduce(
        (current, node) => ({
          x: Math.min(current.x, node.position.x),
          y: Math.min(current.y, node.position.y),
        }),
        { x: orderedNodes[0].position.x, y: orderedNodes[0].position.y },
      )
      const childrenByNodeId = new Map<string, string[]>()
      const incomingCounts = new Map<string, number>()

      for (const node of orderedNodes) {
        childrenByNodeId.set(node.id, [])
        incomingCounts.set(node.id, 0)
      }

      for (const edge of state.edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          continue
        }

        childrenByNodeId.get(edge.source)?.push(edge.target)
        incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1)
      }

      const nodeOrder = new Map(orderedNodes.map((node, index) => [node.id, index]))

      for (const children of childrenByNodeId.values()) {
        children.sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0))
      }

      const roots = orderedNodes
        .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
        .map((node) => node.id)
      const layoutRoots = roots.length > 0 ? roots : [orderedNodes[0].id]
      const visited = new Set<string>()
      const positions = new Map<string, XYPosition>()
      let row = 0

      const placeNode = (nodeId: string, depth: number): number => {
        if (visited.has(nodeId)) {
          return positions.get(nodeId)?.y ?? row * layoutSpacing.y
        }

        visited.add(nodeId)

        const children = (childrenByNodeId.get(nodeId) ?? []).filter(
          (childId) => !visited.has(childId),
        )

        if (children.length === 0) {
          const y = row * layoutSpacing.y
          positions.set(nodeId, {
            x: origin.x + depth * layoutSpacing.x,
            y: origin.y + y,
          })
          row += 1
          return y
        }

        const childRows = children.map((childId) => placeNode(childId, depth + 1))
        const y =
          childRows.reduce((total, childY) => total + childY, 0) / childRows.length
        positions.set(nodeId, {
          x: origin.x + depth * layoutSpacing.x,
          y: origin.y + y,
        })
        return y
      }

      for (const rootId of layoutRoots) {
        placeNode(rootId, 0)
      }

      for (const node of orderedNodes) {
        if (!visited.has(node.id)) {
          placeNode(node.id, 0)
        }
      }

      const nextNodes = state.nodes.map((node) => ({
        ...node,
        position: positions.get(node.id) ?? node.position,
      }))

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: state.edges,
          documents: state.documents,
          selectedDocumentId: state.selectedDocumentId,
        },
        state.ownerId,
        ),
      )
    })
  },

  closeDocument: () => {
    set({ isDocumentModalOpen: false })
  },

  clearFocusedNode: () => {
    set({ focusedNodeId: null })
  },

  copySelectedNodes: () => {
    const selectedNodeIds = get()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id)

    if (selectedNodeIds.length > 0) {
      set({ copiedNodeIds: selectedNodeIds })
    }
  },

  deleteEdge: (edgeId) => {
    set((state) =>
      withSelectedDocument(
        persist({
          nodes: state.nodes,
            edges: state.edges.filter((edge) => edge.id !== edgeId),
            documents: state.documents,
            selectedDocumentId: state.selectedDocumentId,
          },
          state.ownerId,
          ),
      ),
    )
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const targetNode = state.nodes.find((node) => node.id === nodeId)
      const selectedDocumentId =
        targetNode?.data.documentId === state.selectedDocumentId
          ? null
          : state.selectedDocumentId

      return {
        ...withSelectedDocument(
          persist({
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
              (edge) => edge.source !== nodeId && edge.target !== nodeId,
            ),
            documents: targetNode
              ? state.documents.filter((doc) => doc.id !== targetNode.data.documentId)
              : state.documents,
            selectedDocumentId,
          },
          state.ownerId,
          ),
        ),
        isDocumentModalOpen:
          targetNode?.data.documentId === state.selectedDocumentId
            ? false
            : state.isDocumentModalOpen,
      }
    })
  },

  deleteSelectedElements: () => {
    set((state) => {
      const selectedNodeIds = state.nodes
        .filter((node) => node.selected)
        .map((node) => node.id)
      const selectedEdgeIds = state.edges
        .filter((edge) => edge.selected)
        .map((edge) => edge.id)

      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
        return state
      }

      const selectedNodeIdSet = new Set(selectedNodeIds)
      const removedDocumentIds = new Set(
        state.nodes
          .filter((node) => selectedNodeIdSet.has(node.id))
          .map((node) => node.data.documentId),
      )
      const selectedDocumentId = removedDocumentIds.has(
        state.selectedDocumentId ?? '',
      )
        ? null
        : state.selectedDocumentId

      return {
        ...withSelectedDocument(
          persist({
            nodes: state.nodes.filter((node) => !selectedNodeIdSet.has(node.id)),
            edges: state.edges.filter(
              (edge) =>
                !selectedEdgeIds.includes(edge.id) &&
                !selectedNodeIdSet.has(edge.source) &&
                !selectedNodeIdSet.has(edge.target),
            ),
            documents: state.documents.filter(
              (doc) => !removedDocumentIds.has(doc.id),
            ),
            selectedDocumentId,
          },
          state.ownerId,
          ),
        ),
        isDocumentModalOpen: selectedDocumentId ? state.isDocumentModalOpen : false,
      }
    })
  },

  focusDocumentNode: (documentId) => {
    set((state) => {
      const targetNode = state.nodes.find(
        (node) => node.data.documentId === documentId,
      )

      if (!targetNode) {
        return state
      }

      return {
        ...withSelectedDocument(
          persist({
            nodes: state.nodes.map((node) => ({
              ...node,
              selected: node.id === targetNode.id,
            })),
            edges: state.edges,
            documents: state.documents,
            selectedDocumentId: documentId,
          },
          state.ownerId,
          ),
        ),
        focusedNodeId: targetNode.id,
        isDocumentModalOpen: false,
      }
    })
  },

  onConnect: (connection) => {
    const state = get()
    const nextEdges = addEdge(
      { ...connection, animated: false, style: edgeStyle },
      state.edges,
    )

    set(
      withSelectedDocument(
        persist({
          nodes: state.nodes,
          edges: nextEdges,
          documents: state.documents,
          selectedDocumentId: state.selectedDocumentId,
        },
        state.ownerId,
        ),
      ),
    )
  },

  onEdgesChange: (changes) => {
    const state = get()
    const nextEdges = applyEdgeChanges(changes, state.edges)

    set(
      withSelectedDocument(
        persist({
          nodes: state.nodes,
          edges: nextEdges,
          documents: state.documents,
          selectedDocumentId: state.selectedDocumentId,
        },
        state.ownerId,
        ),
      ),
    )
  },

  onNodesChange: (changes) => {
    const state = get()
    const nextNodes = applyNodeChanges(changes, state.nodes)

    set(
      withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: state.edges,
          documents: state.documents,
          selectedDocumentId: state.selectedDocumentId,
        },
        state.ownerId,
        ),
      ),
    )
  },

  pasteCopiedNodes: () => {
    set((state) => {
      const sourceNodes = state.nodes.filter((node) =>
        state.copiedNodeIds.includes(node.id),
      )

      if (sourceNodes.length === 0) {
        return state
      }

      const createdAt = now()
      const idPairs = sourceNodes.map((node, index) => {
        const suffix = `${Date.now()}-${index}`
        return {
          oldDocumentId: node.data.documentId,
          oldNodeId: node.id,
          newDocumentId: `doc-copy-${suffix}`,
          newNodeId: `node-copy-${suffix}`,
        }
      })

      const nextNodes: MindMapFlowNode[] = [
        ...state.nodes.map((node) => ({ ...node, selected: false })),
        ...sourceNodes.map((node) => {
          const pair = idPairs.find((item) => item.oldNodeId === node.id)!
          const title = `${node.data.title} ${text.copiedSuffix}`

          return {
            ...node,
            id: pair.newNodeId,
            selected: true,
            position: {
              x: node.position.x + 48,
              y: node.position.y + 48,
            },
            data: {
              ...node.data,
              documentId: pair.newDocumentId,
              title,
            },
          }
        }),
      ]

      const nextDocuments: MarkdownDocument[] = [
        ...state.documents,
        ...idPairs.map((pair) => {
          const sourceDocument = state.documents.find(
            (doc) => doc.id === pair.oldDocumentId,
          )
          const title = `${sourceDocument?.title ?? text.documentFallback} ${
            text.copiedSuffix
          }`

          return {
            id: pair.newDocumentId,
            title,
            content: sourceDocument?.content ?? '',
            updatedAt: createdAt,
          }
        }),
      ]

      const copiedNodeIdSet = new Set(state.copiedNodeIds)
      const copiedEdges: MindMapFlowEdge[] = state.edges
        .filter(
          (edge) =>
            copiedNodeIdSet.has(edge.source) && copiedNodeIdSet.has(edge.target),
        )
        .map((edge, index) => {
          const sourcePair = idPairs.find((pair) => pair.oldNodeId === edge.source)!
          const targetPair = idPairs.find((pair) => pair.oldNodeId === edge.target)!

          return {
            ...edge,
            id: `edge-copy-${Date.now()}-${index}`,
            source: sourcePair.newNodeId,
            target: targetPair.newNodeId,
            animated: false,
            style: edgeStyle,
          }
        })

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: [...state.edges, ...copiedEdges],
          documents: nextDocuments,
          selectedDocumentId: idPairs[0]?.newDocumentId ?? state.selectedDocumentId,
        },
        state.ownerId,
        ),
      )
    })
  },

  saveSnapshot: async () => {
    const state = get()
    await saveMindMapSnapshot(
      {
        nodes: state.nodes,
        edges: state.edges,
        documents: state.documents,
        selectedDocumentId: state.selectedDocumentId,
      },
      state.ownerId,
    )
  },

  selectDocument: (documentId) => {
    set((state) => ({
      ...withSelectedDocument(
        persist({
          nodes: state.nodes,
          edges: state.edges,
          documents: state.documents,
          selectedDocumentId: documentId,
        },
        state.ownerId,
        ),
      ),
      isDocumentModalOpen: true,
    }))
  },

  selectNodesInRect: (rect) => {
    set((state) =>
      withSelectedDocument({
        nodes: state.nodes.map((node) => {
          const width = node.measured?.width ?? node.width ?? 176
          const height = node.measured?.height ?? node.height ?? 72
          const nodeRect = {
            maxX: node.position.x + width,
            maxY: node.position.y + height,
            minX: node.position.x,
            minY: node.position.y,
          }
          const selected =
            nodeRect.maxX >= rect.minX &&
            nodeRect.minX <= rect.maxX &&
            nodeRect.maxY >= rect.minY &&
            nodeRect.minY <= rect.maxY

          return { ...node, selected }
        }),
        edges: state.edges.map((edge) => ({ ...edge, selected: false })),
        documents: state.documents,
        selectedDocumentId: state.selectedDocumentId,
      }),
    )
  },

  setActiveOwner: async (ownerId) => {
    if (ownerId === get().ownerId) {
      await get().hydrateSnapshot()
      return
    }

    set((state) => ({
      ...state,
      ...withSelectedDocument(initialSnapshot),
      copiedNodeIds: [],
      focusedNodeId: null,
      isDocumentModalOpen: false,
      ownerId,
    }))

    await get().hydrateSnapshot()
  },

  toggleAutoSave: () => {
    set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled }))
  },

  updateDocumentContent: (documentId, content) => {
    set((state) =>
      withSelectedDocument({
        nodes: state.nodes,
        edges: state.edges,
        documents: state.documents.map((doc) =>
          doc.id === documentId ? { ...doc, content, updatedAt: now() } : doc,
        ),
        selectedDocumentId: state.selectedDocumentId,
      }),
    )
  },

  updateDocumentStatus: (documentId, status) => {
    set((state) =>
      withSelectedDocument({
        nodes: state.nodes.map((node) =>
          node.data.documentId === documentId
            ? { ...node, data: { ...node.data, status } }
            : node,
        ),
        edges: state.edges,
        documents: state.documents,
        selectedDocumentId: state.selectedDocumentId,
      }),
    )
  },

  updateDocumentTitle: (documentId, title) => {
    set((state) => {
      const nextDocuments = state.documents.map((doc) =>
        doc.id === documentId ? { ...doc, title, updatedAt: now() } : doc,
      )
      const nextNodes = state.nodes.map((node) =>
        node.data.documentId === documentId
          ? { ...node, data: { ...node.data, title } }
          : node,
      )

      return withSelectedDocument({
        nodes: nextNodes,
        edges: state.edges,
        documents: nextDocuments,
        selectedDocumentId: state.selectedDocumentId,
      })
    })
  },
}))
