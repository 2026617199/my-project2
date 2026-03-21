import { IconCopy, IconTrash } from '@tabler/icons-react'

type NoteToolbarProps = {
    onDuplicate: () => void
    onDelete: () => void
}

// 文本节点工具栏：仅保留复制和删除。
export const NoteToolbar = ({
    onDuplicate,
    onDelete,
}: NoteToolbarProps) => {
    return (
        <div className="noflow nopan nodrag absolute -top-12 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background px-2 py-1 shadow-sm">
            <button
                type="button"
                title="复制节点"
                aria-label="复制节点"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={onDuplicate}
            >
                <IconCopy size={16} />
            </button>

            <button
                type="button"
                title="删除节点"
                aria-label="删除节点"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                onClick={onDelete}
            >
                <IconTrash size={16} />
            </button>
        </div>
    )
}
