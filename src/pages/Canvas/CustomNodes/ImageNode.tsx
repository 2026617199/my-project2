import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Typography, message } from 'antd'
import { Controlled as ControlledZoom } from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import '@/pages/Canvas/extensions/aiPromptMention.css'
import {
    PlusOutlined,
    CloseOutlined,
    ReloadOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
    ExpandOutlined,
    ScissorOutlined,
    DownloadOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
} from '@ant-design/icons'

import { NodeShell, PreviewSection } from './shared'
import { useTransientToolbarAction } from './hooks/useTransientToolbarAction'
import { validateImageFile } from './utils'

import CloudButton from '@/components/CloudButton'
import CloudSelect from '@/components/CloudSelect'
import {
    IMAGE_COUNTS,
    IMAGE_MODELS,
    IMAGE_ORIENTATIONS,
    IMAGE_RESOLUTIONS,
    IMAGE_SIZES,
} from '@/constants/ai-models'
import { uploadImage } from '@/api/ai'
import { AiPromptMention } from '@/pages/Canvas/extensions'
import { useCanvasStore } from '@/store/canvas'
import type { ImageCanvasNode, ImageNodeData } from '@/types/canvas'

type ActionToolbarItem = {
    key: 'redraw' | 'erase' | 'enhance' | 'outpaint' | 'crop' | 'download' | 'fullscreen'
    label: '重绘' | '擦除' | '增强' | '扩图' | '裁剪' | '下载' | '全屏查看'
    icon: React.ReactNode
}

