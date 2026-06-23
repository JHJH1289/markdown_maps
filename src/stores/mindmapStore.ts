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
import {
  arrangeNodesFromCurrentPositions,
  arrangeNodeBranchToDirection,
  orientEdgesToNodePositions,
  shouldOrientEdgesAfterNodeChanges,
  type HorizontalDirection,
} from '../utils/mindMapLayout'
import { createSnapshotFromSimpleMindMap } from '../utils/simpleMindMapImport'
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
  clipboardMode: 'copy' | 'cut'
  copiedNodeIds: string[]
  expandedNodeIds: string[]
  focusedNodeId: string | null
  isOwnerLoaded: boolean
  mapViewNodeId: string | null
  hydrateSnapshot: () => Promise<void>
  importSimpleMindMap: (input: string) => number
  isDocumentModalOpen: boolean
  selectedDocument: MarkdownDocument | null
  ownerId: string | null
  addNode: () => void
  addNodeAtPosition: (position: XYPosition) => void
  addChildNode: (nodeId: string) => void
  addParentNode: (nodeId: string) => void
  addSiblingNode: (nodeId: string) => void
  arrangeNodeBranch: (nodeId: string, direction: HorizontalDirection) => void
  autoArrangeNodes: () => void
  clearFocusedNode: () => void
  closeDocument: () => void
  copyNode: (nodeId: string) => void
  copySelectedNodes: () => void
  cutNode: (nodeId: string) => void
  deleteEdge: (edgeId: string) => void
  deleteChildNodes: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  deleteSelectedElements: () => void
  focusDocumentNode: (documentId: DocumentId) => void
  onConnect: (connection: Connection) => void
  onEdgesChange: (changes: EdgeChange<MindMapFlowEdge>[]) => void
  onNodesChange: (changes: NodeChange<MindMapFlowNode>[]) => void
  pasteCopiedNodes: () => void
  pasteNodeInto: (nodeId: string) => void
  resetMapView: () => void
  saveSnapshot: () => Promise<void>
  selectDocument: (documentId: DocumentId) => void
  selectNodesInRect: (rect: {
    maxX: number
    maxY: number
    minX: number
    minY: number
  }) => void
  setActiveOwner: (ownerId: string | null) => Promise<void>
  setMapViewNode: (nodeId: string | null) => void
  toggleMapViewNode: (nodeId: string) => void
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

function createNodeDocumentPair(
  title: string,
  position: XYPosition,
  createdAt = now(),
) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const documentId = `doc-${suffix}`
  const nodeId = `node-${suffix}`

  return {
    document: {
      id: documentId,
      title,
      content: `# ${title}\n\n${text.newNodeBody}`,
      updatedAt: createdAt,
    } satisfies MarkdownDocument,
    node: {
      id: nodeId,
      type: 'mindMapNode',
      position,
      data: { title, documentId, status: '' },
    } satisfies MindMapFlowNode,
  }
}

function getIncomingEdge(edges: MindMapFlowEdge[], nodeId: string) {
  return edges.find((edge) => edge.target === nodeId)
}

function getDescendantNodeIds(edges: MindMapFlowEdge[], nodeId: string) {
  const descendants = new Set<string>()
  const stack = edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target)

  while (stack.length > 0) {
    const currentId = stack.pop()

    if (!currentId || descendants.has(currentId)) {
      continue
    }

    descendants.add(currentId)
    stack.push(
      ...edges
        .filter((edge) => edge.source === currentId)
        .map((edge) => edge.target),
    )
  }

  return descendants
}

