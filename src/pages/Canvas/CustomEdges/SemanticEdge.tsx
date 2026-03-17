import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

import type { CanvasEdge } from '@/types/canvas'

export default function SemanticEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<CanvasEdge>) {
    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    })

    const isReference = data?.relationType === 'reference-image'
    const isAgentOutput = data?.relationType === 'agent-output'
    const label = isReference ? '参考图' : isAgentOutput ? '智能体输出' : '提示词'

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                style={{
                    stroke: isReference ? '#7c3aed' : isAgentOutput ? '#0f766e' : '#0f172a',
                    strokeWidth: selected ? 3 : 2,
                    strokeDasharray: isReference ? '7 4' : undefined,
                }}
            />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan absolute rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm"
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                    }}
                >
                    {label}
                </div>
            </EdgeLabelRenderer>
        </>
    )
}
