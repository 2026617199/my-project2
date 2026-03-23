import { Position, type NodeProps } from '@xyflow/react'
import { useState } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import { Button } from '@/components/ui/button'
import { getAgentPresetLabelById } from '@/constants/agent-presets'
import type { AgentNodeType } from '@/types/flow'

export const AgentNode = ({ id, data, selected }: NodeProps<AgentNodeType>) => {
    const [isHovered, setIsHovered] = useState(false)
    const presetLabel = getAgentPresetLabelById(data.agentPresetId)

    const handleExecute = () => {
        console.log('占位执行逻辑，待接入真实能力', {
            nodeId: id,
            model: data.model,
            messages: data.messages,
        })
    }

    return (
        <>
            <ButtonHandle
                type="target"
                position={Position.Left}
                id="input"
                visible={selected || isHovered}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible={selected || isHovered}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            <div
                className="relative flex h-48 w-48 items-center justify-center rounded-xl border bg-card p-3 shadow-sm transition-transform duration-200 ease-in-out"
                onMouseEnter={() => {
                    setIsHovered(true)
                }}
                onMouseLeave={() => {
                    setIsHovered(false)
                }}
            >
                <span className="absolute left-2 top-2 max-w-40 truncate rounded-md border bg-muted px-2 py-0.5 text-[11px] leading-4 text-muted-foreground">
                    {presetLabel}
                </span>
                <Button onClick={handleExecute}>执行</Button>
            </div>
        </>
    )
}
