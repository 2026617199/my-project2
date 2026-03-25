import aiService from '@/utils/aiRequest'
import { EventSourceParserStream } from 'eventsource-parser/stream'

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
// - stream: false 或不传 → 返回完整响应
// - stream: true → 返回 async generator，逐块 yield 文本内容
export async function createChatCompletion(data: any, signal?: AbortSignal) {
  if (data.stream) {
    const response = await fetch('/ai-proxy/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(await response.text().catch(() => `请求失败：${response.status}`))
    }


    const reader = response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .getReader()

    return (async function* () {
      while (true) {
        const { done, value } = await reader.read()
        if (done || value?.data === '[DONE]') return
        const content = JSON.parse(value.data)?.choices?.[0]?.delta?.content
        if (content) yield content
      }
    })()
  }

  return aiService({
    url: '/v1/chat/completions',
    method: 'post',
    data,
  })
}

// 兼容 Anthropic 格式的文字对话接口
export function createMessages(data: any) {
  return aiService({
    url: '/v1/messages',
    method: 'post',
    data
  })
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