function ImageNode({ id, data, selected }: NodeProps<ImageCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)
    const zoom = useCanvasStore((state) => state.viewport.zoom)
    const [isImageLoading, setIsImageLoading] = useState(false)
    const [hasImageLoadError, setHasImageLoadError] = useState(false)
    const [isUploadLoading, setIsUploadLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | undefined>(undefined)
    const [isReferenceUploadLoading, setIsReferenceUploadLoading] = useState(false)
    const [referenceUploadError, setReferenceUploadError] = useState<string | undefined>(undefined)
    const [isImageZoomed, setIsImageZoomed] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const referenceFileInputRef = useRef<HTMLInputElement>(null)
    const promptCacheRef = useRef(data.prompt ?? '')
    const {
        activeAction: activeToolbarAction,
        trigger: triggerToolbarAction,
        clearTimer: clearToolbarActionTimer,
    } = useTransientToolbarAction()

    const modelOptions = useMemo(
        () => IMAGE_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const editor = useEditor({
        extensions: [StarterKit, AiPromptMention],
        content: data.prompt || '',
        immediatelyRender: true,
        editorProps: {
            attributes: {
                class:
                    'nodrag nopan nowheel min-h-[200px] max-h-[200px] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 focus:outline-none',
            },
        },
    })

    const handlePatch = useCallback(
        (patch: Partial<ImageNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    const commitPromptToStore = useCallback(() => {
        if (!editor) {
            return
        }

        const nextPrompt = editor
            .getText({
                blockSeparator: '\n',
                textSerializers: {
                    aiPromptMention: ({ node }: { node: { attrs?: Record<string, unknown> } }) =>
                        String(node.attrs?.prompt ?? node.attrs?.label ?? ''),
                },
            })
            .trim()
        promptCacheRef.current = nextPrompt

        if (nextPrompt !== data.prompt) {
            handlePatch({ prompt: nextPrompt })
        }
    }, [data.prompt, editor, handlePatch])

    // 处理文件上传
    const uploadImageFile = useCallback(
        async (file: File) => {
            setIsUploadLoading(true)
            setUploadError(undefined)

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('purpose', 'generation')

                const response = await uploadImage(formData)
                const responseData = response

                if (responseData.success && responseData.data?.url) {
                    // 新上传的图片追加到现有的 outputImages
                    const newOutputImages = [
                        ...data.outputImages,
                        { url: responseData.data.url },
                    ]
                    updateNodeData(id, { outputImages: newOutputImages })
                    message.success('图片上传成功')
                    setUploadError(undefined)
                } else {
                    const errorMsg = responseData.message || '上传失败，请重试'
                    setUploadError(errorMsg)
                    message.error(errorMsg)
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : '上传失败，请检查网络连接'
                setUploadError(errorMsg)
                message.error(errorMsg)
            } finally {
                setIsUploadLoading(false)
            }
        },
        [id, data.outputImages, updateNodeData],
    )

    const uploadReferenceImage = useCallback(
        async (file: File) => {
            setIsReferenceUploadLoading(true)
            setReferenceUploadError(undefined)

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('purpose', 'generation')

                const response = await uploadImage(formData)
                if (response.success && response.data?.url) {
                    const currentUploaded = Array.isArray(data.uploadedReferenceImageUrls)
                        ? data.uploadedReferenceImageUrls
                        : []
                    const appended = [...currentUploaded, response.data.url]

                    handlePatch({
                        uploadedReferenceImageUrls: Array.from(new Set(appended)),
                        dismissedAutoReferenceImageUrls: (data.dismissedAutoReferenceImageUrls ?? []).filter(
                            (item) => item !== response.data.url,
                        ),
                    })

                    message.success('参考图上传成功')
                    return
                }

                const errorMsg = response.message || '上传失败，请稍后重试'
                setReferenceUploadError(errorMsg)
                message.error(errorMsg)
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : '上传失败，请检查网络连接'
                setReferenceUploadError(errorMsg)
                message.error(errorMsg)
            } finally {
                setIsReferenceUploadLoading(false)
            }
        },
        [data.dismissedAutoReferenceImageUrls, data.uploadedReferenceImageUrls, handlePatch],
    )

    // 处理文件选择
    const handleImageUpload = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files
            if (!files || files.length === 0) return

            const file = files[0]
            const validation = validateImageFile(file)

            if (!validation.valid) {
                setUploadError(validation.error)
                message.error(validation.error)
                return
            }

            void uploadImageFile(file)

            // 重置 input，允许重新上传同一个文件
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        },
        [uploadImageFile],
    )

    const handleReferenceImageUpload = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (!file) {
                return
            }

            const validation = validateImageFile(file)
            if (!validation.valid) {
                setReferenceUploadError(validation.error)
                message.error(validation.error)
                event.target.value = ''
                return
            }

            void uploadReferenceImage(file)
            event.target.value = ''
        },
        [uploadReferenceImage],
    )

    // 删除指定索引的图片
    const handleDeleteImage = useCallback(
        (index: number) => {
            const newOutputImages = data.outputImages.filter((_, i) => i !== index)
            updateNodeData(id, { outputImages: newOutputImages })
        },
        [id, data.outputImages, updateNodeData],
    )

    const handleDeleteReferenceImage = useCallback(
        (url: string) => {
            const nextUploaded = (data.uploadedReferenceImageUrls ?? []).filter((item) => item !== url)
            const dismissed = Array.from(new Set([...(data.dismissedAutoReferenceImageUrls ?? []), url]))

            handlePatch({
                uploadedReferenceImageUrls: nextUploaded,
                dismissedAutoReferenceImageUrls: dismissed,
            })
        },
        [data.dismissedAutoReferenceImageUrls, data.uploadedReferenceImageUrls, handlePatch],
    )

    const previewImageUrl = data.outputImages[0]?.url
    const referenceImageUrls = data.referenceImageUrls ?? []
    const hasHorizontalScroll = referenceImageUrls.length > 8

    const actionToolbarItems = useMemo<ActionToolbarItem[]>(
        () => [
            { key: 'redraw', label: '重绘', icon: <ReloadOutlined className="text-[24px]" /> },
            { key: 'erase', label: '擦除', icon: <DeleteOutlined className="text-[24px]" /> },
            { key: 'enhance', label: '增强', icon: <ThunderboltOutlined className="text-[24px]" /> },
            { key: 'outpaint', label: '扩图', icon: <ExpandOutlined className="text-[24px]" /> },
            { key: 'crop', label: '裁剪', icon: <ScissorOutlined className="text-[24px]" /> },
            { key: 'download', label: '下载', icon: <DownloadOutlined className="text-[24px]" /> },
            {
                key: 'fullscreen',
                label: '全屏查看',
                icon: isImageZoomed ? (
                    <FullscreenExitOutlined className="text-[24px]" />
                ) : (
                    <FullscreenOutlined className="text-[24px]" />
                ),
            },
        ],
        [isImageZoomed],
    )

    const showActionFeedback = useCallback((action: ActionToolbarItem['key'], label: string) => {
        // 触发短暂激活态，提升按钮反馈一致性。
        triggerToolbarAction(action)

        message.info(`${label}事件已触发（占位功能）`)
    }, [triggerToolbarAction])

    const toggleImageZoom = useCallback(() => {
        if (!previewImageUrl) {
            message.warning('当前没有可全屏查看的图片')
            return
        }

        setIsImageZoomed((prev) => !prev)
    }, [previewImageUrl])

    const handleToolbarAction = useCallback(
        (item: ActionToolbarItem) => {
            if (item.key === 'fullscreen') {
                toggleImageZoom()
                triggerToolbarAction('fullscreen')
                return
            }

            showActionFeedback(item.key, item.label)
        },
        [showActionFeedback, toggleImageZoom],
    )

    const handleRunImage = useCallback(() => {
        commitPromptToStore()
        void runNode(id)
    }, [commitPromptToStore, id, runNode])

    useEffect(() => {
        if (!previewImageUrl) {
            setIsImageLoading(false)
            setHasImageLoadError(false)
            return
        }

        setIsImageLoading(true)
        setHasImageLoadError(false)
    }, [previewImageUrl])

    useEffect(() => {
        if (!editor) {
            return
        }

        const nextPrompt = data.prompt || ''
        if (nextPrompt === promptCacheRef.current) {
            return
        }

        promptCacheRef.current = nextPrompt
        if (!editor.isFocused) {
            editor.commands.setContent(nextPrompt)
        }
    }, [data.prompt, editor])

    useEffect(() => {
        // 双保险：组件生命周期结束时确保无残留计时器。
        return () => {
            clearToolbarActionTimer()
        }
    }, [clearToolbarActionTimer])

    useEffect(() => {
        const patch: Partial<ImageNodeData> = {}

        if (!Array.isArray(data.referenceImageUrls)) {
            patch.referenceImageUrls = []
        }
        if (!Array.isArray(data.uploadedReferenceImageUrls)) {
            patch.uploadedReferenceImageUrls = []
        }
        if (!Array.isArray(data.dismissedAutoReferenceImageUrls)) {
            patch.dismissedAutoReferenceImageUrls = []
        }

        if (Object.keys(patch).length > 0) {
            handlePatch(patch)
        }
    }, [data, handlePatch])

    return (
        <>
            <NodeToolbar isVisible position={Position.Top} offset={10 * zoom}>
                <div
                    className={`nodrag nopan nowheel inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md transition-all duration-200 ${selected
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                        }`}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'bottom center' }}
                >
                    {actionToolbarItems.map((item) => {
                        const isActive = item.key === 'fullscreen' ? isImageZoomed : activeToolbarAction === item.key

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => void handleToolbarAction(item)}
                                className={`nodrag nopan nowheel inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-all duration-200 ${isActive
                                    ? 'border-sky-300 bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(125,211,252,0.4)]'
                                    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                title={item.label}
                                aria-label={item.label}
                            >
                                <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </NodeToolbar>
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20 * zoom}>
                <div
                    className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-lg"
                    style={{ width: 640, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                    {/* 图片节点工具栏 */}
                    <div className="space-y-4">
                        <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => referenceFileInputRef.current?.click()}
                                    disabled={isReferenceUploadLoading}
                                    className="nodrag nopan nowheel flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-200 text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="上传参考图"
                                    aria-label="上传参考图"
                                >
                                    <PlusOutlined className="text-lg" />
                                </button>

                                <div
                                    className={`nodrag nopan nowheel h-16 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1 ${hasHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
                                >
                                    {referenceImageUrls.length > 0 ? (
                                        <div className="flex h-full items-center gap-2">
                                            {referenceImageUrls.map((url, index) => (
                                                <div key={`${url}-${index}`} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                                                    <img src={url} alt={`参考图-${index + 1}`} className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteReferenceImage(url)}
                                                        className="nodrag nopan nowheel absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-md bg-rose-500/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                        title="删除参考图"
                                                        aria-label={`删除参考图${index + 1}`}
                                                    >
                                                        <DeleteOutlined className="text-[10px]" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center text-xs text-slate-400">
                                            暂无参考图，点击左侧按钮上传（支持自动注入上游图片）。
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={referenceFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleReferenceImageUpload}
                            />
                            {referenceUploadError ? (
                                <Typography.Text className="block text-xs text-rose-600">{referenceUploadError}</Typography.Text>
                            ) : null}
                        </section>

                        <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div className="flex items-center justify-between">
                                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    编辑区（prompt）
                                </Typography.Text>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                                        onClick={() => editor?.chain().focus().undo().run()}
                                        disabled={!editor?.can().undo()}
                                    >
                                        撤销
                                    </button>
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                                        onClick={() => editor?.chain().focus().redo().run()}
                                        disabled={!editor?.can().redo()}
                                    >
                                        重做
                                    </button>
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-100"
                                        onClick={() => {
                                            editor?.commands.clearContent()
                                            promptCacheRef.current = ''
                                            handlePatch({ prompt: '' })
                                        }}
                                    >
                                        清空
                                    </button>
                                </div>
                            </div>
                            <div onBlur={commitPromptToStore}>
                                <EditorContent editor={editor} />
                            </div>
                        </section>

                        {/* 配置工具栏部分 */}
                        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                配置选项
                            </Typography.Text>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Typography.Text className="text-xs text-slate-500">模型</Typography.Text>
                                    <CloudSelect
                                        className="nodrag nopan nowheel"
                                        value={data.model}
                                        options={modelOptions}
                                        onChange={(value) => handlePatch({ model: String(value) })}
                                        placeholder="选择模型"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Typography.Text className="text-xs text-slate-500">尺寸</Typography.Text>
                                    <CloudSelect
                                        className="nodrag nopan nowheel"
                                        value={data.size}
                                        options={IMAGE_SIZES}
                                        onChange={(value) => handlePatch({ size: String(value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Typography.Text className="text-xs text-slate-500">分辨率</Typography.Text>
                                    <CloudSelect
                                        className="nodrag nopan nowheel"
                                        value={data.resolution}
                                        options={IMAGE_RESOLUTIONS}
                                        onChange={(value) => handlePatch({ resolution: String(value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Typography.Text className="text-xs text-slate-500">方向</Typography.Text>
                                    <CloudSelect
                                        className="nodrag nopan nowheel"
                                        value={data.orientation}
                                        options={IMAGE_ORIENTATIONS}
                                        onChange={(value) => handlePatch({ orientation: String(value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Typography.Text className="text-xs text-slate-500">生成数量</Typography.Text>
                                <CloudSelect
                                    className="nodrag nopan nowheel"
                                    value={data.count}
                                    options={IMAGE_COUNTS}
                                    onChange={(value) => handlePatch({ count: Number(value) })}
                                />
                            </div>

                            <PreviewSection title="最终提示词预览">
                                <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-xs text-slate-600">
                                    {data.finalPrompt || '等待输入提示词或连接文本节点'}
                                </Typography.Paragraph>
                            </PreviewSection>

                            <div className="flex justify-end">
                                <CloudButton loading={data.status === 'queued' || data.status === 'running'} onClick={handleRunImage}>
                                    生成图片
                                </CloudButton>
                            </div>
                        </section>
                    </div>
                </div>
            </NodeToolbar>
            <NodeShell
                title={data.title}
                status={data.status}
                selected={selected}
                subtitle={`模型：${data.model || '未设置'} · 尺寸：${data.size}`}
            >
                <div className="space-y-3 border-t border-slate-200/80 pt-3">
                    <PreviewSection title="图片预览">
                        <div className="nodrag nopan nowheel">
                            {previewImageUrl ? (
                                <div className="space-y-2">
                                    <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                        <ControlledZoom
                                            isZoomed={isImageZoomed}
                                            onZoomChange={setIsImageZoomed}
                                            zoomMargin={24}
                                        >
                                            <img
                                                src={previewImageUrl}
                                                alt="生成结果"
                                                className={`h-full w-full cursor-zoom-in object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                                onLoad={() => setIsImageLoading(false)}
                                                onError={() => {
                                                    setIsImageLoading(false)
                                                    setHasImageLoadError(true)
                                                }}
                                            />
                                        </ControlledZoom>
                                        {isImageLoading && !hasImageLoadError ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                                                    图片加载中...
                                                </div>
                                            </div>
                                        ) : null}
                                        {hasImageLoadError ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-rose-50/95 p-3 text-center text-xs text-rose-600">
                                                图片加载失败，请重试生成或检查图片链接。
                                            </div>
                                        ) : null}
                                        {data.outputImages.length > 0 && (
                                            <button
                                                onClick={() => handleDeleteImage(0)}
                                                className="nodrag nopan nowheel absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/90 text-white opacity-0 shadow-sm transition-opacity hover:bg-rose-600"
                                                title="删除此图片"
                                                style={{ opacity: selected ? 1 : undefined }}
                                            >
                                                <CloseOutlined className="text-xs" />
                                            </button>
                                        )}
                                    </div>
                                    {data.outputImages.length > 1 && (
                                        <Typography.Text className="block text-center text-xs text-slate-500">
                                            共 {data.outputImages.length} 张图片（显示第一张）
                                        </Typography.Text>
                                    )}
                                </div>
                            ) : isUploadLoading ? (
                                <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100/70">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-sky-600" />
                                        <Typography.Text className="text-xs text-slate-600">
                                            上传中...
                                        </Typography.Text>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="nodrag nopan nowheel flex h-56 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/70 transition-all hover:border-sky-400 hover:bg-sky-50/50"
                                    disabled={isUploadLoading}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <PlusOutlined className="text-3xl text-slate-400 transition-colors group-hover:text-sky-500" />
                                        <Typography.Text className="text-xs text-slate-500">
                                            点击添加图片
                                        </Typography.Text>
                                    </div>
                                </button>
                            )}
                            {uploadError && !isUploadLoading && (
                                <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                                    <Typography.Text className="block text-rose-600">
                                        {uploadError}
                                    </Typography.Text>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="nodrag nopan nowheel mt-2 inline-flex items-center rounded border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200"
                                    >
                                        重试上传
                                    </button>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    </PreviewSection>
                    {data.errorMessage ? (
                        <Typography.Text className="block rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {data.errorMessage}
                        </Typography.Text>
                    ) : null}
                </div>
                <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-slate-400!" />
                <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-fuchsia-500!" />
            </NodeShell>
        </>
    )
}

export default memo(ImageNode)
