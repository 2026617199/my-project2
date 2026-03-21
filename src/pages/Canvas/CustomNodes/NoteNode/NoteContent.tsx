import Markdown from 'react-markdown'

type NoteContentProps = {
    content: string
    isEditing: boolean
    onStartEdit: () => void
    onStopEdit: () => void
    onContentChange: (value: string) => void
}

// 文本内容区：负责"编辑态 textarea"与"预览态 markdown"切换。
export const NoteContent = ({
    content,
    isEditing,
    onStartEdit,
    onStopEdit,
    onContentChange,
}: NoteContentProps) => {
    if (isEditing) {
        return (
            <textarea
                value={content}
                maxLength={2500}
                placeholder="双击开始输入或编辑 Markdown..."
                className="noflow nopan nodrag nowheel h-full w-full resize-none rounded-md border-0 bg-transparent p-2 text-sm outline-none ring-0 text-foreground"
                onMouseDown={(event) => {
                    event.stopPropagation()
                }}
                onBlur={onStopEdit}
                onChange={(event) => onContentChange(event.target.value)}
            />
        )
    }

    return (
        <div
            className="noflow nopan nowheel h-full w-full overflow-auto p-2 text-sm prose prose-sm max-w-none text-foreground"
            onDoubleClick={onStartEdit}
        >
            {content.trim() ? (
                <Markdown>{content}</Markdown>
            ) : (
                    <div className="opacity-70 text-foreground">双击开始输入或编辑 Markdown...</div>
            )}
        </div>
    )
}
