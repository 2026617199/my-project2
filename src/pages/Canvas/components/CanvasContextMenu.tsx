import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import { CANVAS_NODE_TYPES, type CanvasNodeType } from '@/types/canvas'

interface CanvasContextMenuProps {
    visible: boolean
    clientX: number
    clientY: number
    isConnectionMenu?: boolean
    allowedConnectionTargetTypes: Set<CanvasNodeType>
    onCreateNode: (type: CanvasNodeType) => void
    onDeleteSelected: () => void
    onClose: () => void
}

const CREATION_ITEMS: Array<{ key: CanvasNodeType; label: string }> = [
    { key: CANVAS_NODE_TYPES.text, label: '创建文本节点' },
    { key: CANVAS_NODE_TYPES.image, label: '创建图片节点' },
    { key: CANVAS_NODE_TYPES.video, label: '创建视频节点' },
]

export function CanvasContextMenu({
    visible,
    clientX,
    clientY,
    isConnectionMenu,
    allowedConnectionTargetTypes,
    onCreateNode,
    onDeleteSelected,
    onClose,
}: CanvasContextMenuProps) {
    if (!visible) {
        return null
    }

    return (
        <div
            data-context-menu-root="true"
            className={`absolute z-30 min-w-48 rounded-2xl border bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-md ${isConnectionMenu
                ? 'border-sky-300 ring-2 ring-sky-200'
                : 'border-slate-200'
                }`}
            style={{ left: clientX + 4, top: clientY + 4 }}
            onClick={(event) => event.stopPropagation()}
        >
            {isConnectionMenu && (
                <div className="mb-2 px-3 py-1 text-xs font-medium text-sky-600">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                        选择要创建的节点
                    </div>
                    <div className="mt-1 text-[11px] font-normal text-sky-500/80">
                        创建后将自动与源节点连线
                    </div>
                </div>
            )}

            {CREATION_ITEMS.map((item) => {
                const disabled = isConnectionMenu ? !allowedConnectionTargetTypes.has(item.key) : false

                return (
                    <div key={item.key}>
                        <button
                            type="button"
                            disabled={disabled}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${disabled
                                ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                                : 'text-slate-700 hover:bg-slate-100 active:scale-[0.99]'
                                }`}
                            onClick={() => {
                                if (disabled) {
                                    return
                                }

                                onCreateNode(item.key)
                                onClose()
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <span>
                                    <PlusOutlined />
                                </span>
                                <span>{item.label}</span>
                            </span>
                            {disabled ? (
                                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-400">
                                    不可用
                                </span>
                            ) : null}
                        </button>
                        {disabled ? (
                            <div className="px-3 pb-1 text-[11px] text-slate-400">仅允许创建图片或视频作为后续节点</div>
                        ) : null}
                    </div>
                )
            })}

            {!isConnectionMenu ? <div className="my-2 h-px bg-slate-200" /> : null}

            {!isConnectionMenu ? (
                <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                    onClick={() => {
                        onDeleteSelected()
                        onClose()
                    }}
                >
                    <DeleteOutlined />
                    <span>删除当前选中元素</span>
                </button>
            ) : null}
        </div>
    )
}
