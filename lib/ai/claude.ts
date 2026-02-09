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
  content: string;
}

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
    messages: messages,
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
    messages: messages,
  });

  const content = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';

  return {
    content,
    usage: response.usage,
  };
}
