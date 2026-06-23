import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ControlButton,
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
type RightDragSelection = {
  currentX: number
  currentY: number
  startX: number
  startY: number
}

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
  const [rightDragSelection, setRightDragSelection] =
    useState<RightDragSelection | null>(null)
  const draggedNodeIdRef = useRef<string | null>(null)
  const rightDragSelectionRef = useRef<RightDragSelection | null>(null)
  const suppressNextContextMenuRef = useRef(false)
  const { getNode, screenToFlowPosition, setCenter } = useReactFlow()
  const nodes = useMindMapStore((state) => state.nodes)
  const storedEdges = useMindMapStore((state) => state.edges)
  const addNodeAtPosition = useMindMapStore((state) => state.addNodeAtPosition)
  const arrangeNodeBranch = useMindMapStore((state) => state.arrangeNodeBranch)
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
  const selectNodesInRect = useMindMapStore((state) => state.selectNodesInRect)
  const autoSaveEnabled = useMindMapStore((state) => state.autoSaveEnabled)
  const focusedNodeId = useMindMapStore((state) => state.focusedNodeId)
  const toggleAutoSave = useMindMapStore((state) => state.toggleAutoSave)

  const nodeTypes = useMemo<NodeTypes>(() => ({ mindMapNode: MindMapNode }), [])
  const edgeColor = theme === 'dark' ? '#78b69a' : '#4f6f86'
  const selectedEdgeColor = theme === 'dark' ? '#f4d35e' : '#b7791f'
  const edges = useMemo(
    () =>
      storedEdges.map((edge) => ({
        ...edge,
        animated: false,
        interactionWidth: 34,
        selectable: true,
        style: {
          stroke: edge.selected ? selectedEdgeColor : edgeColor,
          strokeWidth: edge.selected ? 3 : 2,
        },
      })),
    [edgeColor, selectedEdgeColor, storedEdges],
  )
  const defaultEdgeOptions = useMemo<DefaultEdgeOptions>(
    () => ({
      animated: false,
      interactionWidth: 34,
      selectable: true,
      style: { stroke: edgeColor, strokeWidth: 2 },
    }),
    [edgeColor],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      const isShortcut = event.ctrlKey || event.metaKey

      if (event.key === 'Delete' || event.key === 'Backspace') {
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
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const selection = rightDragSelectionRef.current

      if (!selection) {
        return
      }

      event.preventDefault()
      const nextSelection = {
        ...selection,
        currentX: event.clientX,
        currentY: event.clientY,
      }
      rightDragSelectionRef.current = nextSelection
      setRightDragSelection(nextSelection)
    }

    const handleMouseUp = (event: globalThis.MouseEvent) => {
      const selection = rightDragSelectionRef.current

      if (!selection || event.button !== 2) {
        return
      }

      const distance = Math.hypot(
        selection.currentX - selection.startX,
        selection.currentY - selection.startY,
      )

      if (distance > 6) {
        const start = screenToFlowPosition({
          x: selection.startX,
          y: selection.startY,
        })
        const end = screenToFlowPosition({
          x: selection.currentX,
          y: selection.currentY,
        })

        selectNodesInRect({
          maxX: Math.max(start.x, end.x),
          maxY: Math.max(start.y, end.y),
          minX: Math.min(start.x, end.x),
          minY: Math.min(start.y, end.y),
        })
        suppressNextContextMenuRef.current = true
      }

      rightDragSelectionRef.current = null
      setRightDragSelection(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [screenToFlowPosition, selectNodesInRect])

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

    if (suppressNextContextMenuRef.current) {
      suppressNextContextMenuRef.current = false
      return
    }

    setContextMenu({
      flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleMouseDownCapture = (event: MouseEvent<Element>) => {
    if (event.button !== 2) {
      return
    }

    if (!(event.target instanceof HTMLElement)) {
      return
    }

    if (!event.target.classList.contains('react-flow__pane')) {
      return
    }

    const selection = {
      currentX: event.clientX,
      currentY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    }
    rightDragSelectionRef.current = selection
    setRightDragSelection(selection)
    setContextMenu(null)
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

  const arrangeNodeLeft = () => {
    if (!contextMenu?.nodeId) {
      return
    }

    arrangeNodeBranch(contextMenu.nodeId, 'left')
    setContextMenu(null)
  }

  const arrangeNodeRight = () => {
    if (!contextMenu?.nodeId) {
      return
    }

    arrangeNodeBranch(contextMenu.nodeId, 'right')
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
          stroke: edgeColor,
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
        onMouseDownCapture={handleMouseDownCapture}
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
        <Controls position="bottom-left">
          <ControlButton
            aria-label={autoSaveEnabled ? 'Turn autosave off' : 'Turn autosave on'}
            aria-pressed={autoSaveEnabled}
            className="autosave-control-button"
            onClick={() => {
              if (!autoSaveEnabled) {
                saveSnapshot()
              }
              toggleAutoSave()
            }}
            title={autoSaveEnabled ? 'Autosave on' : 'Autosave off'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 3h12l2 2v16H5V3Zm2 2v5h9V5H7Zm0 14h10v-6H7v6Zm2-12h5V5H9v2Z" />
            </svg>
          </ControlButton>
        </Controls>
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

      {rightDragSelection && (
        <div
          className="right-drag-selection"
          style={{
            height: Math.abs(
              rightDragSelection.currentY - rightDragSelection.startY,
            ),
            left: Math.min(rightDragSelection.startX, rightDragSelection.currentX),
            top: Math.min(rightDragSelection.startY, rightDragSelection.currentY),
            width: Math.abs(
              rightDragSelection.currentX - rightDragSelection.startX,
            ),
          }}
        />
      )}

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
            <>
              <button onClick={arrangeNodeLeft} type="button">
                {'\uc88c\ub85c \uc815\ub82c'}
              </button>
              <button onClick={arrangeNodeRight} type="button">
                {'\uc6b0\ub85c \uc815\ub82c'}
              </button>
              <button onClick={removeNode} type="button">
                {'\ub178\ub4dc \uc0ad\uc81c'}
              </button>
            </>
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
