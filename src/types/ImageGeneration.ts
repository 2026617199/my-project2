
/**
 * 图片生成 - 请求体类型(针对Doubeao Seedream 4.0模型)
 */
export interface ImageGenerationRequest {
  model: string; // 模型名称，如 "gemini-3-pro-image-preview"
  prompt: string; // 提示词
  size?: string; // 图片尺寸比例，支持的宽高比：1:1(正方形，默认)、4:3(横向)、3:4(竖向)、16:9(横向宽屏)、9:16(竖向长图)、3:2(横向)、2:3(竖向)、21:9(超宽屏)、9:21(超窄屏)、auto(自动匹配参考图像比例，需要提供 image_urls)
  n?: number; // 生成图片数量(目前只支持1张)
  image_urls?: string[]; // 参考图片 URL 列表
  // 直接内联定义嵌套对象
  metadata?: {
    resolution?: string; // 分辨率，如 "1K", "2K", "4K"
    orientation?: string; // 方向，如 "landscape"(横向), "portrait"(纵向)
    optimize_prompt_options?: {
      mode?: string; // 有standard：标准模式（默认）和fast：快速模式两种
    };
    // sequential_image_generation?: string; // 是否启用顺序生成模式，默认为 false
    // sequential_image_generation_options?: any; // 顺序生成模式的可选参数，具体参数结构根据模型而定
    watermark?: boolean; // 是否添加水印，默认为 false
  };
}

/**
 * 图片生成 - 响应体类型
 */
export interface ImageGenerationResponse {
  id: string; // 任务 ID
  object: string; // 对象类型
  model: string; // 模型名称
  status: 'in_progress' | 'completed' | 'failed'; // 任务状态
  progress: number; // 进度百分比 (0-100)
  created_at: number; // 创建时间戳
  completed_at?: number; // 完成时间戳
  expires_at?: number; // 过期时间戳
  // 直接内联定义嵌套对象
  result?: {
    type: string; // 结果类型
    data: {
      url: string; // 图片 URL
    }[]; // 图片数据列表
  }; // 生成结果
  // 直接内联定义嵌套对象
  error?: {
    code: string; // 错误代码
    message: string; // 错误消息
  }; // 错误信息
}

// 参数 Schema 化
// const schema = MODEL_SCHEMAS[currentModel]
// 可以实现换模型，UI自动变化
export const IMAGE_MODEL_SCHEMAS: Record<string, any> = {
  // "veo3": {
  //   id: "veo3",
  //   params: {
  //     resolution: ["720p", "1080p"],
  //     duration: [5, 10],
  //     prompt: true
  //   }
  // },

  // "sora": {
  //   id: "sora",
  //   params: {
  //     resolution: ["480p"],
  //     duration: [3, 5, 8],
  //     seed: true,
  //     prompt: true
  //   }
  // },

  "doubao-seedream-4-0": {
    id: "doubao-seedream-4-0",
    name: "豆包   Seedream 4.0",
    params: {
      resolution: ["1K", "2K", "4K"],
      size: ["16:9", "4:3", "1:1", "9:16", "3:4"],
      n: [1, 2, 4],
      seed: true,
      prompt: true,
      image_urls: {
        type: "array",
        itemType: "string",
        description: "参考图片 URL 列表"
      }
    }
  }
}






















