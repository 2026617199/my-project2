import { NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { NoteNodeType } from '@/types/flow'

import { NoteContent } from './NoteContent'
import { NoteToolbar } from './NoteToolbar'

// NoteNode：最小可用文本节点实现，保留编辑、预览、缩放与工具栏动作。
export const NoteNode = memo(({ id, data, selected, width, height, dragging }: NodeProps<NoteNodeType>) => {
    // console.log('测试会不会打印');
    // console.log(rest);
    const setNoteNodeEditing = useCanvasFlowStore((state) => state.setNoteNodeEditing)
    const updateNoteNodeContent = useCanvasFlowStore((state) => state.updateNoteNodeContent)
    const resizeNoteNode = useCanvasFlowStore((state) => state.resizeNoteNode)
    const duplicateNode = useCanvasFlowStore((state) => state.duplicateNode)
    const deleteNode = useCanvasFlowStore((state) => state.deleteNode)
    const isDragging = Boolean(dragging)

    const handleVisibilityClass = selected
        ? 'visible opacity-100'
        : 'invisible opacity-0 group-hover/node:visible group-hover/node:opacity-100'

    // console.log("文本节点重新渲染")
    return (
        <div className="group/node relative">
            <NodeResizer
                isVisible={selected && !isDragging}
                lineClassName="!border !border-muted-foreground"
                onResizeEnd={(_, { width, height }) => {
                    resizeNoteNode(id, width, height)
                }}
            />

            {/* 左侧输入 Handle：用于接收其他节点连接。 */}
            <ButtonHandle
                type="target"
                position={Position.Left}
                id="input"
                visible
                className={`${handleVisibilityClass}`}
            />

            {/* 右侧输出 Handle：用于连接到其他节点。 */}
            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible
                className={` ${handleVisibilityClass}`}
            />

            <div
                style={{
                    width,
                    height,
                }}
                className="relative flex h-full w-full flex-col gap-2 rounded-xl border"
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
                    <NoteContent
                        content={data.content}
                        isEditing={Boolean(data.isEditing)}
                        onStartEdit={() => {
                            setNoteNodeEditing(id, true)
                        }}
                        onStopEdit={() => {
                            setNoteNodeEditing(id, false)
                        }}
                        onContentBlur={(value) => {
                            updateNoteNodeContent(id, value)
                        }}
                    />
                </div>
            </div>
        </div>
    )
})

NoteNode.displayName = 'NoteNode'
