import {
    IconHistory,
    IconLayoutGrid,
    IconMessageCircle,
    IconPlus,
    IconSettings,
    IconSparkles,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { cn } from '@/utils/utils'

import './floatingSidebar.css'

// 侧边栏动作项类型：用于约束占位动作的数据结构，方便后续接入真实交互逻辑。
export type FloatingSidebarItem = {
    id: string
    label: string
    icon: ReactNode
    onClick?: () => void
    disabled?: boolean
    active?: boolean
    role?: 'primary' | 'default' | 'bottom'
}

// 组件 Props：支持外部注入动作项与统一动作回调，当前以占位逻辑为主。
export type FloatingSidebarProps = {
    items?: FloatingSidebarItem[]
    onAction?: (id: string) => void
    className?: string
}

// 默认占位动作：首版使用 6 个常用图标动作，分为顶部主操作、中部工具组、底部次级操作。
const defaultItems: FloatingSidebarItem[] = [
    {
        id: 'create',
        label: '新增节点',
        icon: <IconPlus stroke={2.5} size={22} />,
        role: 'primary',
    },
    {
        id: 'assistant',
        label: '智能助手',
        icon: <IconSparkles size={20} />,
    },
    {
        id: 'layout',
        label: '布局工具',
        icon: <IconLayoutGrid size={20} />,
    },
    {
        id: 'comment',
        label: '注释面板',
        icon: <IconMessageCircle size={20} />,
    },
    {
        id: 'history',
        label: '历史记录',
        icon: <IconHistory size={20} />,
    },
    {
        id: 'settings',
        label: '设置',
        icon: <IconSettings size={20} />,
        role: 'bottom',
    },
]

// 过滤工具函数：按角色拆分渲染区域，保持结构与视觉层级清晰。
const getItemsByRole = (items: FloatingSidebarItem[], role: FloatingSidebarItem['role']) => {
    if (role === 'default') {
        return items.filter((item) => !item.role || item.role === 'default')
    }

    return items.filter((item) => item.role === role)
}

// 悬浮侧边栏组件：只负责视觉与占位回调，不耦合业务状态。
export const FloatingSidebar = ({ items = defaultItems, onAction, className }: FloatingSidebarProps) => {
    // 顶部主操作。
    const primaryItems = getItemsByRole(items, 'primary')
    // 中部常规操作。
    const defaultRoleItems = getItemsByRole(items, 'default')
    // 底部次级操作。
    const bottomItems = getItemsByRole(items, 'bottom')

    // 占位点击处理：优先调用 item.onClick，其次派发统一 onAction。
    const handleClick = (item: FloatingSidebarItem) => {
        if (item.disabled) {
            return
        }

        item.onClick?.()
        onAction?.(item.id)
    }

    return (
        <aside className={cn('canvas-floating-sidebar', className)} aria-label="画布悬浮侧边栏">
            <div className="canvas-floating-sidebar__group canvas-floating-sidebar__group--primary">
                {primaryItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                            'noflow nopan nodelete nodrag canvas-floating-sidebar__button canvas-floating-sidebar__button--primary',
                            item.active && 'canvas-floating-sidebar__button--active',
                            item.disabled && 'canvas-floating-sidebar__button--disabled',
                        )}
                        disabled={item.disabled}
                        onClick={() => handleClick(item)}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>

            <div className="canvas-floating-sidebar__group">
                {defaultRoleItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                            'noflow nopan nodelete nodrag canvas-floating-sidebar__button',
                            item.active && 'canvas-floating-sidebar__button--active',
                            item.disabled && 'canvas-floating-sidebar__button--disabled',
                        )}
                        disabled={item.disabled}
                        onClick={() => handleClick(item)}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>

            <div className="canvas-floating-sidebar__group canvas-floating-sidebar__group--bottom">
                {bottomItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                            'noflow nopan nodelete nodrag canvas-floating-sidebar__button',
                            item.active && 'canvas-floating-sidebar__button--active',
                            item.disabled && 'canvas-floating-sidebar__button--disabled',
                        )}
                        disabled={item.disabled}
                        onClick={() => handleClick(item)}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>
        </aside>
    )
}
