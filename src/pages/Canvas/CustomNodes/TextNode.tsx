import { memo, useCallback, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Input } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'

import { NodeShell } from './shared'

import { useCanvasStore } from '@/store/canvas'
import type { TextCanvasNode } from '@/types/canvas'

function TextNode({ id, data, selected }: NodeProps<TextCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const textAreaRef = useRef<TextAreaRef>(null)
    const committedValueRef = useRef(data.content)

    const commitContent = useCallback(
        (value: string) => {
            if (value === committedValueRef.current) {
                return
            }

            committedValueRef.current = value
            updateNodeData(id, { content: value })
        },
        [id, updateNodeData],
    )

    useEffect(() => {
        committedValueRef.current = data.content

        const nativeTextArea = textAreaRef.current?.resizableTextArea?.textArea
        if (!nativeTextArea) {
            return
        }

        if (nativeTextArea.value !== data.content) {
            nativeTextArea.value = data.content
        }
    }, [data.content])

    return (
        <NodeShell
            title={data.title}
            status={data.status}
            selected={selected}
            subtitle="连接到图片/视频节点后，会按连线顺序拼接进最终提示词。"
        >
            <Input.TextArea
                ref={textAreaRef}
                defaultValue={data.content}
                onBlur={(event) => commitContent(event.target.value)}
                onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        commitContent(event.currentTarget.value)
                    }
                }}
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
