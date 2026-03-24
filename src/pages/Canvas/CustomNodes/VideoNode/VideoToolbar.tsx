import {
    IconAspectRatio,
    IconBrush,
    IconCrop,
    IconDownload,
    IconEraser,
    IconSparkles,
    IconZoomIn,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
// import Captions from 'yet-another-react-lightbox/plugins/captions'
import Download from 'yet-another-react-lightbox/plugins/download'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Share from 'yet-another-react-lightbox/plugins/share'
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow'
// import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { toast } from 'sonner'

import type { VideoGenerationNode } from '@/types/flow'

type VideoToolbarProps = {
    data: VideoGenerationNode
    selected: boolean
    zoom?: number
}

type ActionKey = 'repaint' | 'erase' | 'enhance' | 'outpaint' | 'crop' | 'download' | 'preview'

/**
 * 视频节点工具栏组件
 * 职责：
 * - 提供重绘、擦除、增强、扩图、裁剪、下载、放大查看等操作按钮
 * - 处理工具栏按钮交互反馈
 * - 基于 yet-another-react-lightbox 提供放大查看能力
 */
export const VideoToolbar = ({
    data,
    selected,
}: VideoToolbarProps) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)

    // 对齐图片工具栏的数据组织方式，统一使用数组映射给 Lightbox
    const videoUrls = data.result?.data?.map((item) => item.url) ?? []
    const currentVideoUrl = videoUrls[0]

    const toolbarActions = useMemo(() => {
        return [
            { key: 'repaint' as const, label: '重绘', icon: IconBrush },
            { key: 'erase' as const, label: '擦除', icon: IconEraser },
            { key: 'enhance' as const, label: '增强', icon: IconSparkles },
            { key: 'outpaint' as const, label: '扩图', icon: IconAspectRatio },
            { key: 'crop' as const, label: '裁剪', icon: IconCrop },
            { key: 'download' as const, label: '下载', icon: IconDownload },
            { key: 'preview' as const, label: '放大查看', icon: IconZoomIn },
        ]
    }, [])

    const handleAction = (actionKey: ActionKey) => {
        if (actionKey === 'preview') {
            if (!currentVideoUrl) {
                toast.info('暂无可预览视频')
                return
            }

            setIsLightboxOpen(true)
            return
        }

        // 其余功能仅保留占位交互框架，业务逻辑后续接入
        toast.info('功能开发中...')
    }

    const isPreviewActive = isLightboxOpen

    return (
        <>
            <div
                className={`nodrag nopan nowheel inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 shadow-md transition-all duration-200 ${selected
                    ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                    }`}
            >
                {toolbarActions.map((item) => {
                    const Icon = item.icon
                    const isActive = item.key === 'preview' ? isPreviewActive : false

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleAction(item.key)}
                            className={`nodrag nopan nowheel inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors ${isActive
                                ? 'border-sky-300 bg-sky-50 text-sky-700'
                                : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:border-slate-300 active:bg-slate-100 active:text-slate-900'
                                }`}
                            title={item.label}
                            aria-label={item.label}
                        >
                            <Icon size={24} stroke={1.8} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </div>

            {isLightboxOpen ? (
                <Lightbox
                    open={isLightboxOpen}
                    close={() => {
                        setIsLightboxOpen(false)
                    }}
                    slides={videoUrls.filter((url): url is string => !!url).map((url) => ({ src: url }))}
                    plugins={[Fullscreen, Slideshow, Zoom, Share, Download]}
                    zoom={{ maxZoomPixelRatio: 4, zoomInMultiplier: 2 }}
                    controller={{ closeOnBackdropClick: true }}
                />
            ) : null}
        </>
    )
}
