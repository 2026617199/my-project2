import { Position, type NodeProps } from '@xyflow/react'

import { ButtonHandle } from '@/components/button-handle'
import { Button } from '@/components/ui/button'
import { getAgentPresetLabelById } from '@/constants/agent-presets'
import { useAgentExecution } from '@/hooks/useAgentExecution'
import type { AgentNodeType } from '@/types/flow'

export const AgentNode = ({ id, data, selected }: NodeProps<AgentNodeType>) => {
    const handleVisibilityClass = selected
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
    const { isGenerating, execute } = useAgentExecution({
        nodeId: id,
        model: data.model,
        messages: data.messages,
    })
    const presetLabel = getAgentPresetLabelById(data.agentPresetId)

    return (
        <div className="group/node relative">
            <ButtonHandle
                type="target"
                position={Position.Left}
                id="input"
                visible
                className={`h-3! w-3! border-2! border-background! bg-primary! transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible
                className={`h-3! w-3! border-2! border-background! bg-primary! transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            <div
                className="relative flex h-48 w-48 items-center justify-center rounded-xl border bg-card p-3 shadow-sm transition-transform duration-200 ease-in-out"
            >
                <span className="absolute left-2 top-2 max-w-40 truncate rounded-md border bg-muted px-2 py-0.5 text-[11px] leading-4 text-muted-foreground">
                    {presetLabel}
                </span>
                <Button disabled={isGenerating} onClick={execute}>
                    {isGenerating ? '生成中...' : '生成'}
                </Button>
            </div>
        </div>
    )
}