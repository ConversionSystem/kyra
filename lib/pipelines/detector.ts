/**
 * Pipeline Detection — Lightweight heuristic check before calling Claude
 * Saves API calls by filtering obvious non-pipeline messages
 */

const PIPELINE_SIGNALS = [
  // Sequential action words
  /\b(then|after that|next|finally|lastly|first|second|third)\b/i,
  // Multi-action connectors
  /\b(and then|and also|plus|also)\b/i,
  // Explicit multi-step
  /\b(step[s]?\s*\d|multi.?step|pipeline|workflow)\b/i,
  // Action chains
  /\b(research.*(?:write|create|send|draft))|(?:find.*(?:compare|analyze|summarize))\b/i,
  /\b(analyze.*(?:create|build|write|draft))\b/i,
  // List of tasks
  /(?:^|\n)\s*(?:\d+[\.\)]\s+|\-\s+).+(?:\n\s*(?:\d+[\.\)]\s+|\-\s+).+){1,}/m,
];

const ANTI_SIGNALS = [
  /^(?:hi|hello|hey|what|who|where|when|how|why|can you|do you|is|are|was|were)\b/i,
  /^.{0,50}$/,  // Very short messages rarely need pipelines
];

/**
 * Quick heuristic: does this message LOOK like it might need a pipeline?
 * Returns true if it's worth calling Claude to verify.
 */
export function mightNeedPipeline(message: string): boolean {
  // Anti-signals: definitely not a pipeline
  for (const pattern of ANTI_SIGNALS) {
    if (pattern.test(message)) return false;
  }
  
  // Need at least 2 signal matches for confidence
  let signals = 0;
  for (const pattern of PIPELINE_SIGNALS) {
    if (pattern.test(message)) signals++;
    if (signals >= 2) return true;
  }
  
  // Also check for comma-separated action list
  const commaActions = message.match(/\b(research|write|create|find|analyze|compare|draft|send|summarize|build|design|review)\b/gi);
  if (commaActions && commaActions.length >= 3) return true;
  
  return false;
}
