import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MindMapFlowNode } from '../types/mindmap'

const statusLabels = {
  draft: '\ucd08\uc548',
  ready: '\uc644\ub8cc',
}

export function MindMapNode({ data, selected }: NodeProps<MindMapFlowNode>) {
  return (
    <div className={selected ? 'mind-map-node selected' : 'mind-map-node'}>
      <Handle
        className="node-handle target top"
        id="target-top"
        position={Position.Top}
        type="target"
      />
      <Handle
        className="node-handle source top"
        id="source-top"
        position={Position.Top}
        type="source"
      />
      <Handle
        className="node-handle target right"
        id="target-right"
        position={Position.Right}
        type="target"
      />
      <Handle
        className="node-handle source right"
        id="source-right"
        position={Position.Right}
        type="source"
      />
      <Handle
        className="node-handle target bottom"
        id="target-bottom"
        position={Position.Bottom}
        type="target"
      />
      <Handle
        className="node-handle source bottom"
        id="source-bottom"
        position={Position.Bottom}
        type="source"
      />
      <Handle
        className="node-handle target left"
        id="target-left"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="node-handle source left"
        id="source-left"
        position={Position.Left}
        type="source"
      />
      <div className="node-kicker">{statusLabels[data.status]}</div>
      <div className="node-title">{data.title}</div>
    </div>
  )
}
