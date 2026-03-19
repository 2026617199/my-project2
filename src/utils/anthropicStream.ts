export type AnthropicStreamResult = {
  id?: string
  model?: string
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  text: string
}

type ConsumeAnthropicStreamOptions = {
  onText: (chunk: string) => void
}

function extractTextFromSSEPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const record = payload as Record<string, unknown>

  const delta = record.delta as Record<string, unknown> | undefined
  if (delta && typeof delta.text === 'string') {
    return delta.text
  }

  const contentBlock = record.content_block as Record<string, unknown> | undefined
  if (contentBlock && typeof contentBlock.text === 'string') {
    return contentBlock.text
  }

  if (typeof record.text === 'string') {
    return record.text
  }

  const choices = record.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>
    const choiceDelta = first.delta as Record<string, unknown> | undefined
    if (choiceDelta && typeof choiceDelta.content === 'string') {
      return choiceDelta.content
    }
  }

  return ''
}

function mergeStreamMeta(previous: AnthropicStreamResult, payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return previous
  }

  const record = payload as Record<string, unknown>
  const next: AnthropicStreamResult = { ...previous }

  if (typeof record.id === 'string') {
    next.id = record.id
  }

  if (typeof record.model === 'string') {
    next.model = record.model
  }

  if (
    record.stop_reason === 'end_turn' ||
    record.stop_reason === 'max_tokens' ||
    record.stop_reason === 'stop_sequence'
  ) {
    next.stop_reason = record.stop_reason
  }

  const usage = record.usage as Record<string, unknown> | undefined
  if (usage && typeof usage.input_tokens === 'number' && typeof usage.output_tokens === 'number') {
    next.usage = {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    }
  }

  const message = record.message as Record<string, unknown> | undefined
  if (message) {
    if (typeof message.id === 'string') {
      next.id = message.id
    }
    if (typeof message.model === 'string') {
      next.model = message.model
    }
  }

  return next
}

export async function consumeAnthropicSSE(response: Response, options: ConsumeAnthropicStreamOptions) {
  if (!response.body) {
    throw new Error('浏览器不支持 SSE 流式读取')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done = false
  let result: AnthropicStreamResult = { text: '' }

  while (!done) {
    const { value, done: streamDone } = await reader.read()
    done = streamDone
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !streamDone })

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex).trim()
      buffer = buffer.slice(separatorIndex + 2)

      if (rawEvent) {
        const eventLines = rawEvent.split('\n')
        const dataLines = eventLines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())

        const rawData = dataLines.join('\n')
        if (rawData && rawData !== '[DONE]') {
          try {
            const payload = JSON.parse(rawData) as unknown
            result = mergeStreamMeta(result, payload)

            const textChunk = extractTextFromSSEPayload(payload)
            if (textChunk) {
              result.text += textChunk
              options.onText(textChunk)
            }
          } catch {
            // 忽略非 JSON 的 data 事件，避免中断流式渲染
          }
        }
      }

      separatorIndex = buffer.indexOf('\n\n')
    }
  }

  return result
}
