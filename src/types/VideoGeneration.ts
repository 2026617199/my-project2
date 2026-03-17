/**
 * 创建视频生成任务 - 请求体类型
 * POST /v1/videos/generations
 */
export interface VideoGenerationRequest {
  model: string; // 模型
  prompt: string; // 提示词
  duration?: number; // 时长,只支持4-12秒，单位为秒
  aspect_ratio?: string; // 宽高比,可选项，“16:9”，“9:16”，“1:1”，“4:3”，“3:4”,"21:9"
  image_urls?: string[]; // 参考图像URL列表
  // 注意：image_urls 和 image_with_roles 不能同时使用
  // image_with_roles?: { url: string; role: 'first_frame' | 'last_frame' | 'reference_image' }[]; // 带角色的参考图像列表，角色可以是背景、角色或物体
  // 直接内联定义嵌套对象
  metadata?: {
    resolution?: string; // 输出分辨率，480p和720p(默认)
    seed?: number; // 随机种子，整数，范围为-1到4294967295 (前端不用管)
    audio?: boolean; // 是否生成音频
    camerafixed?: boolean; // 是否固定镜头
    // n?:number; // 生成视频的数量
    // watermark?: boolean; // 是否添加水印
    // hd?: boolean; // 是否生成高清版本
    // resolution?: string; // 输出分辨率偏好，如 1K/2K/4K
    // private?: boolean; // 是否私密
    // // 支持的值有thanksgiving,comic,news,selfie,nostalgic,nostalgic
    // style?: string; // 风格,
    // storyboard?: boolean; // 是否使用故事板功能，更精细地控制视频生成细节
    // character_url?: string; // 用于角色提取的参考视频 URL
    // character_timestamps?: string; // 角色提取的时间戳，格式为 "start-end"，单位为秒，例如 "0-10" 表示提取视频的前10秒作为角色参考
    // character_created?: boolean; // 创建视频完成后，自动根据生成的视频创建角色
    // character_from_task?: string; // 根据已经生成的任务 ID 来创建角色
  };

}

/**
 * 创建视频生成任务 - 响应体类型
 * POST /v1/videos/generations
 */
export interface VideoGenerationResponse {
  id: string; // 任务唯一标识符，用于查询任务状态
  object: string; // 任务唯一标识符，用于查询任务状态
  model: string; // 模型
  status: 'queued' | 'in_progress' | 'completed' | 'failed'; // 任务状态
  progress?: number; // 任务进度，范围为0-100，表示任务完成的百分比
  created_at: number; // 创建时间戳
  metadata: {
    size?:string; // 视频尺寸，例如 "1920x1080", "720x720"
  };
}

/**
 * 获取视频生成任务状态 - 响应体类型
 * GET /v1/videos/generations/{id}
 */
export interface VideoTaskStatusResponse {
  id: string; // 任务唯一标识符
  object: string; // 对象类型，固定为 generation.task
  model: string; // 使用的视频生成模型
  status: 'queued' | 'in_progress' | 'completed' | 'failed'; // 任务状态
  progress: number; // 任务进度百分比（0-100）
  created_at: number; // 任务创建时间（Unix 时间戳）
  completed_at?: number; // 任务完成时间（Unix 时间戳，仅完成时返回）
  expires_at?: number; // 视频 URL 过期时间（Unix 时间戳，仅完成时返回）
  result?: {
    // 任务结果（仅成功时返回）
    type: string; // 结果类型，固定为 video
    data: {
      // 视频数据数组
      url: string; // 生成的视频 URL
      format: string; // 视频格式（如 mp4）
    }[];
  };
  error?: {
    // 错误信息（仅失败时返回）
    code: string; // 错误代码
    message: string; // 错误描述
  };
}

