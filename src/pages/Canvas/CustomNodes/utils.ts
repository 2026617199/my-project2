// Canvas 媒体节点共享工具：统一图片文件校验逻辑，避免 Image/Video 节点重复实现。
export const MEDIA_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const MEDIA_IMAGE_MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // 校验 MIME 类型，确保只允许指定图片格式。
    if (!MEDIA_IMAGE_ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: '仅支持 JPEG、PNG、WebP、GIF 格式的图片' }
    }

    // 校验文件大小，防止超大文件导致上传失败或卡顿。
    if (file.size > MEDIA_IMAGE_MAX_SIZE) {
        return { valid: false, error: '图片大小不能超过 10MB' }
    }

    return { valid: true }
}
