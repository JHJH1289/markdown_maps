import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
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
import type { MindMapFlowNode, ThemeMode } from '../types/mindmap'

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

type MindMapCanvasInnerProps = {
  theme: ThemeMode
}

function MindMapCanvasInner({ theme }: MindMapCanvasInnerProps) {
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
  const saveSnapshot = useMindMapStore((state) => state.saveSnapshot)
  const selectDocument = useMindMapStore((state) => state.selectDocument)
  const autoSaveEnabled = useMindMapStore((state) => state.autoSaveEnabled)
  const focusedNodeId = useMindMapStore((state) => state.focusedNodeId)
  const toggleAutoSave = useMindMapStore((state) => state.toggleAutoSave)

  const nodeTypes = useMemo<NodeTypes>(() => ({ mindMapNode: MindMapNode }), [])
  const edges = useMemo(
    () =>
      storedEdges.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          stroke: theme === 'dark' ? '#78b69a' : '#4f6f86',
          strokeWidth: 2,
        },
      })),
    [storedEdges, theme],
  )
  const defaultEdgeOptions = useMemo<DefaultEdgeOptions>(
    () => ({
      animated: false,
      style: { stroke: theme === 'dark' ? '#78b69a' : '#4f6f86', strokeWidth: 2 },
    }),
    [theme],
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
        colorMode={theme}
        connectionLineStyle={{
          stroke: theme === 'dark' ? '#78b69a' : '#4f6f86',
          strokeWidth: 2,
        }}
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
        selectionKeyCode="Control"
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={false}
      >
        <Background
          color={theme === 'dark' ? '#2f3b35' : '#c8d3dc'}
          gap={28}
          variant={BackgroundVariant.Lines}
        />
        <Controls position="bottom-left" />
        <Panel className="save-control-panel" position="bottom-left">
          <button
            aria-label={
              autoSaveEnabled ? 'Turn autosave off' : 'Turn autosave on'
            }
            aria-pressed={autoSaveEnabled}
            className="save-toggle-button"
            onClick={() => {
              if (!autoSaveEnabled) {
                saveSnapshot()
              }
              toggleAutoSave()
            }}
            title={autoSaveEnabled ? 'Autosave on' : 'Autosave off'}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 3h12l2 2v16H5V3Zm2 2v5h9V5H7Zm0 14h10v-6H7v6Zm2-12h5V5H9v2Z" />
            </svg>
          </button>
        </Panel>
        <MiniMap
          maskColor={
            theme === 'dark'
              ? 'rgba(16, 19, 18, 0.72)'
              : 'rgba(242, 246, 248, 0.72)'
          }
          nodeColor={theme === 'dark' ? '#6fbf9c' : '#216ba5'}
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

type MindMapCanvasProps = {
  theme: ThemeMode
}

export function MindMapCanvas({ theme }: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner theme={theme} />
    </ReactFlowProvider>
  )
}
