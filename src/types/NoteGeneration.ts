/**
 * 笔记生成（聊天补全）- 请求体类型
 * POST /v1/chat/completions
 */
export interface NoteGenerationRequest {
	model: string; // 模型名称
	messages: {
		role: 'system' | 'user' | 'assistant' | 'tool'; // 消息角色
		content: string; // 消息内容
		name?: string; // 可选：消息发送者名称
	}[]; // 消息列表
	temperature?: number; // 采样温度，范围一般为 0~2
	top_p?: number; // 核采样参数
	max_tokens?: number; // 最大生成 token 数
	n?: number; // 返回候选数量
	stream?: boolean; // 是否流式返回
	stop?: string | string[]; // 停止词
	presence_penalty?: number; // 存在惩罚
	frequency_penalty?: number; // 频率惩罚
	user?: string; // 业务侧用户标识
}

/**
 * 笔记生成（聊天补全）- 响应体类型
 * POST /v1/chat/completions
 */
export interface NoteGenerationResponse {
	id: string; // 响应唯一标识
	object: string; // 对象类型，通常为 chat.completion
	created: number; // 创建时间戳
	model: string; // 实际使用模型
	choices: {
		index: number; // 候选序号
		message: {
			role: 'assistant'; // 角色
			content: string; // 生成内容
		}; // 候选消息
		finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null; // 停止原因
	}[]; // 候选结果
	usage: {
		prompt_tokens: number; // 输入 token 数
		completion_tokens: number; // 输出 token 数
		total_tokens: number; // 总 token 数
	}; // token 用量
	system_fingerprint?: string; // 可选：系统指纹
	service_tier?: string; // 可选：服务层级
}
