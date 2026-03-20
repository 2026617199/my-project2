import { useCallback, useEffect, useRef, useState } from 'react'

// 管理工具栏按钮的短暂激活态，统一计时器清理，避免重复 setTimeout 代码。
export const useTransientToolbarAction = (duration = 320) => {
    const [activeAction, setActiveAction] = useState<string | null>(null)
    const actionTimerRef = useRef<number | null>(null)

    const clearTimer = useCallback(() => {
        if (actionTimerRef.current) {
            window.clearTimeout(actionTimerRef.current)
            actionTimerRef.current = null
        }
    }, [])

    const trigger = useCallback(
        (action: string) => {
            setActiveAction(action)
            clearTimer()

            actionTimerRef.current = window.setTimeout(() => {
                setActiveAction((prev) => (prev === action ? null : prev))
            }, duration)
        },
        [clearTimer, duration],
    )

    useEffect(() => {
        // 组件卸载时释放计时器，避免潜在内存泄漏。
        return () => {
            clearTimer()
        }
    }, [clearTimer])

    return {
        activeAction,
        trigger,
        clearTimer,
        setActiveAction,
    }
}
