/**
 * 文件用途：定义 Anthropic Messages API（/v1/messages）请求体类型，
 * 供 `src/api/ai.ts` 等模块复用，确保字段名、可选性与官方接口保持兼容。
 */

// Anthropic Messages API 请求体（精简版，仅支持基本对话和流式输出）
export type AnthropicTextBlock = {
	// 内容类型，当前仅支持 text
	type: 'text';
	// 文本内容
	text: string;
};

export type AnthropicMessage = {
	// 消息角色
	role: 'user' | 'assistant';
	// 消息内容（纯文本字符串或结构化内容块数组）
	content: string | AnthropicTextBlock[];
};

export interface AnthropicGenerationRequest {
	// 模型名称
	model: string;
	// 对话消息数组
	messages: AnthropicMessage[];
	// 最大输出 Token 数 ，先写死传递 32000
	max_tokens: number;
	// 是否启用流式输出
	stream?: boolean;
	// 系统提示词
	system?: string;
}

// Anthropic Messages API 响应体
export interface AnthropicGenerationResponse {
	// 本次请求的唯一标识符，格式为 msg_*
	id: string;
	// 对象类型，固定为 message
	type: 'message';
	// 响应角色，固定为 assistant
	role: 'assistant';
	// 生成的内容块列表
	content: AnthropicTextBlock[];
	// 实际使用的模型名称
	model: string;
	// 停止原因
	// end_turn：模型正常结束
	// max_tokens：达到 max_tokens 限制
	// stop_sequence：触发了停止序列
	stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
	// 本次请求的 token 消耗统计
	usage: {
		// 输入 token 数
		input_tokens: number;
		// 输出 token 数
		output_tokens: number;
	};
}

