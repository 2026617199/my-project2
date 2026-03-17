import { Tag, Typography } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'

import type { NodeExecutionStatus } from '@/types/canvas'

const STATUS_META: Record<NodeExecutionStatus, { label: string; className: string }> = {
    idle: { label: '待命', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    queued: { label: '排队中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    running: { label: '生成中', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    success: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    error: { label: '失败', className: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export function NodeShell({
    title,
    status,
    selected,
    subtitle,
    width,
    children,
}: PropsWithChildren<{
    title: string
    status: NodeExecutionStatus
    selected?: boolean
    subtitle?: ReactNode
    width?: number
}>) {
    const statusMeta = STATUS_META[status]
    const containerClassName = [
        width ? 'min-w-[280px]' : 'min-w-[280px] max-w-[320px]',
        'rounded-3xl border bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all',
        selected ? 'border-sky-400 ring-4 ring-sky-100' : 'border-slate-200',
    ].join(' ')
    const statusClassName = ['rounded-full border px-2 py-0.5 text-xs font-medium', statusMeta.className].join(' ')

    return (
        <div className={containerClassName} style={width ? { width } : undefined}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <Typography.Text strong className="block text-[15px] text-slate-900">
                        {title}
                    </Typography.Text>
                </div>
                <Tag className={statusClassName}>
                    {statusMeta.label}
                </Tag>
            </div>
            {children}
        </div>
    )
}

export function PreviewSection({ title, children }: PropsWithChildren<{ title: string }>) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3">
            <Typography.Text strong className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                {title}
            </Typography.Text>
            {children}
        </div>
    )
}
