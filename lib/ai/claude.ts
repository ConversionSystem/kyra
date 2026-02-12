import Anthropic from '@anthropic-ai/sdk';

let anthropicInstance: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return anthropicInstance;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlockParam[];
}

export type ToolDefinition = Anthropic.Tool;

/** Callback to execute a tool. Returns the text result. */
export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<string>;

export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  options?: { model?: string; maxTokens?: number }
): AsyncGenerator<string> {
  const anthropic = getAnthropic();
  
  const stream = await anthropic.messages.stream({
    model: options?.model || 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 2048,
    system: systemPrompt,
    messages: messages as Anthropic.MessageParam[],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

export async function chat(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<{ content: string; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages as Anthropic.MessageParam[],
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return {
    content,
    usage: response.usage,
  };
}

/**
 * Stream chat with tool-use support.
 *
 * Handles the tool-use loop: if Claude requests a tool call, we execute it
 * via the provided executor, feed the result back, and continue until
 * Claude produces a final text response — which is streamed to the caller.
 *
 * Yields: { type: 'text', text } for streamed text chunks,
 *         { type: 'tool_use', name, input } when a tool is invoked (for UI feedback).
 */
export async function* streamChatWithTools(
  messages: ChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[],
  executeTool: ToolExecutor,
  options?: { model?: string; maxTokens?: number },
): AsyncGenerator<{ type: 'text'; text: string } | { type: 'tool_use'; name: string; input: Record<string, unknown> }> {
  const anthropic = getAnthropic();
  const model = options?.model || 'claude-sonnet-4-20250514';
  const maxTokens = options?.maxTokens || 2048;

  // Build a mutable messages array (Anthropic format)
  const msgs: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  })) as Anthropic.MessageParam[];

  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Non-streaming call so we can inspect stop_reason
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: msgs,
      tools,
    });

    // Collect any text and tool_use blocks
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        yield { type: 'text', text: block.text };
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      return;
    }

    // Execute each tool call and build tool_result messages
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      yield { type: 'tool_use', name: toolBlock.name, input: toolBlock.input as Record<string, unknown> };

      let result: string;
      try {
        result = await executeTool(toolBlock.name, toolBlock.input as Record<string, unknown>);
      } catch (err) {
        result = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // Append assistant message (with tool_use blocks) and user tool_result message
    msgs.push({ role: 'assistant', content: response.content });
    msgs.push({ role: 'user', content: toolResults });
  }
}
