import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Input, Typography, message } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'

import { NodeShell, PreviewSection } from './shared'

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
import { useCanvasStore } from '@/store/canvas'
import type { ImageCanvasNode, ImageNodeData } from '@/types/canvas'
import type { UploadImageResponse } from '@/types/UploadGeneration'

function ImageNode({ id, data, selected }: NodeProps<ImageCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)
    const zoom = useCanvasStore((state) => state.viewport.zoom)
    const [isImageLoading, setIsImageLoading] = useState(false)
    const [hasImageLoadError, setHasImageLoadError] = useState(false)
    const [isUploadLoading, setIsUploadLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | undefined>(undefined)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const modelOptions = useMemo(
        () => IMAGE_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const handlePatch = useCallback(
        (patch: Partial<ImageNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    // 验证文件格式和大小
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: '仅支持 JPEG、PNG、WebP、GIF 格式的图片' }
        }

        if (file.size > maxSize) {
            return { valid: false, error: '图片大小不能超过 10MB' }
        }

        return { valid: true }
    }

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

    // 处理文件选择
    const handleImageUpload = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files
            if (!files || files.length === 0) return

            const file = files[0]
            const validation = validateFile(file)

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

    // 删除指定索引的图片
    const handleDeleteImage = useCallback(
        (index: number) => {
            const newOutputImages = data.outputImages.filter((_, i) => i !== index)
            updateNodeData(id, { outputImages: newOutputImages })
        },
        [id, data.outputImages, updateNodeData],
    )

    const previewImageUrl = data.outputImages[0]?.url

    useEffect(() => {
        if (!previewImageUrl) {
            setIsImageLoading(false)
            setHasImageLoadError(false)
            return
        }

        setIsImageLoading(true)
        setHasImageLoadError(false)
    }, [previewImageUrl])

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20 * zoom}>
                <div
                    className="w-150 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-lg"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                    <Typography.Text strong className="mb-3 block text-slate-900">
                        图片节点工具栏
                    </Typography.Text>
                    <div className="space-y-3">
                        <Input.TextArea
                            value={data.prompt}
                            onChange={(event) => handlePatch({ prompt: event.target.value })}
                            placeholder="补充这个图片节点自己的提示词"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
                        <div className="grid grid-cols-3 gap-3 nodrag nopan nowheel">
                            <CloudSelect className="nodrag nopan nowheel" value={data.model} options={modelOptions} onChange={(value) => handlePatch({ model: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.size} options={IMAGE_SIZES} onChange={(value) => handlePatch({ size: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.resolution} options={IMAGE_RESOLUTIONS} onChange={(value) => handlePatch({ resolution: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.orientation} options={IMAGE_ORIENTATIONS} onChange={(value) => handlePatch({ orientation: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.count} options={IMAGE_COUNTS} onChange={(value) => handlePatch({ count: Number(value) })} />
                        </div>
                        <PreviewSection title="最终提示词预览">
                            <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-xs text-slate-600">
                                {data.finalPrompt || '等待输入提示词或连接文本节点'}
                            </Typography.Paragraph>
                        </PreviewSection>
                        <div className="flex justify-end">
                            <CloudButton loading={data.status === 'queued' || data.status === 'running'} onClick={() => void runNode(id)}>
                                生成图片
                            </CloudButton>
                        </div>
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
                                        <img
                                            src={previewImageUrl}
                                            alt="生成结果"
                                            className={`h-full w-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                            onLoad={() => setIsImageLoading(false)}
                                            onError={() => {
                                                setIsImageLoading(false)
                                                setHasImageLoadError(true)
                                            }}
                                        />
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
