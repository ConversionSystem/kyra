/**
 * Claude tool definitions and executor for Kyra skills.
 *
 * Maps skill IDs from the registry to Anthropic tool_use schemas,
 * and provides a unified executor that dispatches tool calls to
 * the appropriate implementation.
 */

import type { ToolDefinition, ToolExecutor } from '@/lib/ai/claude';
import { getSkillById, normalizeSkillId } from '@/lib/skills/registry';
import { webSearch, formatSearchResults } from '@/lib/tools/web-search';
import { simpleFetch, formatFetchedContent } from '@/lib/tools/url-fetch';
import { browseUrl } from '@/lib/tools/browser-tool';
import { analyzeImage } from '@/lib/tools/image-analysis';
import { extractTextFromFile } from '@/lib/tools/file-processor';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

/** Claude tool schemas keyed by the skill ID (kebab-case) that provides them */
const TOOL_SCHEMAS: Record<string, ToolDefinition[]> = {
  'web-search': [
    {
      name: 'web_search',
      description:
        'Search the web for current information, news, prices, scores, weather, or any factual question that benefits from up-to-date data. Returns a list of search results with titles, descriptions, and URLs.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          count: {
            type: 'number',
            description: 'Number of results to return (default 5, max 10)',
          },
        },
        required: ['query'],
      },
    },
  ],
  'web-scraper': [
    {
      name: 'web_fetch',
      description:
        'Fetch and extract readable content from a URL. Returns the page title and main text content. Use this when the user shares a link or you need to read a specific webpage.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch',
          },
          max_chars: {
            type: 'number',
            description: 'Maximum characters to return (default 8000)',
          },
        },
        required: ['url'],
      },
    },
  ],
  'web-browser': [
    {
      name: 'browse_url',
      description:
        'Navigate to a URL and extract its content. Can read the page, take a screenshot (when available), or extract specific elements via CSS selector.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description: 'The URL to navigate to',
          },
          action: {
            type: 'string',
            enum: ['read', 'screenshot', 'extract'],
            description: 'Action to perform (default: read)',
          },
          selector: {
            type: 'string',
            description: 'CSS selector to extract specific content (used with action=extract)',
          },
        },
        required: ['url'],
      },
    },
  ],
  'image-analysis': [
    {
      name: 'analyze_image',
      description:
        'Analyze an image from a URL. Returns a detailed description or answers a question about the image. Use this when the user sends a photo or asks about an image.',
      input_schema: {
        type: 'object' as const,
        properties: {
          image_url: {
            type: 'string',
            description: 'The URL of the image to analyze',
          },
          prompt: {
            type: 'string',
            description: 'What to analyze or ask about the image (default: describe in detail)',
          },
        },
        required: ['image_url'],
      },
    },
  ],
  'pdf-analysis': [
    {
      name: 'read_file',
      description:
        'Read the contents of a file the user has uploaded. Returns the text content of the file. Use this when the user asks about an uploaded file or attaches a file to their message.',
      input_schema: {
        type: 'object' as const,
        properties: {
          fileId: {
            type: 'string',
            description: 'The UUID of the uploaded file to read',
          },
        },
        required: ['fileId'],
      },
    },
  ],
};

/**
 * Map from openclawTools tool name → our TOOL_SCHEMAS key (kebab-case skill ID).
 */
const OPENCLAW_TOOL_TO_SCHEMA: Record<string, string> = {
  web_search: 'web-search',
  web_fetch: 'web-scraper',
  browser: 'web-browser',
  image: 'image-analysis',
  pdf: 'pdf-analysis',
};

/**
 * Get Claude tool definitions for a set of enabled skill IDs.
 */
export function getToolDefinitions(enabledSkillIds: string[]): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  const seen = new Set<string>();

  for (const rawSkillId of enabledSkillIds) {
    const skillId = normalizeSkillId(rawSkillId);
    const directSchemas = TOOL_SCHEMAS[skillId];
    if (directSchemas) {
      for (const schema of directSchemas) {
        if (!seen.has(schema.name)) {
          seen.add(schema.name);
          tools.push(schema);
        }
      }
    }

    const skill = getSkillById(skillId);
    if (skill) {
      for (const toolName of skill.openclawTools) {
        const schemaKey = OPENCLAW_TOOL_TO_SCHEMA[toolName];
        if (schemaKey && !seen.has(toolName)) {
          const schemas = TOOL_SCHEMAS[schemaKey];
          if (schemas) {
            for (const schema of schemas) {
              if (!seen.has(schema.name)) {
                seen.add(schema.name);
                tools.push(schema);
              }
            }
          }
        }
      }
    }
  }

  return tools;
}

/**
 * Execute a tool call by name.
 */
export const executeToolCall: ToolExecutor = async (name, input) => {
  switch (name) {
    case 'web_search': {
      const query = input.query as string;
      const count = (input.count as number) || 5;
      const results = await webSearch(query, { count: Math.min(count, 10) });
      return formatSearchResults(results);
    }

    case 'web_fetch': {
      const url = input.url as string;
      const maxChars = (input.max_chars as number) || 8000;
      const content = await simpleFetch(url, maxChars);
      return formatFetchedContent(content);
    }

    case 'browse_url': {
      const result = await browseUrl(input.url as string, {
        action: (input.action as 'read' | 'screenshot' | 'extract') || 'read',
        selector: input.selector as string | undefined,
        maxChars: 8000,
      });
      if (result.error) return `Failed to browse ${result.url}: ${result.error}`;
      let out = `**${result.title || result.url}**\n\n${result.content}\n\nSource: ${result.url}`;
      if (result.screenshot) out += '\n\n[Screenshot captured]';
      return out;
    }

    case 'analyze_image': {
      const imageUrl = input.image_url as string;
      const prompt = input.prompt as string | undefined;
      return await analyzeImage(imageUrl, prompt);
    }

    case 'read_file': {
      const fileId = input.fileId as string;
      const supabase = createServiceClientWithoutCookies();

      // Look up file in DB
      const { data: file, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !file) {
        return `Error: File not found (id: ${fileId})`;
      }

      // Get signed URL from storage
      const { data: urlData, error: urlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(file.storage_path, 60);

      if (urlError || !urlData?.signedUrl) {
        return `Error: Could not access file in storage`;
      }

      return await extractTextFromFile(urlData.signedUrl, file.mime_type || 'text/plain');
    }

    default:
      return `Unknown tool: ${name}`;
  }
};
