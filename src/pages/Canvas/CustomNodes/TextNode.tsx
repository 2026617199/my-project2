import { memo, useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Input, Typography } from 'antd'

import { NodeShell } from './shared'

import { useCanvasStore } from '@/store/canvas'
import type { TextCanvasNode } from '@/types/canvas'

const MIN_NODE_WIDTH = 280
const MAX_NODE_WIDTH = 680
const MIN_TEXTAREA_HEIGHT = 120
const MAX_TEXTAREA_HEIGHT = 720

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function TextNode({ id, data, selected }: NodeProps<TextCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const [size, setSize] = useState(() => ({
        width: clamp(data.width ?? 320, MIN_NODE_WIDTH, MAX_NODE_WIDTH),
        height: clamp(data.height ?? 160, MIN_TEXTAREA_HEIGHT, MAX_TEXTAREA_HEIGHT),
    }))
    const sizeRef = useRef(size)

    useEffect(() => {
        const nextSize = {
            width: clamp(data.width ?? 320, MIN_NODE_WIDTH, MAX_NODE_WIDTH),
            height: clamp(data.height ?? 160, MIN_TEXTAREA_HEIGHT, MAX_TEXTAREA_HEIGHT),
        }

        sizeRef.current = nextSize
        setSize(nextSize)
    }, [data.height, data.width])

    const handleChange = useCallback(
        (value: string) => {
            updateNodeData(id, { content: value })
        },
        [id, updateNodeData],
    )

    const handleResizeStart = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            event.preventDefault()
            event.stopPropagation()

            const startX = event.clientX
            const startY = event.clientY
            const startWidth = sizeRef.current.width
            const startHeight = sizeRef.current.height
            let latestWidth = startWidth
            let latestHeight = startHeight

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const nextWidth = clamp(startWidth + (moveEvent.clientX - startX), MIN_NODE_WIDTH, MAX_NODE_WIDTH)
                const nextHeight = clamp(startHeight + (moveEvent.clientY - startY), MIN_TEXTAREA_HEIGHT, MAX_TEXTAREA_HEIGHT)
                latestWidth = nextWidth
                latestHeight = nextHeight

                const nextSize = { width: nextWidth, height: nextHeight }
                sizeRef.current = nextSize
                setSize(nextSize)
            }

            const handleMouseUp = () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
                updateNodeData(id, {
                    width: latestWidth,
                    height: latestHeight,
                })
            }

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        },
        [id, updateNodeData],
    )

    return (
        <NodeShell
            title={data.title}
            status={data.status}
            selected={selected}
            width={size.width}
            subtitle="连接到图片/视频节点后，会按连线顺序拼接进最终提示词。"
        >
            <div className="space-y-3">
                <div className="relative">
                    <Input.TextArea
                        value={data.content}
                        onChange={(event) => handleChange(event.target.value)}
                        placeholder="输入这段文本，例如镜头语言、人物描述、光影风格……"
                        className="rounded-2xl nodrag nopan nowheel"
                        style={{
                            height: size.height,
                            minHeight: MIN_TEXTAREA_HEIGHT,
                            maxHeight: MAX_TEXTAREA_HEIGHT,
                            resize: 'none',
                        }}
                    />
                    <div
                        role="presentation"
                        onMouseDown={handleResizeStart}
                        className="nodrag nopan nowheel absolute bottom-2 right-2 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md border border-slate-200 bg-white/95 text-[10px] text-slate-400 shadow-sm"
                        title="拖拽调整文本区域大小"
                    >
                        ◢
                    </div>
                </div>
                <Typography.Text className="block text-xs text-slate-500">
                    当前字符数：{data.content.trim().length}
                </Typography.Text>
            </div>
            <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-violet-400!" />
            <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-sky-500!" />
        </NodeShell>
    )
}

export default memo(TextNode)
