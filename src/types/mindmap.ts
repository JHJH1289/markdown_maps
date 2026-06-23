import type { Edge, Node } from '@xyflow/react'

export type DocumentId = string
export type MindMapNodeId = string

export type MarkdownDocument = {
  id: DocumentId
  title: string
  content: string
  updatedAt: string
}

export type MindMapNodeData = {
  title: string
  documentId: DocumentId
  status: MindMapNodeStatus
}

export type MindMapNodeStatus = string

export type MindMapFlowNode = Node<MindMapNodeData, 'mindMapNode'>
export type MindMapFlowEdge = Edge

export type MindMapSnapshot = {
  nodes: MindMapFlowNode[]
  edges: MindMapFlowEdge[]
  documents: MarkdownDocument[]
  selectedDocumentId: DocumentId | null
}

export type ThemeMode = 'light' | 'dark'
