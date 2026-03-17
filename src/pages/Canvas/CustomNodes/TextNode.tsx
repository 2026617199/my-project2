import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Input, Typography } from 'antd'

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
            <div className="space-y-3">
                <Input.TextArea
                    value={data.content}
                    onChange={(event) => handleChange(event.target.value)}
                    placeholder="输入这段文本，例如镜头语言、人物描述、光影风格……"
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    className="rounded-2xl nodrag nopan nowheel"
                />
                <Typography.Text className="block text-xs text-slate-500">
                    当前字符数：{data.content.trim().length}
                </Typography.Text>
            </div>
            <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-sky-500!" />
        </NodeShell>
    )
}

export default memo(TextNode)
