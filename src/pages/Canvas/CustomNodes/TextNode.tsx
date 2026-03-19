import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Input } from 'antd'

import { NodeShell } from './shared'

import { useCanvasStore } from '@/store/canvas'
import type { TextCanvasNode } from '@/types/canvas'

function TextNode({ id, data, selected }: NodeProps<TextCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)

    const handleChange = useCallback(
        (value: string) => {
            updateNodeData(id, { content: value })
        },
        [id, updateNodeData],
    )

    return (
        <NodeShell
            title={data.title}
            status={data.status}
            selected={selected}
            subtitle="连接到图片/视频节点后，会按连线顺序拼接进最终提示词。"
        >
            <Input.TextArea
                value={data.content}
                onChange={(event) => handleChange(event.target.value)}
                placeholder="输入这段文本，例如镜头语言、人物描述、光影风格……"
                className="rounded-2xl nodrag nopan nowheel"
                style={{
                    minHeight: 120,
                    resize: 'none',
                }}
            />
            <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-violet-400!" />
            <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-sky-500!" />
        </NodeShell>
    )
}

export default memo(TextNode)
