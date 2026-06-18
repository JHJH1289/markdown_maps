import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type NodeTypes,
  type OnNodeDrag,
  type XYPosition,
} from '@xyflow/react'
import { MindMapNode } from './MindMapNode'
import { useMindMapStore } from '../stores/mindmapStore'
import type { MindMapFlowNode } from '../types/mindmap'

type ContextMenuState =
  | {
      edgeId?: never
      flowPosition: XYPosition
      nodeId?: never
      x: number
      y: number
    }
  | {
      flowPosition?: never
      edgeId?: never
      nodeId: string
      x: number
      y: number
    }
  | {
      edgeId: string
      flowPosition?: never
      nodeId?: never
      x: number
      y: number
    }

type PaneContextMenuEvent = MouseEvent<Element> | globalThis.MouseEvent

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], .w-md-editor'),
  )
}

function MindMapCanvasInner() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const draggedNodeIdRef = useRef<string | null>(null)
  const { getNode, screenToFlowPosition, setCenter } = useReactFlow()
  const nodes = useMindMapStore((state) => state.nodes)
  const storedEdges = useMindMapStore((state) => state.edges)
  const addNodeAtPosition = useMindMapStore((state) => state.addNodeAtPosition)
  const clearFocusedNode = useMindMapStore((state) => state.clearFocusedNode)
  const copySelectedNodes = useMindMapStore((state) => state.copySelectedNodes)
  const deleteEdge = useMindMapStore((state) => state.deleteEdge)
  const deleteNode = useMindMapStore((state) => state.deleteNode)
  const deleteSelectedElements = useMindMapStore(
    (state) => state.deleteSelectedElements,
  )
  const onNodesChange = useMindMapStore((state) => state.onNodesChange)
  const onEdgesChange = useMindMapStore((state) => state.onEdgesChange)
  const onConnect = useMindMapStore((state) => state.onConnect)
  const pasteCopiedNodes = useMindMapStore((state) => state.pasteCopiedNodes)
  const selectDocument = useMindMapStore((state) => state.selectDocument)
  const focusedNodeId = useMindMapStore((state) => state.focusedNodeId)

  const nodeTypes = useMemo<NodeTypes>(() => ({ mindMapNode: MindMapNode }), [])
  const edges = useMemo(
    () =>
      storedEdges.map((edge) => ({
        ...edge,
        animated: false,
        style: { stroke: '#4f6f86', strokeWidth: 2 },
      })),
    [storedEdges],
  )
  const defaultEdgeOptions = useMemo<DefaultEdgeOptions>(
    () => ({
      animated: false,
      style: { stroke: '#4f6f86', strokeWidth: 2 },
    }),
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      const isShortcut = event.ctrlKey || event.metaKey

      if (event.key === 'Delete') {
        event.preventDefault()
        deleteSelectedElements()
        return
      }

      if (!isShortcut) {
        return
      }

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copySelectedNodes()
      }

      if (event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteCopiedNodes()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [copySelectedNodes, deleteSelectedElements, pasteCopiedNodes])

  useEffect(() => {
    if (!focusedNodeId) {
      return
    }

    const focusedNode =
      getNode(focusedNodeId) ?? nodes.find((node) => node.id === focusedNodeId)

    if (!focusedNode) {
      clearFocusedNode()
      return
    }

    const width = focusedNode.measured?.width ?? focusedNode.width ?? 176
    const height = focusedNode.measured?.height ?? focusedNode.height ?? 72

    void setCenter(
      focusedNode.position.x + width / 2,
      focusedNode.position.y + height / 2,
      { duration: 520, zoom: 1 },
    )
    clearFocusedNode()
  }, [clearFocusedNode, focusedNodeId, getNode, nodes, setCenter])

  const handleNodeClick: NodeMouseHandler<MindMapFlowNode> = (_event, node) => {
    if (draggedNodeIdRef.current === node.id) {
      return
    }

    selectDocument(node.data.documentId)
  }

  const handleNodeDragStart: OnNodeDrag<MindMapFlowNode> = (_event, node) => {
    draggedNodeIdRef.current = node.id
  }

  const handleNodeDragStop: OnNodeDrag<MindMapFlowNode> = (_event, node) => {
    window.setTimeout(() => {
      if (draggedNodeIdRef.current === node.id) {
        draggedNodeIdRef.current = null
      }
    }, 0)
  }

  const handlePaneContextMenu = (event: PaneContextMenuEvent) => {
    event.preventDefault()
    setContextMenu({
      flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleNodeContextMenu: NodeMouseHandler<MindMapFlowNode> = (event, node) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleEdgeContextMenu: EdgeMouseHandler = (event, edge) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      edgeId: edge.id,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const createNode = () => {
    if (!contextMenu?.flowPosition) {
      return
    }

    addNodeAtPosition(contextMenu.flowPosition)
    setContextMenu(null)
  }

  const removeNode = () => {
    if (!contextMenu?.nodeId) {
      return
    }

    deleteNode(contextMenu.nodeId)
    setContextMenu(null)
  }

  const removeEdge = () => {
    if (!contextMenu?.edgeId) {
      return
    }

    deleteEdge(contextMenu.edgeId)
    setContextMenu(null)
  }

  return (
    <>
      <ReactFlow
        className="mind-map-canvas"
        colorMode="light"
        connectionLineStyle={{ stroke: '#4f6f86', strokeWidth: 2 }}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        fitView
        isValidConnection={() => true}
        minZoom={0.001}
        multiSelectionKeyCode={null}
        nodes={nodes}
        nodesDraggable
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgeContextMenu={handleEdgeContextMenu}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={onNodesChange}
        onPaneClick={() => setContextMenu(null)}
        onPaneContextMenu={handlePaneContextMenu}
        panOnDrag
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={false}
      >
        <Background color="#c8d3dc" gap={28} variant={BackgroundVariant.Lines} />
        <Controls position="bottom-left" />
        <MiniMap
          maskColor="rgba(242, 246, 248, 0.72)"
          nodeColor="#216ba5"
          nodeStrokeWidth={3}
          pannable
          position="bottom-right"
          zoomable
        />
      </ReactFlow>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.edgeId ? (
            <button onClick={removeEdge} type="button">
              {'\uc120 \uc0ad\uc81c'}
            </button>
          ) : contextMenu.nodeId ? (
            <button onClick={removeNode} type="button">
              {'\ub178\ub4dc \uc0ad\uc81c'}
            </button>
          ) : (
            <button onClick={createNode} type="button">
              {'\uc0c8 \ub178\ub4dc \ub9cc\ub4e4\uae30'}
            </button>
          )}
        </div>
      )}
    </>
  )
}

export function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner />
    </ReactFlowProvider>
  )
}
