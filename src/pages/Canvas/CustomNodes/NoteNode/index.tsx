import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { useRef } from 'react'

import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { NoteNodeType } from '@/types/flow'

import { NoteContent } from './NoteContent'
import { NoteToolbar } from './NoteToolbar'

// NoteNode：最小可用文本节点实现，保留编辑、预览、缩放与工具栏动作。
export const NoteNode = ({ id, data, selected, width, height }: NodeProps<NoteNodeType>) => {
    const updateNoteNode = useCanvasFlowStore((state) => state.updateNoteNode)
    const resizeNoteNode = useCanvasFlowStore((state) => state.resizeNoteNode)
    const duplicateNoteNode = useCanvasFlowStore((state) => state.duplicateNoteNode)
    const deleteNode = useCanvasFlowStore((state) => state.deleteNode)
    const setNodeEditing = useCanvasFlowStore((state) => state.setNodeEditing)

    const inputHandleId = data.inputHandleId ?? 'input'
    const outputHandleId = data.outputHandleId ?? 'output'
    const latestSizeRef = useRef<{ width: number; height: number } | null>(null)

    console.log("文本节点重新渲染")
    return (
        <>
            <NodeResizer
                isVisible={selected}
                lineClassName="!border !border-muted-foreground"
                onResize={(_, { width, height }) => {
                    latestSizeRef.current = { width, height }
                }}
                onResizeEnd={(_, { width, height }) => {
                    const nextSize = latestSizeRef.current ?? { width, height }
                    resizeNoteNode(id, nextSize.width, nextSize.height)
                    latestSizeRef.current = null
                }}
            />

            {/* 左侧输入 Handle：用于接收其他节点连接。 */}
            <Handle
                type="target"
                position={Position.Left}
                id={inputHandleId}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            {/* 右侧输出 Handle：用于连接到其他节点。 */}
            <Handle
                type="source"
                position={Position.Right}
                id={outputHandleId}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            <div
                style={{
                    width,
                    height,
                }}
                className="relative flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-transform duration-200 ease-in-out"
            >
                {selected ? (
                    <NoteToolbar
                        onDuplicate={() => {
                            duplicateNoteNode(id)
                        }}
                        onDelete={() => {
                            deleteNode(id)
                        }}
                    />
                ) : null}

                <div className="flex h-full w-full overflow-hidden rounded-md bg-white ">
                    <NoteContent
                        content={data.content}
                        isEditing={Boolean(data.isEditing)}
                        onStartEdit={() => {
                            setNodeEditing(id, true)
                        }}
                        onStopEdit={() => {
                            setNodeEditing(id, false)
                        }}
                        onContentChange={(value) => {
                            updateNoteNode(id, {
                                content: value,
                            })
                        }}
                    />
                </div>
            </div>
        </>
    )
}
