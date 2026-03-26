/**
 * 笔记生成（聊天补全）- 请求体类型
 * POST /v1/chat/completions
 */
export type NoteGenerationRequest = {
	model: string // 模型名称
	messages: {
		role: 'system' | 'user' | 'assistant' | 'tool' // 消息角色
		content: string // 消息内容
		name?: string // 可选：消息发送者名称
	}[] // 消息列表
	temperature?: number // 采样温度，范围一般为 0~2
	top_p?: number // 核采样参数
	max_tokens?: number // 最大生成 token 数
	n?: number // 返回候选数量
	stream?: boolean // 是否流式返回
	stop?: string | string[] // 停止词
	presence_penalty?: number // 存在惩罚
	frequency_penalty?: number // 频率惩罚
	user?: string // 业务侧用户标识
}

export type NoteGenerationMessage = NoteGenerationRequest['messages'][number]

/**
 * 笔记生成（聊天补全）- 响应体类型
 * POST /v1/chat/completions
 */
export type NoteGenerationResponse = {
	id: string // 响应唯一标识
	object: string // 对象类型，通常为 chat.completion
	created: number // 创建时间戳
	model: string // 实际使用模型
	choices: {
		index: number // 候选序号
		message: {
			role: 'assistant' // 角色
			content: string // 生成内容
		} // 候选消息
		finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null // 停止原因
	}[] // 候选结果
	usage: {
		prompt_tokens: number // 输入 token 数
		completion_tokens: number // 输出 token 数
		total_tokens: number // 总 token 数
	} // token 用量
	system_fingerprint?: string // 可选：系统指纹
	service_tier?: string // 可选：服务层级
}

/**
 * 画布聊天的人设标识。
 * 说明：支持不选择人设（none）或选择 3 个 system 人设中的一个。
 */
export type ChatPersonaId = 'none' | 'system-creative-writer' | 'system-product-mentor' | 'system-ops-assistant'

/**
 * 画布聊天的 3 个 system 人设占位配置。
 * 说明：后续可直接替换 content，不影响业务调用逻辑。
 */
export const NOTE_CHAT_SYSTEM_PERSONAS: {
	id: Exclude<ChatPersonaId, 'none'>
	label: string
	role: 'system'
	content: string
}[] = [
	{
		id: 'system-creative-writer',
		label: '小说转剧本',
		role: 'system',
		content: '【占位】你是一名创意文案助手，请根据用户目标提供结构化建议。',
	},
	{
		id: 'system-product-mentor',
		label: '即梦系统提示词',
		role: 'system',
		content: '【占位】你是一名产品分析助手，请优先从问题拆解与方案评估角度回答。',
	},
	{
		id: 'system-ops-assistant',
		label: '拉片',
		role: 'system',
		content: '【占位】你是一名运营增长助手，请给出可执行、可量化的增长策略建议。',
	},
]
