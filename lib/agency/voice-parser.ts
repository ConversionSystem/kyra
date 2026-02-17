// ============================================================================
// Voice Command Parser — Pattern-based (no AI)
//
// Parses voice transcripts into structured commands using regex patterns
// and fuzzy client name matching. Fast, cheap, deterministic.
// ============================================================================

export interface VoiceCommand {
  clientName: string | null;
  action:
    | 'update_greeting'
    | 'update_instructions'
    | 'toggle_permission'
    | 'update_persona'
    | 'send_message'
    | 'get_status'
    | 'unknown';
  params: Record<string, string>;
  confidence: number; // 0-1
  rawTranscript: string;
}

// ── Action patterns ─────────────────────────────────────────────────────────

interface ActionPattern {
  action: VoiceCommand['action'];
  patterns: RegExp[];
  extractParams: (match: RegExpMatchArray, transcript: string) => Record<string, string>;
}

const ACTION_PATTERNS: ActionPattern[] = [
  // ── update_greeting ───────────────────────────────────────────────────
  {
    action: 'update_greeting',
    patterns: [
      /(?:update|change|set|modify|edit)\s+(?:the\s+)?(?:greeting|welcome\s+message)\s+(?:for\s+)?(?:.+?)?\s*(?:to|with|as)\s+["""]?(.+?)["""]?\s*$/i,
      /(?:update|change|set|modify|edit)\s+(.+?)(?:'s|s')\s+(?:greeting|welcome\s+message)\s+(?:to|with|as)\s+["""]?(.+?)["""]?\s*$/i,
      /(?:greeting|welcome\s+message)\s+(?:for\s+)?(?:.+?)?\s+(?:should\s+(?:be|say)|(?:to|with|as))\s+["""]?(.+?)["""]?\s*$/i,
      /(?:make|have)\s+(?:the\s+)?(?:greeting|welcome\s+message)\s+(?:for\s+)?(?:.+?)?\s+(?:say|be)\s+["""]?(.+?)["""]?\s*$/i,
    ],
    extractParams: (_match, transcript) => {
      // Extract the content after "to"/"with"/"as"/"say"/"be"
      const contentMatch = transcript.match(
        /(?:to|with|as|say|be)\s+["""]?(.+?)["""]?\s*$/i
      );
      return { content: contentMatch?.[1]?.trim() || '' };
    },
  },

  // ── update_instructions ───────────────────────────────────────────────
  {
    action: 'update_instructions',
    patterns: [
      /(?:update|change|set|modify|edit)\s+(?:the\s+)?(?:instructions?|system\s+prompt|prompt|behavior)\s+(?:for\s+)?/i,
      /(?:update|change|set|modify|edit)\s+(.+?)(?:'s|s')\s+(?:instructions?|system\s+prompt|prompt|behavior)\s+/i,
      /(?:tell|instruct)\s+(.+?)\s+(?:to|that)\s+/i,
      /(?:make|have)\s+(.+?)\s+(?:start|stop|begin|always|never)\s+/i,
    ],
    extractParams: (_match, transcript) => {
      const contentMatch = transcript.match(
        /(?:to|that|with|as)\s+["""]?(.+?)["""]?\s*$/i
      );
      if (contentMatch) return { content: contentMatch[1].trim() };
      // For "tell X to Y" — extract everything after "to"
      const tellMatch = transcript.match(/(?:tell|instruct)\s+.+?\s+(?:to|that)\s+(.+)/i);
      if (tellMatch) return { content: tellMatch[1].trim() };
      // For "make X start/stop doing Y"
      const makeMatch = transcript.match(
        /(?:make|have)\s+.+?\s+((?:start|stop|begin|always|never).+)/i
      );
      if (makeMatch) return { content: makeMatch[1].trim() };
      return { content: '' };
    },
  },

  // ── toggle_permission ─────────────────────────────────────────────────
  {
    action: 'toggle_permission',
    patterns: [
      /(?:turn|switch|toggle|enable|disable)\s+(on|off)\s+(.+?)\s+(?:for|on)\s+/i,
      /(?:turn|switch|toggle|enable|disable)\s+(.+?)\s+(on|off)\s+(?:for|on)\s+/i,
      /(?:enable|disable|activate|deactivate)\s+(.+?)\s+(?:for|on)\s+/i,
      /(?:give|remove|revoke|grant)\s+(.+?)\s+(?:access|permission)\s+(?:to|for|from)\s+/i,
    ],
    extractParams: (_match, transcript) => {
      // Figure out the permission name and on/off state
      const onOff = /\b(on|off|enable|disable|activate|deactivate|give|grant|remove|revoke)\b/i;
      const onOffMatch = transcript.match(onOff);
      const enabled =
        onOffMatch &&
        ['on', 'enable', 'activate', 'give', 'grant'].includes(
          onOffMatch[1].toLowerCase()
        )
          ? 'true'
          : 'false';

      // Extract the permission name — between "turn on/off" and "for"
      const permMatch = transcript.match(
        /(?:turn\s+(?:on|off)|enable|disable|activate|deactivate|give|remove|revoke|grant)\s+(.+?)\s+(?:for|on|from|to)/i
      );
      return {
        permission: permMatch?.[1]?.trim() || '',
        enabled,
      };
    },
  },

  // ── update_persona ────────────────────────────────────────────────────
  {
    action: 'update_persona',
    patterns: [
      /(?:update|change|set|modify|edit)\s+(?:the\s+)?(?:persona|personality|tone|voice|style)\s+(?:for\s+)?/i,
      /(?:make)\s+(.+?)\s+(?:sound|be|act)\s+(?:more|less)?\s*(?:like|as)?\s*/i,
      /(?:update|change|set|modify|edit)\s+(.+?)(?:'s|s')\s+(?:persona|personality|tone|voice|style)\s+/i,
    ],
    extractParams: (_match, transcript) => {
      const contentMatch = transcript.match(
        /(?:to|with|as|like)\s+["""]?(.+?)["""]?\s*$/i
      );
      if (contentMatch) return { content: contentMatch[1].trim() };
      const soundMatch = transcript.match(
        /(?:sound|be|act)\s+(?:more|less)?\s*(.+)/i
      );
      if (soundMatch) return { content: soundMatch[1].trim() };
      return { content: '' };
    },
  },

  // ── send_message ──────────────────────────────────────────────────────
  {
    action: 'send_message',
    patterns: [
      /(?:send|broadcast)\s+(?:a\s+)?(?:message|notification|text|email)\s+(?:to\s+)?(.+?)(?:'s|s')?\s+(?:contacts?|customers?|clients?|leads?|people)/i,
      /(?:send|broadcast)\s+(.+?)(?:'s|s')?\s+(?:contacts?|customers?|clients?|leads?|people)\s+(?:a\s+)?(?:message|notification|text|email)/i,
      /(?:message|notify|text|email)\s+(?:all\s+)?(.+?)(?:'s|s')?\s+(?:contacts?|customers?|clients?|leads?|people)/i,
    ],
    extractParams: (_match, transcript) => {
      // Extract the message content — usually after "saying" or "that says" or at the end
      const sayingMatch = transcript.match(
        /(?:saying|that\s+says?|with|about)\s+["""]?(.+?)["""]?\s*$/i
      );
      return { message: sayingMatch?.[1]?.trim() || '' };
    },
  },

  // ── get_status ────────────────────────────────────────────────────────
  {
    action: 'get_status',
    patterns: [
      /(?:how\s+is|how's)\s+(.+?)\s+(?:doing|going|performing|looking)/i,
      /(?:status|stats?|report|overview|summary)\s+(?:of|for)\s+/i,
      /(?:what's|what\s+is)\s+(?:the\s+)?(?:status|state|situation)\s+(?:of|for|with)\s+/i,
      /(?:check\s+(?:on|in\s+on)|get\s+(?:me\s+)?(?:the\s+)?(?:status|stats?|report))\s+(?:of|for|on)\s+/i,
      /(?:give\s+me|show\s+me|pull\s+up)\s+(?:the\s+)?(?:status|stats?|report|numbers|metrics)\s+(?:for|of|on)\s+/i,
    ],
    extractParams: () => ({}),
  },
];

// ── Fuzzy client name matching ──────────────────────────────────────────────

/**
 * Normalize a string for comparison: lowercase, strip articles/filler words,
 * remove possessives, collapse whitespace.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, '')       // strip apostrophes
    .replace(/\bs\b/g, '')       // strip trailing possessive "s"
    .replace(/\b(the|a|an|my|our|that|this)\b/g, '') // strip articles
    .replace(/\b(client|assistant|bot|ai|agent)\b/g, '') // strip generic nouns
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Score how well a transcript segment matches a client name.
 * Returns 0-1 (1 = perfect match).
 */
function clientMatchScore(segment: string, clientName: string): number {
  const normSeg = normalize(segment);
  const normClient = normalize(clientName);

  if (!normSeg || !normClient) return 0;

  // Exact match after normalization
  if (normSeg === normClient) return 1.0;

  // One contains the other
  if (normSeg.includes(normClient) || normClient.includes(normSeg)) {
    const longer = Math.max(normSeg.length, normClient.length);
    const shorter = Math.min(normSeg.length, normClient.length);
    return 0.7 + 0.3 * (shorter / longer);
  }

  // Check if all words from one appear in the other
  const segWords = normSeg.split(' ').filter(Boolean);
  const clientWords = normClient.split(' ').filter(Boolean);
  const segInClient = segWords.filter((w) =>
    clientWords.some((cw) => cw.includes(w) || w.includes(cw))
  );
  if (segInClient.length === segWords.length && segWords.length > 0) {
    return 0.7 + 0.2 * (segWords.length / clientWords.length);
  }

  // Levenshtein similarity
  const dist = levenshtein(normSeg, normClient);
  const maxLen = Math.max(normSeg.length, normClient.length);
  const similarity = 1 - dist / maxLen;
  return similarity > 0.5 ? similarity * 0.8 : 0;
}

/**
 * Find the best matching client name from the transcript.
 */
function findClientInTranscript(
  transcript: string,
  clientNames: string[]
): { name: string; confidence: number } | null {
  if (clientNames.length === 0) return null;

  let bestMatch: { name: string; confidence: number } | null = null;

  for (const clientName of clientNames) {
    // Try matching against progressively larger windows of the transcript
    const words = transcript.split(/\s+/);
    for (let windowSize = 1; windowSize <= Math.min(5, words.length); windowSize++) {
      for (let start = 0; start <= words.length - windowSize; start++) {
        const segment = words.slice(start, start + windowSize).join(' ');
        const score = clientMatchScore(segment, clientName);
        if (score > (bestMatch?.confidence ?? 0.4)) {
          bestMatch = { name: clientName, confidence: score };
        }
      }
    }
  }

  return bestMatch;
}

// ── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a voice transcript into a structured command.
 *
 * @param transcript - The raw transcript text
 * @param clientNames - List of client names to match against
 * @returns Parsed voice command
 */
export function parseVoiceCommand(
  transcript: string,
  clientNames: string[]
): VoiceCommand {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      clientName: null,
      action: 'unknown',
      params: {},
      confidence: 0,
      rawTranscript: transcript,
    };
  }

  // 1. Find the client
  const clientMatch = findClientInTranscript(trimmed, clientNames);

  // 2. Match action patterns
  let matchedAction: VoiceCommand['action'] = 'unknown';
  let params: Record<string, string> = {};
  let actionConfidence = 0;

  for (const pattern of ACTION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = trimmed.match(regex);
      if (match) {
        matchedAction = pattern.action;
        params = pattern.extractParams(match, trimmed);
        actionConfidence = 0.8;

        // Boost confidence if we have meaningful params
        if (params.content || params.message || params.permission) {
          actionConfidence = 0.9;
        }
        break;
      }
    }
    if (matchedAction !== 'unknown') break;
  }

  // 3. Compute overall confidence
  const clientConfidence = clientMatch?.confidence ?? 0;
  const overallConfidence =
    matchedAction === 'unknown'
      ? clientConfidence * 0.3
      : clientMatch
        ? (actionConfidence + clientConfidence) / 2
        : actionConfidence * 0.7; // No client matched — lower confidence

  return {
    clientName: clientMatch?.name ?? null,
    action: matchedAction,
    params,
    confidence: Math.round(overallConfidence * 100) / 100,
    rawTranscript: transcript,
  };
}