function normalizeSnapshot(snapshot: MindMapSnapshot): MindMapSnapshot {
  const normalizedNodes = snapshot.nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      title: legacyTitles[node.data.title] ?? node.data.title,
      status: typeof node.data.status === 'string' ? node.data.status : '',
    },
  }))

  return {
    ...snapshot,
    nodes: normalizedNodes,
    edges: orientEdgesToNodePositions(
      normalizedNodes,
      snapshot.edges.map((edge) => ({
        ...edge,
        animated: false,
        style: edgeStyle,
      })),
    ),
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
  clipboardMode: 'copy',
  copiedNodeIds: [],
  expandedNodeIds: bootSnapshot.nodes[0]?.id ? [bootSnapshot.nodes[0].id] : [],
  focusedNodeId: null,
  isDocumentModalOpen: false,
  isOwnerLoaded: false,
  mapViewNodeId: bootSnapshot.nodes[0]?.id ?? null,
  ownerId: null,

  hydrateSnapshot: async () => {
    const ownerId = get().ownerId
    const snapshot = await loadMindMapSnapshot(ownerId)

    if (snapshot) {
      const normalizedSnapshot = normalizeSnapshot(snapshot)
      set((state) => ({
        ...state,
        ...withSelectedDocument(normalizedSnapshot),
        expandedNodeIds: normalizedSnapshot.nodes[0]?.id
          ? [normalizedSnapshot.nodes[0].id]
          : [],
        isOwnerLoaded: true,
        mapViewNodeId: normalizedSnapshot.nodes[0]?.id ?? null,
      }))
      return
    }

    set({ isOwnerLoaded: true })
  },

  importSimpleMindMap: (input) => {
    const snapshot = normalizeSnapshot(createSnapshotFromSimpleMindMap(input))

    set((state) => ({
      ...state,
      ...withSelectedDocument(persist(snapshot, state.ownerId)),
      copiedNodeIds: [],
      expandedNodeIds: snapshot.nodes[0]?.id ? [snapshot.nodes[0].id] : [],
      focusedNodeId: snapshot.nodes[0]?.id ?? null,
      isDocumentModalOpen: false,
      mapViewNodeId: snapshot.nodes[0]?.id ?? null,
    }))

    return snapshot.nodes.length
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

  arrangeNodeBranch: (nodeId, direction) => {
    set((state) => {
      const arranged = arrangeNodeBranchToDirection(
        state.nodes,
        state.edges,
        nodeId,
        direction,
      )

      return withSelectedDocument(
        persist({
          nodes: arranged.nodes,
          edges: arranged.edges,
          documents: state.documents,
          selectedDocumentId: state.selectedDocumentId,
        },
        state.ownerId,
        ),
      )
    })
  },

  addChildNode: (nodeId) => {
    set((state) => {
      const parentNode = state.nodes.find((node) => node.id === nodeId)

      if (!parentNode) {
        return state
      }

      const createdAt = now()
      const title = `${text.newNode} ${state.nodes.length + 1}`
      const { document, node } = createNodeDocumentPair(title, {
        x: parentNode.position.x + 240,
        y: parentNode.position.y + 92,
      }, createdAt)
      const nextNodes = [
        ...state.nodes.map((item) => ({ ...item, selected: false })),
        { ...node, selected: true },
      ]
      const nextEdges = orientEdgesToNodePositions(nextNodes, [
        ...state.edges,
        {
          id: `edge-${nodeId}-${node.id}`,
          source: nodeId,
          target: node.id,
          animated: false,
          style: edgeStyle,
        },
      ])

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: nextEdges,
          documents: [...state.documents, document],
          selectedDocumentId: document.id,
        },
        state.ownerId,
        ),
      )
    })
  },

  addParentNode: (nodeId) => {
    set((state) => {
      const childNode = state.nodes.find((node) => node.id === nodeId)

      if (!childNode) {
        return state
      }

      const createdAt = now()
      const title = `${text.newNode} ${state.nodes.length + 1}`
      const { document, node } = createNodeDocumentPair(title, {
        x: childNode.position.x - 240,
        y: childNode.position.y,
      }, createdAt)
      const incomingEdge = getIncomingEdge(state.edges, nodeId)
      const nextNodes = [
        ...state.nodes.map((item) => ({ ...item, selected: false })),
        { ...node, selected: true },
      ]
      const nextEdges = orientEdgesToNodePositions(nextNodes, [
        ...state.edges.filter((edge) => edge.id !== incomingEdge?.id),
        ...(incomingEdge
          ? [{
              ...incomingEdge,
              id: `edge-${incomingEdge.source}-${node.id}`,
              target: node.id,
            }]
          : []),
        {
          id: `edge-${node.id}-${nodeId}`,
          source: node.id,
          target: nodeId,
          animated: false,
          style: edgeStyle,
        },
      ])

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: nextEdges,
          documents: [...state.documents, document],
          selectedDocumentId: document.id,
        },
        state.ownerId,
        ),
      )
    })
  },

  addSiblingNode: (nodeId) => {
    set((state) => {
      const targetNode = state.nodes.find((node) => node.id === nodeId)

      if (!targetNode) {
        return state
      }

      const createdAt = now()
      const title = `${text.newNode} ${state.nodes.length + 1}`
      const { document, node } = createNodeDocumentPair(title, {
        x: targetNode.position.x,
        y: targetNode.position.y + 92,
      }, createdAt)
      const incomingEdge = getIncomingEdge(state.edges, nodeId)
      const nextNodes = [
        ...state.nodes.map((item) => ({ ...item, selected: false })),
        { ...node, selected: true },
      ]
      const nextEdges = incomingEdge
        ? orientEdgesToNodePositions(nextNodes, [
            ...state.edges,
            {
              id: `edge-${incomingEdge.source}-${node.id}`,
              source: incomingEdge.source,
              target: node.id,
              animated: false,
              style: edgeStyle,
            },
          ])
        : state.edges

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: nextEdges,
          documents: [...state.documents, document],
          selectedDocumentId: document.id,
        },
        state.ownerId,
        ),
      )
    })
  },

  autoArrangeNodes: () => {
    set((state) => {
      if (state.nodes.length === 0) {
        return state
      }

      const arranged = arrangeNodesFromCurrentPositions(state.nodes, state.edges)

      return withSelectedDocument(
        persist({
          nodes: arranged.nodes,
          edges: arranged.edges,
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

  copyNode: (nodeId) => {
    set({ clipboardMode: 'copy', copiedNodeIds: [nodeId] })
  },

  copySelectedNodes: () => {
    const selectedNodeIds = get()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id)

    if (selectedNodeIds.length > 0) {
      set({ clipboardMode: 'copy', copiedNodeIds: selectedNodeIds })
    }
  },

  cutNode: (nodeId) => {
    set({ clipboardMode: 'cut', copiedNodeIds: [nodeId] })
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

  deleteChildNodes: (nodeId) => {
    set((state) => {
      const descendantNodeIds = getDescendantNodeIds(state.edges, nodeId)

      if (descendantNodeIds.size === 0) {
        return state
      }

      const removedDocumentIds = new Set(
        state.nodes
          .filter((node) => descendantNodeIds.has(node.id))
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
            nodes: state.nodes.filter((node) => !descendantNodeIds.has(node.id)),
            edges: state.edges.filter(
              (edge) =>
                !descendantNodeIds.has(edge.source) &&
                !descendantNodeIds.has(edge.target),
            ),
            documents: state.documents.filter(
              (document) => !removedDocumentIds.has(document.id),
            ),
            selectedDocumentId,
          },
          state.ownerId,
          ),
        ),
        expandedNodeIds: state.expandedNodeIds.filter(
          (id) => !descendantNodeIds.has(id),
        ),
        focusedNodeId: state.focusedNodeId && descendantNodeIds.has(state.focusedNodeId)
          ? nodeId
          : state.focusedNodeId,
        isDocumentModalOpen: selectedDocumentId ? state.isDocumentModalOpen : false,
        mapViewNodeId:
          state.mapViewNodeId && descendantNodeIds.has(state.mapViewNodeId)
            ? nodeId
            : state.mapViewNodeId,
      }
    })
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
        expandedNodeIds: state.expandedNodeIds.filter((id) => id !== nodeId),
        mapViewNodeId:
          state.mapViewNodeId === nodeId
            ? state.nodes.find((node) => node.id !== nodeId)?.id ?? null
            : state.mapViewNodeId,
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
        expandedNodeIds: state.expandedNodeIds.filter(
          (nodeId) => !selectedNodeIdSet.has(nodeId),
        ),
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
        expandedNodeIds: Array.from(
          new Set([...state.expandedNodeIds, targetNode.id]),
        ),
        focusedNodeId: targetNode.id,
        isDocumentModalOpen: false,
        mapViewNodeId: targetNode.id,
      }
    })
  },

  onConnect: (connection) => {
    const state = get()
    const nextEdges = orientEdgesToNodePositions(
      state.nodes,
      addEdge(
        { ...connection, animated: false, style: edgeStyle },
        state.edges,
      ),
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
    const nextEdges = shouldOrientEdgesAfterNodeChanges(changes)
      ? orientEdgesToNodePositions(nextNodes, state.edges)
      : state.edges

    set(
      withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: nextEdges,
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
          edges: orientEdgesToNodePositions(nextNodes, [
            ...state.edges,
            ...copiedEdges,
          ]),
          documents: nextDocuments,
          selectedDocumentId: idPairs[0]?.newDocumentId ?? state.selectedDocumentId,
        },
        state.ownerId,
        ),
      )
    })
  },

  pasteNodeInto: (nodeId) => {
    set((state) => {
      const targetNode = state.nodes.find((node) => node.id === nodeId)
      const sourceNodes = state.nodes.filter((node) =>
        state.copiedNodeIds.includes(node.id),
      )

      if (!targetNode || sourceNodes.length === 0) {
        return state
      }

      if (state.clipboardMode === 'cut') {
        const movedNodeIds = new Set(sourceNodes.map((node) => node.id))
        const nextEdges = orientEdgesToNodePositions(state.nodes, [
          ...state.edges.filter(
            (edge) => !(movedNodeIds.has(edge.target) && !movedNodeIds.has(edge.source)),
          ),
          ...sourceNodes.map((node) => ({
            id: `edge-${nodeId}-${node.id}`,
            source: nodeId,
            target: node.id,
            animated: false,
            style: edgeStyle,
          })),
        ])

        return {
          ...withSelectedDocument(
            persist({
              nodes: state.nodes,
              edges: nextEdges,
              documents: state.documents,
              selectedDocumentId: state.selectedDocumentId,
            },
            state.ownerId,
            ),
          ),
          clipboardMode: 'copy',
          copiedNodeIds: [],
          expandedNodeIds: Array.from(new Set([...state.expandedNodeIds, nodeId])),
        }
      }

      const createdAt = now()
      const idPairs = sourceNodes.map((node, index) => {
        const suffix = `${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 6)}`

        return {
          oldDocumentId: node.data.documentId,
          oldNodeId: node.id,
          newDocumentId: `doc-copy-${suffix}`,
          newNodeId: `node-copy-${suffix}`,
        }
      })
      const nextNodes: MindMapFlowNode[] = [
        ...state.nodes.map((node) => ({ ...node, selected: false })),
        ...sourceNodes.map((node, index) => {
          const pair = idPairs[index]

          return {
            ...node,
            id: pair.newNodeId,
            selected: index === 0,
            position: {
              x: targetNode.position.x + 240,
              y: targetNode.position.y + index * 92,
            },
            data: {
              ...node.data,
              documentId: pair.newDocumentId,
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

          return {
            id: pair.newDocumentId,
            title: sourceDocument?.title ?? text.documentFallback,
            content: sourceDocument?.content ?? '',
            updatedAt: createdAt,
          }
        }),
      ]
      const rootCopiedNodeIds = new Set(
        sourceNodes
          .filter(
            (node) =>
              !state.edges.some(
                (edge) =>
                  edge.target === node.id &&
                  sourceNodes.some((sourceNode) => sourceNode.id === edge.source),
              ),
          )
          .map((node) => node.id),
      )
      const copiedNodeIdSet = new Set(state.copiedNodeIds)
      const copiedEdges: MindMapFlowEdge[] = [
        ...state.edges
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
          }),
        ...idPairs
          .filter((pair) => rootCopiedNodeIds.has(pair.oldNodeId))
          .map((pair) => ({
            id: `edge-${nodeId}-${pair.newNodeId}`,
            source: nodeId,
            target: pair.newNodeId,
            animated: false,
            style: edgeStyle,
          })),
      ]

      return {
        ...withSelectedDocument(
          persist({
            nodes: nextNodes,
            edges: orientEdgesToNodePositions(nextNodes, [
              ...state.edges,
              ...copiedEdges,
            ]),
            documents: nextDocuments,
            selectedDocumentId: idPairs[0]?.newDocumentId ?? state.selectedDocumentId,
          },
          state.ownerId,
          ),
        ),
        expandedNodeIds: Array.from(new Set([...state.expandedNodeIds, nodeId])),
      }
    })
  },

  resetMapView: () => {
    set((state) => ({
      focusedNodeId: state.nodes[0]?.id ?? null,
      mapViewNodeId: state.nodes[0]?.id ?? null,
    }))
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
    const state = get()

    if (ownerId === state.ownerId && state.isOwnerLoaded) {
      return
    }

    set((state) => ({
      ...state,
      ...withSelectedDocument(initialSnapshot),
      copiedNodeIds: [],
      expandedNodeIds: initialSnapshot.nodes[0]?.id
        ? [initialSnapshot.nodes[0].id]
        : [],
      focusedNodeId: null,
      isOwnerLoaded: false,
      isDocumentModalOpen: false,
      mapViewNodeId: initialSnapshot.nodes[0]?.id ?? null,
      ownerId,
    }))

    await get().hydrateSnapshot()
  },

  setMapViewNode: (nodeId) => {
    set((state) => ({
      expandedNodeIds: nodeId
        ? Array.from(new Set([...state.expandedNodeIds, nodeId]))
        : state.expandedNodeIds,
      focusedNodeId: nodeId,
      mapViewNodeId: nodeId,
    }))
  },

  toggleMapViewNode: (nodeId) => {
    set((state) => {
      const isExpanded = state.expandedNodeIds.includes(nodeId)

      return {
        expandedNodeIds: isExpanded
          ? state.expandedNodeIds.filter((id) => id !== nodeId)
          : [...state.expandedNodeIds, nodeId],
        focusedNodeId: nodeId,
        mapViewNodeId: nodeId,
      }
    })
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
