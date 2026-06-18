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
  MindMapSnapshot,
} from '../types/mindmap'

const now = () => new Date().toISOString()
const edgeStyle = { stroke: '#4f6f86', strokeWidth: 2 }

const text = {
  copiedSuffix: '\ubcf5\uc0ac\ubcf8',
  documentFallback: '\ubb38\uc11c',
  newNode: '\uc0c8 \ub178\ub4dc',
  newNodeBody: '\uc5ec\uae30\uc5d0 \ub0b4\uc6a9\uc744 \uc791\uc131\ud558\uc138\uc694.',
  reactTitle: '\ub9ac\uc561\ud2b8 \ud504\ub860\ud2b8\uc5d4\ub4dc',
  apiTitle: '\ubb38\uc11c API',
  storageTitle: '\ub9c8\ud06c\ub2e4\uc6b4 \uc800\uc7a5\uc18c',
  reactContent:
    '# \ub9ac\uc561\ud2b8 \ud504\ub860\ud2b8\uc5d4\ub4dc\n\n- React Flow\ub85c \ub9c8\uc778\ub4dc\ub9f5 \uce94\ubc84\uc2a4\ub97c \uadf8\ub9bd\ub2c8\ub2e4.\n- \uac01 \ub178\ub4dc\ub294 \ubcc4\ub3c4\uc758 Markdown \ubb38\uc11c\ub97c \uac00\ub9ac\ud0b5\ub2c8\ub2e4.\n- \ub178\ub4dc\ub97c \ud074\ub9ad\ud558\uba74 \ubb38\uc11c \ud3b8\uc9d1 \ubaa8\ub2ec\uc774 \uc5f4\ub9bd\ub2c8\ub2e4.',
  apiContent:
    '# \ubb38\uc11c API\n\n- \ub178\ub4dc\ub294 \uc704\uce58\uc640 \uc5f0\uacb0 \uc815\ubcf4\ub97c \uc800\uc7a5\ud569\ub2c8\ub2e4.\n- \ubb38\uc11c\ub294 Markdown \ubcf8\ubb38\uc744 \ud14d\uc2a4\ud2b8\ub85c \uc800\uc7a5\ud569\ub2c8\ub2e4.\n- MVP\uc5d0\uc11c\ub294 \ub450 \ub370\uc774\ud130\ub97c localStorage\uc5d0 \uc800\uc7a5\ud569\ub2c8\ub2e4.',
  storageContent:
    '# \ub9c8\ud06c\ub2e4\uc6b4 \uc800\uc7a5\uc18c\n\n\ubb38\uc11c \ubcf8\ubb38\uc740 \ub9c8\uc778\ub4dc\ub9f5 \ub178\ub4dc \ubc16\uc5d0 \ub530\ub85c \ub461\ub2c8\ub2e4. \ub098\uc911\uc5d0 \ub370\uc774\ud130\ubca0\uc774\uc2a4 TEXT \uceec\ub7fc\uc73c\ub85c \uc62e\uaca8\ub3c4 \uce94\ubc84\uc2a4 \ubaa8\ub378\uc740 \uadf8\ub300\ub85c \uc720\uc9c0\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
}

const legacyTitles: Record<string, string> = {
  'React Frontend': text.reactTitle,
  'Document API': text.apiTitle,
  'Markdown Storage': text.storageTitle,
}

const initialSnapshot: MindMapSnapshot = {
  selectedDocumentId: 'doc-react',
  nodes: [
    {
      id: 'node-react',
      type: 'mindMapNode',
      position: { x: 80, y: 120 },
      data: {
        title: text.reactTitle,
        documentId: 'doc-react',
        status: 'ready',
      },
    },
    {
      id: 'node-api',
      type: 'mindMapNode',
      position: { x: 390, y: 80 },
      data: {
        title: text.apiTitle,
        documentId: 'doc-api',
        status: 'draft',
      },
    },
    {
      id: 'node-storage',
      type: 'mindMapNode',
      position: { x: 360, y: 270 },
      data: {
        title: text.storageTitle,
        documentId: 'doc-storage',
        status: 'draft',
      },
    },
  ],
  edges: [
    { id: 'edge-react-api', source: 'node-react', target: 'node-api' },
    { id: 'edge-react-storage', source: 'node-react', target: 'node-storage' },
  ],
  documents: [
    {
      id: 'doc-react',
      title: text.reactTitle,
      content: text.reactContent,
      updatedAt: now(),
    },
    {
      id: 'doc-api',
      title: text.apiTitle,
      content: text.apiContent,
      updatedAt: now(),
    },
    {
      id: 'doc-storage',
      title: text.storageTitle,
      content: text.storageContent,
      updatedAt: now(),
    },
  ],
}

type MindMapState = MindMapSnapshot & {
  copiedNodeIds: string[]
  focusedNodeId: string | null
  hydrateSnapshot: () => Promise<void>
  isDocumentModalOpen: boolean
  selectedDocument: MarkdownDocument | null
  addNode: () => void
  addNodeAtPosition: (position: XYPosition) => void
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
  selectDocument: (documentId: DocumentId) => void
  updateDocumentContent: (documentId: DocumentId, content: string) => void
  updateDocumentTitle: (documentId: DocumentId, title: string) => void
}

function persist(snapshot: MindMapSnapshot) {
  saveMindMapSnapshot(snapshot)
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
  copiedNodeIds: [],
  focusedNodeId: null,
  isDocumentModalOpen: false,

  hydrateSnapshot: async () => {
    const snapshot = await loadMindMapSnapshot()

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
          data: { title, documentId, status: 'draft' },
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
          }),
        ),
        isDocumentModalOpen: false,
      }
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
        }),
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
          }),
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
          }),
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
          }),
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
        }),
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
        }),
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
        }),
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
        }),
      )
    })
  },

  selectDocument: (documentId) => {
    set((state) => ({
      ...withSelectedDocument(
        persist({
          nodes: state.nodes,
          edges: state.edges,
          documents: state.documents,
          selectedDocumentId: documentId,
        }),
      ),
      isDocumentModalOpen: true,
    }))
  },

  updateDocumentContent: (documentId, content) => {
    set((state) =>
      withSelectedDocument(
        persist({
          nodes: state.nodes,
          edges: state.edges,
          documents: state.documents.map((doc) =>
            doc.id === documentId ? { ...doc, content, updatedAt: now() } : doc,
          ),
          selectedDocumentId: state.selectedDocumentId,
        }),
      ),
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

      return withSelectedDocument(
        persist({
          nodes: nextNodes,
          edges: state.edges,
          documents: nextDocuments,
          selectedDocumentId: state.selectedDocumentId,
        }),
      )
    })
  },
}))
