import {
    IconHistory,
    IconLayoutGrid,
    IconMessageCircle,
    IconPlus,
    IconSettings,
    IconSparkles,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { cn } from '@/utils/utils'

import './floatingSidebar.css'

// 侧边栏动作项类型
export type FloatingSidebarItem = {
    id: string
    label: string
    icon: ReactNode
    onClick?: () => void
    disabled?: boolean
    active?: boolean
    role?: 'primary' | 'default' | 'bottom'
    children?: { id: string; label: string }[]
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
        children: [
            { id: 'create-note', label: '便签' },
            { id: 'create-image', label: '图片' },
            { id: 'create-video', label: '视频' },
        ],
    },
    {
        id: 'assistant',
        label: '智能助手',
        icon: <IconSparkles size={20} />,
        children: [
            { id: 'novel-to-script-agent', label: '小说转剧本智能助手' },
            { id: 'short-video-script-agent', label: '爆款短视频脚本智能助手' },
        ],
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
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

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

        if (item.children) {
            // 如果有子菜单，切换展开状态
            setExpandedItemId(expandedItemId === item.id ? null : item.id)
        } else {
            item.onClick?.()
            onAction?.(item.id)
        }
    }

    // 处理子菜单项点击
    const handleSubItemClick = (subId: string) => {
        onAction?.(subId)
        setExpandedItemId(null)
    }

    // 渲染菜单项
    const renderMenuItems = (itemsList: FloatingSidebarItem[]) => {
        return itemsList.map((item) => (
            <div key={item.id} className="relative">
                <button
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                        'noflow nopan nodelete nodrag canvas-floating-sidebar__button',
                        item.id === 'create' && 'canvas-floating-sidebar__button--primary',
                        item.active && 'canvas-floating-sidebar__button--active',
                        item.disabled && 'canvas-floating-sidebar__button--disabled',
                    )}
                    disabled={item.disabled}
                    onClick={() => handleClick(item)}
                >
                    {item.icon}
                </button>

                {/* 子菜单 */}
                {item.children && expandedItemId === item.id && (
                    <div className="absolute left-full top-0 ml-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-max">
                        {item.children.map((subItem) => (
                            <button
                                key={subItem.id}
                                type="button"
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors noflow nopan nodelete nodrag"
                                onClick={() => handleSubItemClick(subItem.id)}
                            >
                                {subItem.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        ))
    }

    return (
        <aside className={cn('canvas-floating-sidebar', className)} aria-label="画布悬浮侧边栏">
            <div className="canvas-floating-sidebar__group canvas-floating-sidebar__group--primary">
                {renderMenuItems(primaryItems)}
            </div>

            <div className="canvas-floating-sidebar__group">
                {renderMenuItems(defaultRoleItems)}
            </div>

            <div className="canvas-floating-sidebar__group canvas-floating-sidebar__group--bottom">
                {renderMenuItems(bottomItems)}
            </div>
        </aside>
    )
}
