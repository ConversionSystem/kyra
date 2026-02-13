/**
 * Image analysis using Claude Vision.
 *
 * Sends an image URL to Claude with an optional prompt and returns
 * the model's description / analysis.
 */

import { getAnthropic } from '@/lib/ai/claude';

export async function analyzeImage(
  imageUrl: string,
  prompt?: string,
): Promise<string> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt || 'Describe this image in detail.' },
        ],
      },
    ],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
