import aiService from '@/utils/aiRequest'
import type { AnthropicGenerationRequest, AnthropicGenerationResponse } from '@/types/AnthropicGeneration'

const AI_TOKEN = import.meta.env.VITE_AI_TOKEN

// ===================== 账户余额相关 =====================

// 查询令牌余额
export function getBalance() {
  return aiService({
    url: '/v1/balance',
    method: 'get'
  })
}

// ===================== 图片生成相关 =====================

// 创建图片生成任务
export function createImageGeneration(data) {
  return aiService({
    url: '/v1/images/generations',
    method: 'post',
    data
  })
}

// 获取图片生成任务状态
export function getImageTaskStatus(id: string) {
  return aiService({
    url: `/v1/images/generations/${id}`,
    method: 'get'
  })
}

// ===================== 视频生成相关 =====================

// 创建视频生成任务
export function createVideoGeneration(data: any) {
  return aiService({
    url: '/v1/videos/generations',
    method: 'post',
    data
  })
}

// 获取视频生成任务状态
export function getVideoTaskStatus(id: string) {
  return aiService({
    url: `/v1/videos/generations/${id}`,
    method: 'get'
  })
}

// ===================== 聊天相关 =====================

// 兼容 OpenAI 格式的文字对话接口，支持全部文字模型
export function createChatCompletion(data: any) {
  return aiService({
    url: '/v1/chat/completions',
    method: 'post',
    data
  })
}

// 兼容 Anthropic 格式的文字对话接口
export function createMessages(data) {
  return aiService({
    url: '/v1/messages',
    method: 'post',
    data
  }) 
}

// Anthropic SSE 流式接口（用于打字机效果）
export async function createMessagesStream(data: AnthropicGenerationRequest) {
  const response = await fetch('https://toapis.com/v1/messages', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_TOKEN}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `SSE 请求失败：${response.status}`)
  }

  if (!response.body) {
    throw new Error('浏览器不支持 SSE 流式读取')
  }

  return response
}

// ===================== 文件上传相关 =====================

// 上传图片
export function uploadImage(data: any) {
  return aiService({
    url: '/v1/uploads/images',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}




