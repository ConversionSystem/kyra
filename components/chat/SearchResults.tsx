'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink, Globe } from 'lucide-react';

interface SearchSource {
  title: string;
  url: string;
  description?: string;
}

export interface SearchResultsProps {
  query: string;
  sources: SearchSource[];
}

/**
 * Parse search context from a message containing [SEARCH_SOURCES] blocks.
 */
export function parseSearchContext(content: string): { query: string; sources: SearchSource[] } | null {
  const match = content.match(/\[SEARCH_SOURCES\]([\s\S]*?)\[\/SEARCH_SOURCES\]/);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1].trim());
    if (data.query && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

/**
 * Strip search source blocks from message content.
 */
export function stripSearchContext(content: string): string {
  return content.replace(/\[SEARCH_SOURCES\][\s\S]*?\[\/SEARCH_SOURCES\]\n?/g, '').trim();
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
  } catch {
    return '';
  }
}

export function SearchResults({ query, sources }: SearchResultsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Search className="h-3 w-3 text-indigo-600" />
        <span className="font-medium text-gray-700">Searched the web</span>
        <span className="text-gray-400">· {sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-1.5">
          <p className="text-xs text-gray-400 mb-2">
            Search: &quot;{query}&quot;
          </p>
          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100 transition-colors group"
            >
              {getFaviconUrl(source.url) ? (
                <img
                  src={getFaviconUrl(source.url)}
                  alt=""
                  className="h-4 w-4 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Globe className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-gray-700 group-hover:text-indigo-600 truncate flex-1">
                {source.title}
              </span>
              <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-gray-500 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
