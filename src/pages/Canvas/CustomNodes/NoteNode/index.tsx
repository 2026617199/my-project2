import { NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { memo, useRef } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { NoteNodeType } from '@/types/flow'

import { NoteContent } from './NoteContent'
import { NoteToolbar } from './NoteToolbar'

// NoteNode：最小可用文本节点实现，保留编辑、预览、缩放与工具栏动作。
export const NoteNode = memo(({ id, data, selected, width, height, dragging }: NodeProps<NoteNodeType>) => {
    const setNoteNodeEditing = useCanvasFlowStore((state) => state.setNoteNodeEditing)
    const updateNoteNodeContent = useCanvasFlowStore((state) => state.updateNoteNodeContent)
    const resizeNoteNode = useCanvasFlowStore((state) => state.resizeNoteNode)
    const duplicateNode = useCanvasFlowStore((state) => state.duplicateNode)
    const deleteNode = useCanvasFlowStore((state) => state.deleteNode)
    const isDragging = Boolean(dragging)

    const inputHandleId = data.inputHandleId ?? 'input'
    const outputHandleId = data.outputHandleId ?? 'output'
    const latestSizeRef = useRef<{ width: number; height: number } | null>(null)
    const handleVisibilityClass = selected
        ? 'visible opacity-100'
        : 'invisible opacity-0 group-hover/node:visible group-hover/node:opacity-100'

    // console.log("文本节点重新渲染")
    return (
        <div className="group/node relative">
            <NodeResizer
                isVisible={selected && !isDragging}
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
            <ButtonHandle
                type="target"
                position={Position.Left}
                id={inputHandleId}
                visible
                className={`transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            {/* 右侧输出 Handle：用于连接到其他节点。 */}
            <ButtonHandle
                type="source"
                position={Position.Right}
                id={outputHandleId}
                visible
                className={` transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            <div
                style={{
                    width,
                    height,
                }}
                className="relative flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-transform duration-200 ease-in-out"
            >
                {selected && !isDragging ? (
                    <NoteToolbar
                        onDuplicate={() => {
                            duplicateNode(id)
                        }}
                        onDelete={() => {
                            deleteNode(id)
                        }}
                    />
                ) : null}

                <div className="flex h-full w-full overflow-hidden rounded-md bg-white ">
                    {isDragging ? (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            拖动中...
                        </div>
                    ) : (
                        <NoteContent
                            content={data.content}
                            isEditing={Boolean(data.isEditing)}
                            onStartEdit={() => {
                                setNoteNodeEditing(id, true)
                            }}
                            onStopEdit={() => {
                                setNoteNodeEditing(id, false)
                            }}
                            onContentChange={(value) => {
                                updateNoteNodeContent(id, value)
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
})

NoteNode.displayName = 'NoteNode'
