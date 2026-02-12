/**
 * Claude tool definitions and executor for Kyra skills.
 *
 * Maps skill IDs from the registry to Anthropic tool_use schemas,
 * and provides a unified executor that dispatches tool calls to
 * the appropriate implementation.
 */

import type { ToolDefinition, ToolExecutor } from '@/lib/ai/claude';
import { getSkillById } from '@/lib/skills/registry';
import { webSearch, formatSearchResults } from '@/lib/tools/web-search';
import { simpleFetch, formatFetchedContent } from '@/lib/tools/url-fetch';

/** Claude tool schemas keyed by the skill ID that provides them */
const TOOL_SCHEMAS: Record<string, ToolDefinition[]> = {
  web_search: [
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
  web_fetch: [
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
};

/**
 * Map from openclawTools tool name → our TOOL_SCHEMAS key.
 * Skills like "weather" declare openclawTools: ['web_fetch'],
 * meaning they need the web_fetch tool to work.
 */
const OPENCLAW_TOOL_TO_SCHEMA: Record<string, string> = {
  web_search: 'web_search',
  web_fetch: 'web_fetch',
};

/**
 * Get Claude tool definitions for a set of enabled skill IDs.
 * Includes tools that enabled skills need (via their openclawTools field).
 */
export function getToolDefinitions(enabledSkillIds: string[]): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  const seen = new Set<string>();

  for (const skillId of enabledSkillIds) {
    // Direct match: skill ID maps to a tool schema
    const directSchemas = TOOL_SCHEMAS[skillId];
    if (directSchemas) {
      for (const schema of directSchemas) {
        if (!seen.has(schema.name)) {
          seen.add(schema.name);
          tools.push(schema);
        }
      }
    }

    // Indirect: skill declares openclawTools it needs
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
 * Execute a tool call by name. Returns the text result to feed back to Claude.
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

    default:
      return `Unknown tool: ${name}`;
  }
};
